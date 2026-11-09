import { describe, it, expect } from 'vitest';
import { evaluate, type Facts } from '../../src/domain/evaluate.ts';
import type { EvaluateRequestDto } from '../../src/domain/dto.ts';

const request: EvaluateRequestDto = { request_id: 'r1', request_chain_id: 'c1', actor_ref: 'mateo', workload_kind: 'INTERACTIVE_INFERENCE', subject_id: 'CS-101', model_ref: 'small-24', requested_gpu_count: 1, requested_vram_gb_per_gpu: 24, expected_duration_min: 30, exam_binding: null };
const freeze = (reason?: string) => ({ freeze_id: 'f1', scope: 'ALL', state: 'ACTIVE', starts_at: '2026-10-19T03:00:00.000Z', ends_at: '2026-10-19T05:00:00.000Z', allowances: [], ...(reason === undefined ? {} : { reason }) });
const facts = (reason?: string): Facts => ({ campus_now: '2026-10-19T03:30:00.000Z', policy_version: 1, windows: [], freeze_states: [freeze(reason)], model: { model_ref: 'small-24', min_vram_gb: 8 } });

describe('freeze deny rationale (story 2.6)', () => {
  it('names the emergency freeze and its reason in the DENY rationale', () => {
    const d = evaluate(request, facts('Final Exam CS-101'), 1);
    expect(d.outcome).toBe('DENY');
    expect(d.primary_rule_id).toBe('R-FRZ-01');
    expect(d.rationale).toContain('Emergency freeze active: Final Exam CS-101');
  });
  it('still denies with the rule id when a freeze carries no reason', () => {
    const d = evaluate(request, facts(), 1);
    expect(d.primary_rule_id).toBe('R-FRZ-01');
    expect(d.rationale).toContain('Emergency freeze active');
    expect(d.rationale).not.toContain('undefined');
  });
});
