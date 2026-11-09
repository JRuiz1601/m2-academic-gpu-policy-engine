import { describe, it, expect } from 'vitest';
import { evaluateWindowBoundary } from '../../src/domain/window-boundary.ts';
import { TimeDilationClock } from '../../src/adapters/outbound/time-dilation-clock.ts';
import type { Window } from '../../src/domain/evaluate.ts';

// Campus-local time is America/Panama (UTC-05:00): 06:00:00 local = 11:00:00Z.
const job = { job_ref: 'night-batch-1', workload_kind: 'BACKGROUND_BATCH', approved_policy: 'NIGHT' as const };
const windows: Window[] = [{ kind: 'CLASS', subject_id: 'CS-101', starts_at: '2026-10-19T13:00:00.000Z', ends_at: '2026-10-19T15:00:00.000Z' }];
const at = (hhmmss: string) => `2026-10-19T${hhmmss}.000Z`;

describe('evaluateWindowBoundary (pure domain, simulated clock)', () => {
  it('05:55:00 local warns with 5 minutes remaining and the 06:00:00 hard deadline', () => {
    const r = evaluateWindowBoundary(job, at('10:55:00'), undefined, windows);
    expect(r.action).toBe('EVICT_WARNING');
    expect(r.minutes_remaining).toBe(5);
    expect(r.hard_deadline).toBe('06:00:00');
  });
  it('05:54:59 local gives no warning yet', () => {
    const r = evaluateWindowBoundary(job, at('10:54:59'), undefined, windows);
    expect(r.action).toBe('CONTINUE');
    expect(r.hard_deadline).toBe('06:00:00');
  });
  it('exactly 06:00:00 local evicts: the job is past the boundary', () => {
    const r = evaluateWindowBoundary(job, at('11:00:00'), undefined, windows);
    expect(r.action).toBe('EVICT');
    expect(r.minutes_remaining).toBe(0);
  });
  it('+30 min at 05:59:00 crosses 06:00:00 and is denied citing the 08:00:00 class start', () => {
    const r = evaluateWindowBoundary(job, at('10:59:00'), 30, windows);
    expect(r.action).toBe('DENY');
    expect(r.rule_id).toBe('R-BOUND-01');
    expect(r.reason).toContain('Scheduled laboratory classes begin at 08:00:00');
  });
  it('an extension that ends before 06:00:00 is allowed and keeps the hard deadline', () => {
    const r = evaluateWindowBoundary(job, at('10:20:00'), 30, windows);
    expect(r.action).toBe('EXTEND_ALLOWED');
    expect(r.hard_deadline).toBe('06:00:00');
  });
  it('an extension ending exactly at 06:00:00 does not cross and is allowed', () => {
    expect(evaluateWindowBoundary(job, at('10:30:00'), 30, windows).action).toBe('EXTEND_ALLOWED');
  });
  it('is pure: same inputs give the same output', () => {
    const first = evaluateWindowBoundary(job, at('10:55:00'), undefined, windows);
    expect(first.action).toBe('EVICT_WARNING');
    expect(evaluateWindowBoundary(job, at('10:55:00'), undefined, windows)).toEqual(first);
  });
});

describe('TimeDilationClock (simulated, deterministic Clock port)', () => {
  it('reads the start instant until advanced', () => {
    expect(new TimeDilationClock(at('10:00:00')).read()).toBe(at('10:00:00'));
  });
  it('advanceBy and advanceTo fast-forward the instant', () => {
    const clock = new TimeDilationClock(at('10:00:00'));
    clock.advanceBy(55 * 60_000);
    expect(clock.read()).toBe(at('10:55:00'));
    clock.advanceTo(at('11:00:00'));
    expect(clock.read()).toBe(at('11:00:00'));
  });
});
