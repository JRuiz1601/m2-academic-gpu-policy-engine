import { describe, it, expect } from 'vitest';
import { evaluate, validateRegistry, type Facts } from '../../src/domain/evaluate.ts';
import { RULES } from '../../src/domain/registry.ts';
import type { EvaluateRequestDto } from '../../src/domain/dto.ts';

const request: EvaluateRequestDto = { request_id: 'r1', request_chain_id: 'c1', actor_ref: 'mateo', workload_kind: 'INTERACTIVE_INFERENCE', subject_id: 'CS-101', model_ref: 'small-24', requested_gpu_count: 1, requested_vram_gb_per_gpu: 24, expected_duration_min: 30, exam_binding: null };
const NOW = '2026-10-19T15:00:00.000Z'; // 10:00 local, outside the night window
const base: Facts = { campus_now: NOW, policy_version: 1, windows: [], model: { model_ref: 'small-24', min_vram_gb: 8 } };

describe('evaluate: branches not reached by the acceptance tests', () => {
  it('an unknown actor is denied under R-VALID-01 with cause ACTOR_UNKNOWN', () => {
    const d = evaluate(request, { ...base, actor_unknown: true }, 1);
    expect(d.outcome).toBe('DENY');
    expect(d.primary_rule_id).toBe('R-VALID-01');
    expect(d.cause).toBe('ACTOR_UNKNOWN');
  });

  it('insufficient quota plus a class starting inside the run keeps BOTH the quota cap and the hard deadline', () => {
    const classStarts = '2026-10-19T15:20:00.000Z';
    const facts: Facts = { ...base, quota: { remaining: 10, need: 30 }, windows: [{ kind: 'CLASS', subject_id: 'CS-101', starts_at: classStarts, ends_at: '2026-10-19T17:20:00.000Z' }] };
    const d = evaluate(request, facts, 1);
    expect(d.outcome).toBe('CONSTRAIN');
    expect(d.primary_rule_id).toBe('R-BOUND-01');
    expect(d.constraints.map(c => c.kind).sort()).toEqual(['HARD_DEADLINE', 'QUOTA_CAP']);
    expect(d.authority).toBe('PROVISIONAL');
  });
});

describe('validateRegistry', () => {
  const documents = [...new Set(RULES.flatMap(r => r.citation_ids))];
  it('accepts the shipped registry when every cited document exists', () => {
    expect(() => validateRegistry(RULES, documents)).not.toThrow();
  });
  it('rejects a duplicated rule id', () => {
    expect(() => validateRegistry([...RULES, { ...RULES[0]!, precedence: 999 }], documents)).toThrow('REGISTRY_INVALID');
  });
  it('rejects a citation to a document that does not exist', () => {
    expect(() => validateRegistry(RULES, documents.slice(1))).toThrow('REGISTRY_INVALID');
  });
  it('rejects a precedence outside -1..1000', () => {
    expect(() => validateRegistry([{ ...RULES[1]!, precedence: 5000 }], documents)).toThrow('REGISTRY_INVALID');
  });
  it('rejects two rules sharing a precedence', () => {
    expect(() => validateRegistry([RULES[1]!, { ...RULES[2]!, precedence: RULES[1]!.precedence }], documents)).toThrow();
  });
});
