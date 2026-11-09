import { describe, it, expect } from 'vitest';
import { modelFact, windowFacts, freezeFacts, quotaFact, availabilityFacts, strings } from '../../src/application/facts.ts';
import { canonical, hash } from '../../src/application/service.ts';
import { rank } from '../../src/domain/registry.ts';

const T0 = '2026-10-19T15:00:00.000Z', T1 = '2026-10-19T17:00:00.000Z';

describe('fact projections reject malformed port data (R-DEP-01 inputs)', () => {
  it('windowFacts keeps only the contract fields and sorts nothing away', () => {
    const [w] = windowFacts([{ kind: 'CLASS', subject_id: 'CS-101', starts_at: T0, ends_at: T1, secret: 'dropped' }]);
    expect(w).toEqual({ kind: 'CLASS', starts_at: T0, ends_at: T1, subject_id: 'CS-101' });
  });
  it.each([
    ['unknown window kind', [{ kind: 'PARTY', starts_at: T0, ends_at: T1 }]],
    ['window ending before it starts', [{ kind: 'LAB', starts_at: T1, ends_at: T0 }]],
    ['window instant without milliseconds', [{ kind: 'LAB', starts_at: '2026-10-19T15:00:00Z', ends_at: T1 }]],
    ['zero-length window (ends at the instant it starts)', [{ kind: 'LAB', starts_at: T0, ends_at: T0 }]],
    ['window that is not an array', { kind: 'LAB' }],
    ['window entry that is not an object', ['x']],
  ])('windowFacts throws MALFORMED_FACT for %s', (_name, value) => {
    expect(() => windowFacts(value)).toThrow('MALFORMED_FACT');
  });

  it('freezeFacts sorts allowances and keeps a non-empty reason only', () => {
    const [f] = freezeFacts([{ freeze_id: 'f1', scope: 'ALL', state: 'ACTIVE', starts_at: T0, ends_at: T1, allowances: ['b', 'a'], reason: 'Final Exam' }]);
    expect(f!.allowances).toEqual(['a', 'b']);
    expect(f!.reason).toBe('Final Exam');
    const [g] = freezeFacts([{ freeze_id: 'f2', scope: 'ALL', state: 'ACTIVE', starts_at: T0, ends_at: T1, allowances: [], reason: '' }]);
    expect('reason' in g!).toBe(false);
  });
  it('freezeFacts rejects an empty identifier', () => {
    expect(() => freezeFacts([{ freeze_id: '', scope: 'ALL', state: 'ACTIVE', starts_at: T0, ends_at: T1, allowances: [] }])).toThrow('MALFORMED_FACT');
  });

  it('modelFact requires a positive integer VRAM and projects variants recursively', () => {
    const m = modelFact({ model_ref: 'big', min_vram_gb: 48, required_min_role_tier: 'INSTRUCTOR', variants: [{ model_ref: 'big-q4', min_vram_gb: 24 }] });
    expect(m.variants?.[0]?.model_ref).toBe('big-q4');
    expect(m.required_min_role_tier).toBe('INSTRUCTOR');
    expect(() => modelFact({ model_ref: 'x', min_vram_gb: 0 })).toThrow('MALFORMED_FACT');
    expect(() => modelFact({ model_ref: 'x', min_vram_gb: 8.5 })).toThrow('MALFORMED_FACT');
    expect(() => modelFact('x')).toThrow('MALFORMED_FACT');
  });

  it('quotaFact defaults need to zero and rejects non-integers', () => {
    expect(quotaFact({ remaining: 5 })).toEqual({ remaining: 5, need: 0 });
    expect(() => quotaFact({ remaining: '5' })).toThrow('MALFORMED_FACT');
    expect(() => quotaFact([])).toThrow('MALFORMED_FACT');
  });

  it('availabilityFacts projects integer counts and rejects the rest', () => {
    expect(availabilityFacts([{ class_id: 'std-24', available_count: 3, failing_count: 1, extra: 1 }])).toEqual([{ class_id: 'std-24', available_count: 3, failing_count: 1 }]);
    expect(() => availabilityFacts([{ class_id: 'std-24', available_count: 'many', failing_count: 0 }])).toThrow('MALFORMED_FACT');
  });

  it('strings sorts and rejects empty entries', () => {
    expect(strings(['b', 'a'])).toEqual(['a', 'b']);
    expect(() => strings(['a', ''])).toThrow('MALFORMED_FACT');
  });
});

describe('canonical JSON and hashing (idempotency and replay depend on them)', () => {
  it('orders object keys recursively but keeps array order', () => {
    expect(canonical({ b: 1, a: { d: 1, c: [3, 2, 1] } })).toBe('{"a":{"c":[3,2,1],"d":1},"b":1}');
  });
  it('gives the same hash for the same content regardless of key order, and a different hash otherwise', () => {
    expect(hash({ a: 1, b: 2 })).toBe(hash({ b: 2, a: 1 }));
    expect(hash({ a: 1, b: 2 })).not.toBe(hash({ a: 1, b: 3 }));
    expect(hash({ a: 1 })).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('role ranking', () => {
  it('orders roles from student to admin and gives unknown roles rank -1', () => {
    expect(['STUDENT', 'TEACHING_ASSISTANT', 'INSTRUCTOR', 'RESEARCHER', 'ADMIN'].map(rank)).toEqual([0, 1, 2, 3, 4]);
    expect(rank('GUEST')).toBe(-1);
  });
});
