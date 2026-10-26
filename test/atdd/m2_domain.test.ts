import { test, expect, describe } from 'vitest';
import fc from 'fast-check';
import { evaluate, validateRegistry, type Facts } from '../../policy/core/index.js';
import { NotImplementedError } from '../../ports/in/policy.js';
function propertyCheck(action: () => void) {
  try {
    action();
  } catch (error) {
    if (error instanceof Error && error.cause instanceof NotImplementedError) throw error.cause;
    throw error;
  }
}
import { request, explain_assert, protectedWindow } from '../fixtures/index.js';
describe('M2 domain policy', () => {
const facts = (): Facts => ({
  campus_now: '2026-10-19T03:00:00.000Z',
  policy_version: 1,
  windows: [],
  actor_kind: 'HUMAN',
  quota: { remaining: 100000 },
  fleet: 'seed_fleet',
});
test('DM-AD1 deterministic pure evaluation', () => {
  const r = request(),
    f = facts();
  const before = JSON.stringify({ r, f });
  const a = evaluate(r, f, 1),
    b = evaluate(r, f, 1);
  expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  expect(JSON.stringify({ r, f })).toBe(before);
  explain_assert(a);
});
test('DM-AD2 duplicate precedence refused', () => {
  expect(() =>
    validateRegistry(
      [
        { rule_id: 'R-A-01', precedence: 1 },
        { rule_id: 'R-B-01', precedence: 1 },
      ],
      ['POL-LAB'],
    ),
  ).toThrow(/DUPLICATE_PRECEDENCE/);
});
test('DM-AD5 deadline constraint names delegated enforcer', () => {
  const f = facts();
  f.windows = [
    protectedWindow({ starts_at: '2026-10-19T03:20:00.000Z', ends_at: '2026-10-19T04:00:00.000Z' }),
  ];
  const d = evaluate(request(), f, 1);
  expect(d.outcome).toBe('CONSTRAIN');
  expect(d.constraints).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        kind: 'HARD_DEADLINE',
        deadline: '2026-10-19T03:15:00.000Z',
        enforced_by: 'M9',
      }),
    ]),
  );
  expect(d.must_checkpoint_by).toBe(d.valid_until);
});
test('DM-NP9 past-bound guard admits for zero time', () => {
  // Oracle: prd.md line 393 and line 514 (NP-9); ruling DL-54 (ARCHITECTURE.md section 15.12).
  const f = facts();
  f.windows = [
    protectedWindow({ starts_at: '2026-10-19T03:03:00.000Z', ends_at: '2026-10-19T04:00:00.000Z' }),
  ];
  const d = evaluate(request(), f, 1);
  expect(d).toMatchObject({ outcome: 'ALLOW', admission: 'ADMITTED' });
  expect(d.valid_until).toBe(f.campus_now);
  expect(d.valid_until).toBe(d.evaluated_at);
  expect(d.constraints).toEqual(
    expect.arrayContaining([expect.objectContaining({ kind: 'WINDOW_SCOPE' })]),
  );
});
test('DM-AD6 explanation contains observed values and registry citations', () => {
  const d = evaluate(request(), facts(), 1);
  explain_assert(d);
  expect(d.explanation.observed_values.length).toBeGreaterThan(0);
  expect(d.explanation.rule_ids).toContain(d.primary_rule_id);
});
test('DM-BOUND independent generated end boundaries', () => {
  propertyCheck(() =>
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000 }), (minutes) => {
        const f = facts();
        const end = new Date(Date.parse(f.campus_now) + minutes * 60000).toISOString();
        f.windows = [protectedWindow({ starts_at: f.campus_now, ends_at: end })];
        const evaluateAt = (delta: number) => {
          f.campus_now = new Date(Date.parse(end) + delta).toISOString();
          return evaluate({ ...request(), workload_kind: 'EVALUATION' }, f, 1);
        };
        const before = evaluateAt(-1);
        expect(before).toMatchObject({
          outcome: 'DENY',
          cause: 'WINDOW_PROTECTED',
          admission: 'REJECTED',
          primary_rule_id: 'R-LAB-01',
        });
        const equal = evaluateAt(0);
        expect(equal.cause).not.toBe('WINDOW_PROTECTED');
        expect(equal.primary_rule_id).not.toBe('R-LAB-01');
        const after = evaluateAt(1);
        expect(after.cause).not.toBe('WINDOW_PROTECTED');
        expect(after.primary_rule_id).not.toBe('R-LAB-01');
      }),
      { seed: 20261019, numRuns: 1000 },
    ),
  );
});
test('EDGE-2158 literal annex request denied before night start', () => {
  const f = facts();
  f.campus_now = '2026-10-20T02:58:00.000Z';
  const d = evaluate({ ...request(), workload_kind: 'TRAINING', expected_duration_min: 800 }, f, 1);
  expect(d).toMatchObject({
    outcome: 'DENY',
    cause: 'WINDOW_PROTECTED',
    primary_rule_id: 'R-NIGHT-01',
    admission: 'REJECTED',
  });
});
test('EDGE-NIGHT admission bounded by 0555 before 1000 class', () => {
  const f = facts();
  f.campus_now = '2026-10-20T03:00:00.000Z';
  f.windows = [
    protectedWindow({ starts_at: '2026-10-20T15:00:00.000Z', ends_at: '2026-10-20T17:00:00.000Z' }),
  ];
  const d = evaluate({ ...request(), workload_kind: 'TRAINING', expected_duration_min: 800 }, f, 1);
  expect(d.outcome).toBe('CONSTRAIN');
  expect(d.valid_until).toBe('2026-10-20T10:55:00.000Z');
  expect(d.must_checkpoint_by).toBe(d.valid_until);
  expect(d.constraints).toEqual(
    expect.arrayContaining([expect.objectContaining({ kind: 'HARD_DEADLINE', enforced_by: 'M9' })]),
  );
});
test('EDGE-1000 reevaluation at class boundary denies continuing work', () => {
  const f = facts();
  f.campus_now = '2026-10-20T15:00:00.000Z';
  f.windows = [
    protectedWindow({ starts_at: '2026-10-20T15:00:00.000Z', ends_at: '2026-10-20T17:00:00.000Z' }),
  ];
  const d = evaluate({ ...request(), workload_kind: 'TRAINING' }, f, 1);
  expect(d).toMatchObject({
    outcome: 'DENY',
    admission: 'REJECTED',
    cause: 'WINDOW_PROTECTED',
    primary_rule_id: 'R-LAB-01',
  });
  expect(d.constraints).toEqual([]);
});
test('DM-START independent generated start boundaries', () => {
  propertyCheck(() =>
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000 }), (minutes) => {
        const start = Date.parse('2026-10-19T15:00:00.000Z') + minutes * 60000;
        const evaluateAt = (delta: number) => {
          const f = facts();
          f.campus_now = new Date(start + delta).toISOString();
          f.windows = [protectedWindow({
            starts_at: new Date(start).toISOString(),
            ends_at: new Date(start + 3600000).toISOString(),
          })];
          return evaluate({ ...request(), workload_kind: 'EVALUATION' }, f, 1);
        };
        const before = evaluateAt(-1);
        expect(before.cause).not.toBe('WINDOW_PROTECTED');
        expect(before.primary_rule_id).not.toBe('R-LAB-01');
        const equal = evaluateAt(0);
        expect(equal).toMatchObject({
          outcome: 'DENY',
          cause: 'WINDOW_PROTECTED',
          admission: 'REJECTED',
          primary_rule_id: 'R-LAB-01',
        });
        const after = evaluateAt(1);
        expect(after).toMatchObject({
          outcome: 'DENY',
          cause: 'WINDOW_PROTECTED',
          admission: 'REJECTED',
          primary_rule_id: 'R-LAB-01',
        });
      }),
      { seed: 20261019, numRuns: 1000 },
    ),
  );
});

});
