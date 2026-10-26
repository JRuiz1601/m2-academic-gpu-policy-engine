import { describe, it, expect } from 'vitest';
import { performance } from 'node:perf_hooks';
import { readFileSync, writeFileSync } from 'node:fs';
import { evaluate, type Facts } from '../../src/domain/evaluate.ts';
import { fixture } from '../../src/adapters/outbound/simulator.ts';
import type { EvaluateRequestDto } from '../../src/domain/dto.ts';
const request = () => fixture<EvaluateRequestDto>('request');
const facts = (): Facts => ({ campus_now: '2026-10-19T03:00:00.000Z', windows: [], policy_version: 1, role_tier: 'STUDENT', model: { model_ref: 'small-24', min_vram_gb: 8 } });
describe('Impl-1 stories (annex M2)', () => {
    it('2.1 permits student workstation with cited baseline rationale', () => {
        const d = evaluate(request(), facts(), 1);
        expect(d.outcome).toBe('ALLOW');
        expect(d.rationale).toContain('Standard student lab policy satisfied');
        expect(d.primary_rule_id).toBe('R-ALLOW-01');
        expect(d.citations).toContain('POL-TIER');
    });
    it('2.1 refuses jobs without subject entitlement', () => {
        const d = evaluate(request(), { ...facts(), subject_ids: [] }, 1);
        expect(d).toMatchObject({ outcome: 'DENY', primary_rule_id: 'R-AUTH-01' });
    });
    it('2.2 Monday 10:30 class protection supersedes entitlement and cites next availability', () => {
        const f = { ...facts(), campus_now: '2026-10-19T15:30:00.000Z', windows: [{ kind: 'CLASS', subject_id: 'CS-101', starts_at: '2026-10-19T15:00:00.000Z', ends_at: '2026-10-19T17:00:00.000Z' }] };
        const d = evaluate({ ...request(), workload_kind: 'BACKGROUND_BATCH' }, f, 1);
        expect(d).toMatchObject({ outcome: 'DENY', primary_rule_id: 'R-LAB-01' });
        expect(d.rationale).toContain('GPU access restricted during scheduled lab class CS-101');
        expect(d.rationale).toContain('2026-10-19T17:00:00.000Z');
    });
    it('2.2 exactly noon class boundary is excluded', () => {
        const d = evaluate({ ...request(), workload_kind: 'EVALUATION' }, { ...facts(), campus_now: '2026-10-19T17:00:00.000Z', windows: [{ kind: 'CLASS', starts_at: '2026-10-19T15:00:00.000Z', ends_at: '2026-10-19T17:00:00.000Z' }] }, 1);
        expect(d.outcome).toBe('ALLOW');
    });
    it('2.3 denies 48GB server for student 8GB model and suggests workstation', () => {
        const d = evaluate({ ...request(), requested_vram_gb_per_gpu: 48 }, facts(), 1);
        expect(d).toMatchObject({ outcome: 'DENY', primary_rule_id: 'R-TIER-02' });
        expect(d.rationale).toContain('Workload fits standard 24GB workstation; server tier restricted');
        expect(d.rationale).toContain('std-24');
        expect(d.explanation.observed_values).toContainEqual({ fact_path: 'model.min_vram_gb', value: 8 });
    });
    it.each(['INSTRUCTOR', 'RESEARCHER'])('2.3 permits %s server access', role => {
        expect(evaluate({ ...request(), requested_vram_gb_per_gpu: 48 }, { ...facts(), role_tier: role }, 1).outcome).toBe('ALLOW');
    });
    it('quota cap survives a simultaneous deadline', () => {
        const d = evaluate({ ...request(), expected_duration_min: 800, workload_kind: 'TRAINING' }, { ...facts(), quota: { remaining: 5, need: 10 } }, 1);
        expect(d).toMatchObject({ outcome: 'CONSTRAIN', authority: 'PROVISIONAL' });
        expect(d.constraints.map(c => c.kind)).toEqual(expect.arrayContaining(['HARD_DEADLINE', 'QUOTA_CAP']));
        expect(d.constraints.every(c => c.deadline === d.valid_until)).toBe(true);
    });
    it('pure evaluator runs below the annex 30 ms budget and is deterministic', () => {
        const r = request(), f = facts(), baseline = JSON.stringify(evaluate(r, f, 1));
        const samples: number[] = [];
        for (let i = 0; i < 1000; i++) {
            const start = performance.now();
            const d = evaluate(r, f, 1);
            samples.push(performance.now() - start);
            expect(JSON.stringify(d)).toBe(baseline);
        }
        samples.sort((a, b) => a - b);
        const p95 = samples[949];
        expect(p95).toBeLessThan(30);
        writeFileSync('test/evidence/impl1-performance.json', JSON.stringify({ samples: 1000, p95_ms: p95, max_ms: samples.at(-1), budget_ms: 30, scope: 'pure domain; local warm process; not end-to-end latency' }, null, 2) + '\n');
    });
});
