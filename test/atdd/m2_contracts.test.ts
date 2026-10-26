import { test, expect, beforeEach, afterEach, describe } from 'vitest';
import {
  evaluateRequest,
  previewFreeze,
  activateFreeze,
  publishVersion,
  liftFreeze,
  NotImplementedError,
} from '../../ports/in/policy.js';
import {
  harness,
  timetableWindow,
  catalogFacts,
  accessFacts,
  request,
  session,
  instructor,
  instructor2,
  seedDraft,
  seedPreview,
  seedFreeze,
  signToken,
  snapshot,
  rows,
  explain_assert,
  type Harness,
} from '../fixtures/index.js';
describe('M2 application contracts', () => {
let h: Harness;
beforeEach(() => {
  h = harness();
});
afterEach(() => h.db.close());
const input = () => ({ request: request(), key: 'key-1', session });
async function rejected(call: () => Promise<unknown>, code: string, before: string) {
  let error: unknown;
  try {
    await call();
  } catch (e) {
    if (e instanceof NotImplementedError) throw e;
    error = e;
  }
  expect(error).toMatchObject({ code });
  expect(snapshot(h)).toBe(before);
  expect(h.events).toEqual([]);
  expect(h.sideEffects).toEqual([]);
}
test('EV-Q1 ALLOW journal and outbox', async () => {
  const d = await evaluateRequest(h, input());
  expect(d.outcome).toBe('ALLOW');
  expect(d.primary_rule_id).toBe('R-ALLOW-01');
  expect(d.admission).toBe('ADMITTED');
  expect(d.authority).toBe('FINAL');
  expect(Date.parse(d.valid_until!)).toBeGreaterThan(Date.parse(d.evaluated_at));
  expect(rows(h, 'decision')).toHaveLength(1);
  expect(rows(h, 'fact_snapshot')).toHaveLength(1);
  expect(rows(h, 'idempotency_key')).toHaveLength(1);
  expect(rows(h, 'decision_outbox')).toMatchObject([
    { event_type: 'policy.decision.v1', decision_id: d.decision_id },
  ]);
  explain_assert(d);
});
test('EV-Q2 quota produces provisional cap', async () => {
  h.telemetry.inject('quota', { remaining: 5, need: 10 });
  const d = await evaluateRequest(h, input());
  expect(d.outcome).toBe('CONSTRAIN');
  expect(d.authority).toBe('PROVISIONAL');
  expect(d.constraints).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        kind: 'QUOTA_CAP',
        enforced_by: expect.any(String),
        value: expect.objectContaining({ cap_value: 5 }),
      }),
    ]),
  );
  expect(rows(h, 'decision')).toHaveLength(1);
  expect(h.sideEffects).toEqual([]);
});
test('EV-P1 wire invalid no writes', async () => {
  const i = input();
  i.request.expected_duration_min = 1.5;
  await rejected(() => evaluateRequest(h, i), 'WIRE_SHAPE_INVALID', snapshot(h));
});
test('EV-P2 key missing no writes', async () => {
  await rejected(
    () => evaluateRequest(h, { ...input(), key: '' }),
    'IDEMPOTENCY_KEY_MISSING',
    snapshot(h),
  );
});
test('EV-I1 M2-AD-8 three concurrent calls one decision', async () => {
  const ds = await Promise.all(Array.from({ length: 3 }, () => evaluateRequest(h, input())));
  expect(new Set(ds.map((d) => d.decision_id)).size).toBe(1);
  expect(rows(h, 'decision')).toHaveLength(1);
  expect(rows(h, 'decision_outbox')).toHaveLength(1);
  expect(rows(h, 'idempotency_key')).toHaveLength(1);
});
test('EV-I2 M2-AD-9 actor mismatch is journalled DENY', async () => {
  const i = input();
  i.request.actor_ref = 'actor-other';
  const d = await evaluateRequest(h, i);
  expect(d).toMatchObject({
    outcome: 'DENY',
    cause: 'INVALID_REQUEST',
    primary_rule_id: 'R-VALID-01',
  });
  expect(rows(h, 'decision')).toHaveLength(1);
  expect(rows(h, 'decision_outbox')).toHaveLength(1);
  expect(h.sideEffects).toEqual([]);
  explain_assert(d);
});
test('EV-EX1 DENY explains rule cause evidence citation', async () => {
  h.telemetry.inject('quota', { remaining: 0, need: 10 });
  const d = await evaluateRequest(h, input());
  expect(d).toMatchObject({
    outcome: 'DENY',
    primary_rule_id: 'R-QUOTA-01',
    cause: 'QUOTA_EXHAUSTED',
  });
  explain_assert(d);
  expect(d.rationale.split('.')[0]).toContain('QUOTA_EXHAUSTED');
  expect(d.next_actions.length).toBeGreaterThan(0);
});
test('EV-DEP M2-AD-4 timeout is dependency DENY', async () => {
  h.telemetry.inject('quota', new Error('timeout:41ms'));
  const d = await evaluateRequest(h, input());
  expect(d).toMatchObject({
    outcome: 'DENY',
    primary_rule_id: 'R-DEP-01',
    cause: 'DEPENDENCY_UNAVAILABLE',
    retry_after_ms: 2000,
  });
  expect(rows(h, 'decision')).toHaveLength(1);
  expect(h.sideEffects).toEqual([]);
});
test('EV-VERSION M2-AD-7 version pinned through publication', async () => {
  h.telemetry.inject('publish_during_fetch', 2);
  const d = await evaluateRequest(h, input());
  expect(d.policy_version).toBe(1);
  expect(rows(h, 'decision')[0]?.policy_version).toBe(1);
  expect(d.content_hash).toMatch(/^[a-f0-9]{64}$/);
});
test('EV-CLOCK M2-AD-3 clock read once first', async () => {
  const d = await evaluateRequest(h, input());
  expect(h.clock.reads).toBe(1);
  expect(d.evaluated_at).toBe('2026-10-19T03:00:00.000Z');
  expect(h.telemetry.calls[0]).toBe('campus.clock');
});
test('EV-PII M2-AD-8 poisoned facts never leak', async () => {
  h.telemetry.inject('identity', {
    actor_id: session.actor_id,
    name: 'Poison Person',
    email: 'poison@example.edu',
    token: 'Bearer SECRET_TEST',
  });
  const d = await evaluateRequest(h, input());
  expect(h.telemetry.calls).toContain('identity');
  const text = JSON.stringify(d) + snapshot(h) + JSON.stringify(h.events);
  for (const secret of ['Poison Person', 'poison@example.edu', 'SECRET_TEST'])
    expect(text).not.toContain(secret);
});
test('PV-Q1 preview persists audit only', async () => {
  const draft_id = seedDraft(h);
  const p = await previewFreeze(h, { draft_id, session: instructor });
  expect(p.preview_token.length).toBeGreaterThan(0);
  expect(Number.isInteger(p.denied_count) && p.denied_count >= 0).toBe(true);
  const row = rows(h, 'preview_run')[0]!;
  expect(row.denied_count).toBe(p.denied_count);
  expect(JSON.parse(String(row.survivors))).toEqual(p.survivors);
  expect(row.next_protected_window).toBe(p.next_protected_window);
  expect(p.expires_at).toBe('2026-10-19T03:01:00.000Z');
  expect(rows(h, 'preview_run')).toHaveLength(1);
  expect(rows(h, 'audit_events')).toMatchObject([{ action: 'FREEZE_PREVIEW_COMPUTED' }]);
  expect(rows(h, 'freeze')).toEqual([]);
  expect(rows(h, 'decision')).toEqual([]);
  expect(rows(h, 'decision_outbox')).toEqual([]);
  expect(h.events).toEqual([]);
});
test('PV-Q2 unavailable runtime remains labelled preview', async () => {
  h.telemetry.inject('runtime', { status: 'UNAVAILABLE' });
  const p = await previewFreeze(h, { draft_id: seedDraft(h), session: instructor });
  expect(p.runtime_snapshot).toBe('UNAVAILABLE');
  expect(rows(h, 'preview_run')).toMatchObject([{ runtime_snapshot: 0 }]);
  expect(rows(h, 'freeze')).toEqual([]);
});
test('PV-P1 insufficient role no mutation', async () => {
  const draft_id = seedDraft(h);
  await rejected(() => previewFreeze(h, { draft_id, session }), 'ROLE_INSUFFICIENT', snapshot(h));
});
test('PV-P2 unknown draft no token', async () => {
  await rejected(
    () =>
      previewFreeze(h, { draft_id: '0199bbbb-bbbb-7bbb-8bbb-bbbbbbbbbbbb', session: instructor }),
    'DRAFT_NOT_FOUND',
    snapshot(h),
  );
});
test('PV-I1 two previews yield distinct tokens', async () => {
  const draft_id = seedDraft(h);
  const ps = await Promise.all([
    previewFreeze(h, { draft_id, session: instructor }),
    previewFreeze(h, { draft_id, session: instructor }),
  ]);
  expect(new Set(ps.map((p) => p.preview_token)).size).toBe(2);
  expect(rows(h, 'preview_run')).toHaveLength(2);
  expect(rows(h, 'freeze')).toEqual([]);
  expect(h.events).toEqual([]);
});
test('PV-I2 draft expires at exact 24h boundary', async () => {
  const draft_id = seedDraft(h);
  h.clock.advance(86400000);
  await rejected(
    () => previewFreeze(h, { draft_id, session: instructor }),
    'DRAFT_EXPIRED',
    snapshot(h),
  );
});
async function armed() {
  const draft_id = seedDraft(h);
  return { draft_id, session: instructor, reason: 'exam', preview_token: seedPreview(h, draft_id) };
}
test('AC-Q1 activation commits freeze token outbox audit', async () => {
  const i = await armed();
  const f = await activateFreeze(h, i);
  expect(f.policy_version).toBe(1);
  expect(rows(h, 'freeze')).toMatchObject([
    { freeze_id: f.freeze_id, state: 'ACTIVE', activated_by: instructor.actor_id },
  ]);
  expect(rows(h, 'preview_run')[0]?.consumed_at).toBe('2026-10-19T03:00:00.000Z');
  expect(rows(h, 'decision_outbox')).toMatchObject([
    { event_type: 'policy.freeze.activated.v1', freeze_id: f.freeze_id },
  ]);
  expect(rows(h, 'audit_events').some((r) => r.action === 'FREEZE_ACTIVATED')).toBe(true);
  expect(h.sideEffects).toEqual([]);
});
test('AC-Q2 token valid at exactly 60s', async () => {
  const i = await armed();
  h.clock.advance(60000);
  const f = await activateFreeze(h, i);
  expect(rows(h, 'freeze')).toMatchObject([{ freeze_id: f.freeze_id, state: 'ACTIVE' }]);
  expect(rows(h, 'preview_run')[0]?.consumed_at).toBe('2026-10-19T03:01:00.000Z');
});
test('AC-P1 missing reason no mutation', async () => {
  const i = { draft_id: seedDraft(h), session: instructor, reason: '', preview_token: 'absent' };
  await rejected(() => activateFreeze(h, i), 'MISSING_REASON', snapshot(h));
});
test('AC-P2 missing token no mutation', async () => {
  const i = { draft_id: seedDraft(h), session: instructor, reason: 'exam', preview_token: '' };
  await rejected(() => activateFreeze(h, i), 'TOKEN_ABSENT', snapshot(h));
});
test('AC-I1 eight racers one success seven conflicts', async () => {
  const i = await armed();
  const result = await Promise.allSettled(Array.from({ length: 8 }, () => activateFreeze(h, i)));
  for (const r of result)
    if (r.status === 'rejected' && r.reason instanceof NotImplementedError) throw r.reason;
  expect(result.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  const errors = result.filter((r) => r.status === 'rejected');
  expect(errors).toHaveLength(7);
  expect(errors.map((r) => (r as PromiseRejectedResult).reason)).toMatchObject(
    Array.from({ length: 7 }, () => ({ http_status: 409 })),
  );
  expect(rows(h, 'freeze')).toHaveLength(1);
  expect(rows(h, 'decision_outbox')).toHaveLength(1);
  expect(rows(h, 'audit_events')).toMatchObject([{ action: 'FREEZE_ACTIVATED' }]);
  expect(rows(h, 'audit_events')).toHaveLength(1);
  expect(rows(h, 'preview_run')[0]?.consumed_at).toBe('2026-10-19T03:00:00.000Z');
});
test('AC-I2 token invalid after 60s plus 1ms', async () => {
  const i = await armed();
  h.clock.advance(60001);
  await rejected(() => activateFreeze(h, i), 'PREVIEW_EXPIRED', snapshot(h));
});
test('AC-ROLLBACK transaction fault leaves all state unchanged', async () => {
  const i = await armed();
  h.fault = 'after-freeze-insert';
  await rejected(() => activateFreeze(h, i), 'TRANSACTION_ABORTED', snapshot(h));
});
test('AC-ROLE fresh role revocation blocks activation', async () => {
  const i = await armed();
  h.telemetry.inject('identity.role_tier', 'STUDENT');
  await rejected(() => activateFreeze(h, i), 'ROLE_INSUFFICIENT', snapshot(h));
});
test('AC-TOKEN-FORGED forged signature is refused', async () => {
  const i = await armed();
  const body = JSON.parse(Buffer.from(i.preview_token, 'base64url').toString());
  i.preview_token = Buffer.from(JSON.stringify({ ...body, signature: '0'.repeat(64) })).toString(
    'base64url',
  );
  await rejected(() => activateFreeze(h, i), 'TOKEN_ABSENT', snapshot(h));
});
test('AC-NO-PREVIEW-ROW signed token without a preview row is refused', async () => {
  const draft_id = seedDraft(h);
  const preview_token = signToken(
    h,
    '0199dddd-dddd-7ddd-8ddd-dddddddddddd',
    draft_id,
    instructor.actor_id,
  );
  expect(rows(h, 'preview_run')).toEqual([]);
  await rejected(
    () => activateFreeze(h, { draft_id, session: instructor, reason: 'exam', preview_token }),
    'TOKEN_ABSENT',
    snapshot(h),
  );
});
test('AC-TOKEN-ACTOR token of another actor is refused', async () => {
  const i = await armed();
  expect(rows(h, 'preview_run')).toMatchObject([{ actor_id: instructor.actor_id }]);
  await rejected(
    () => activateFreeze(h, { ...i, session: instructor2 }),
    'TOKEN_ACTOR_MISMATCH',
    snapshot(h),
  );
});
test('EDGE-FINAL bounded night decision and class DENY persist without external mutation', async () => {
  h.clock.set('2026-10-20T03:00:00.000Z');
  h.telemetry.inject('timetable', [
    timetableWindow({
      starts_at: '2026-10-20T15:00:00.000Z',
      ends_at: '2026-10-20T17:00:00.000Z',
    }),
  ]);
  const i = input();
  i.request.workload_kind = 'TRAINING';
  i.request.expected_duration_min = 800;
  const night = await evaluateRequest(h, i);
  expect(night).toMatchObject({
    outcome: 'CONSTRAIN',
    valid_until: '2026-10-20T10:55:00.000Z',
    must_checkpoint_by: '2026-10-20T10:55:00.000Z',
  });
  expect(night.constraints).toEqual(
    expect.arrayContaining([expect.objectContaining({ kind: 'HARD_DEADLINE', enforced_by: 'M9' })]),
  );
  h.clock.set('2026-10-20T15:00:00.000Z');
  const atClass = await evaluateRequest(h, { ...i, key: 'class-reevaluation' });
  expect(atClass).toMatchObject({
    outcome: 'DENY',
    admission: 'REJECTED',
    primary_rule_id: 'R-LAB-01',
  });
  expect(rows(h, 'decision')).toHaveLength(2);
  expect(rows(h, 'decision_outbox')).toHaveLength(2);
  expect(rows(h, 'decision').find((r) => r.decision_id === atClass.decision_id)?.outcome).toBe(
    'DENY',
  );
  expect(h.sideEffects).toEqual([]); // M2 must delegate termination, never mutate cluster state.
});

// ---------------------------------------------------------------------------------------------
// P5-FIX-2 (2026-10-21): tests added after the readiness gate run 1 (findings MAJ-1, MAJ-3).
// FIXTURE ASSUMPTION: the shape of the injected facts (freeze_states, catalog, access, reservation)
// is defined here only; no source fixes it. Oracles are quoted from the PRD and contracts.md.
// ---------------------------------------------------------------------------------------------
const FREEZE_ID = '0199ffff-ffff-7fff-8fff-ffffffffffff';
const activeFreeze = (allowances: string[]) => ({
  freeze_id: FREEZE_ID,
  scope: 'ALL',
  state: 'ACTIVE',
  starts_at: '2026-10-19T13:00:00.000Z', // 08:00 campus (UTC-5)
  ends_at: '2026-10-20T01:00:00.000Z', // 20:00 campus
  allowances,
});

test('EV-FRZ-01 active freeze denies a request without an allowance', async () => {
  // Oracle: prd.md line 426 (FR-2): every non-exam request in [08:00:00.000, 20:00:00.000) is DENY with R-FRZ-01;
  // line 326 (R-FRZ-01 -> DENY(FREEZE_ACTIVE)); contracts.md section 3.2 FREEZE_ACTIVE (HTTP 200, body is a Decision).
  h.clock.set('2026-10-19T13:00:00.000Z');
  h.telemetry.inject('freeze_states', [activeFreeze([])]);
  const d = await evaluateRequest(h, input());
  expect(d).toMatchObject({
    outcome: 'DENY',
    cause: 'FREEZE_ACTIVE',
    primary_rule_id: 'R-FRZ-01',
    admission: 'REJECTED',
  });
  expect(rows(h, 'decision')).toHaveLength(1);
  // The end instant is outside the half-open window (prd.md line 326: campus_now in [starts_at, ends_at)).
  h.clock.set('2026-10-20T01:00:00.000Z');
  const after = await evaluateRequest(h, { ...input(), key: 'key-2' });
  expect(after.cause).not.toBe('FREEZE_ACTIVE');
  expect(after.primary_rule_id).not.toBe('R-FRZ-01');
});

test('EV-FRZ-02 active freeze admits a validated exam binding with WINDOW_SCOPE', async () => {
  // Oracle: prd.md line 327 (R-FRZ-02 -> CONSTRAIN WINDOW_SCOPE, admission ADMITTED) and line 426 (FR-2).
  h.clock.set('2026-10-19T14:00:00.000Z');
  h.telemetry.inject('freeze_states', [activeFreeze(['RSV-EXAM-01'])]);
  h.telemetry.inject('reservation', {
    reservation_id: 'RSV-EXAM-01',
    state: 'ACTIVE',
    subject_id: 'CS-340-CV',
    starts_at: '2026-10-19T13:30:00.000Z',
    ends_at: '2026-10-19T17:00:00.000Z',
  });
  h.telemetry.inject('access', accessFacts({ subject_ids: ['CS-340-CV'] }));
  const i = input();
  i.request.workload_kind = 'EXAM_BOUND';
  i.request.exam_binding = 'RSV-EXAM-01';
  const d = await evaluateRequest(h, i);
  expect(d).toMatchObject({
    outcome: 'CONSTRAIN',
    primary_rule_id: 'R-FRZ-02',
    admission: 'ADMITTED',
  });
  expect(d.constraints).toEqual(
    expect.arrayContaining([expect.objectContaining({ kind: 'WINDOW_SCOPE' })]),
  );
});

test('EV-TIER-01 model floor above the requested VRAM is refused as no such hardware', async () => {
  // Oracle: prd.md line 510 (NP-5): a request that declares 24 GB for a model whose floor is 48 GB is
  // DENY(NO_SUCH_HARDWARE) with R-TIER-01, never silently corrected; line 330 (R-TIER-01).
  h.telemetry.inject('catalog', catalogFacts({ min_vram_gb: 48, }));
  const d = await evaluateRequest(h, input());
  expect(d).toMatchObject({
    outcome: 'DENY',
    cause: 'NO_SUCH_HARDWARE',
    primary_rule_id: 'R-TIER-01',
    admission: 'REJECTED',
  });
});

test('EV-TIER-02 student above the VRAM clearance with no variant is not authorised', async () => {
  // Oracle: prd.md line 427 (FR-3 clause 1): STUDENT (cap 24 GB) asking for a 48 GB model returns
  // DENY(NOT_AUTHORIZED) with R-TIER-02 when no qualifying variant exists; line 329 (R-TIER-02); scenario S-2, line 526.
  h.telemetry.inject('catalog', catalogFacts({ model_ref: 'vlm-70b', min_vram_gb: 48, }));
  h.telemetry.inject('access', accessFacts({
    clearance: { max_gpu_count: 1, max_vram_gb: 24, unrestricted: false },
  }));
  const i = input();
  i.request.model_ref = 'vlm-70b';
  i.request.requested_vram_gb_per_gpu = 48;
  const d = await evaluateRequest(h, i);
  expect(d).toMatchObject({
    outcome: 'DENY',
    cause: 'NOT_AUTHORIZED',
    primary_rule_id: 'R-TIER-02',
    admission: 'REJECTED',
  });
});

test('EV-TIER-03 student above the VRAM clearance with a qualifying variant gets MODEL_VARIANT', async () => {
  // Oracle: prd.md line 427 (FR-3 clause 1): CONSTRAIN -> MODEL_VARIANT with R-TIER-03 when a qualifying variant
  // exists (variant within the cap on VRAM and on role tier, A-7, line 134); line 328 (R-TIER-03).
  h.telemetry.inject('catalog', catalogFacts({
    model_ref: 'vlm-70b',
    min_vram_gb: 48,
    variants: [{ model_ref: 'vlm-70b-q4', min_vram_gb: 24, required_min_role_tier: 'STUDENT' }],
  }));
  h.telemetry.inject('access', accessFacts({
    clearance: { max_gpu_count: 1, max_vram_gb: 24, unrestricted: false },
  }));
  const i = input();
  i.request.model_ref = 'vlm-70b';
  i.request.requested_vram_gb_per_gpu = 48;
  const d = await evaluateRequest(h, i);
  expect(d).toMatchObject({
    outcome: 'CONSTRAIN',
    primary_rule_id: 'R-TIER-03',
    admission: 'ADMITTED',
  });
  expect(d.constraints).toEqual(
    expect.arrayContaining([expect.objectContaining({ kind: 'MODEL_VARIANT' })]),
  );
});

test('PV-UNAVAILABLE preview that cannot be computed issues no token and blocks activation', async () => {
  // Oracle: contracts.md previewFreeze P6 (line 70) and Q-fail (line 76); catalog row PREVIEW_UNAVAILABLE
  // (503, section 3.1): no PREVIEW_RUN row, no token, nothing written.
  // FIXTURE ASSUMPTION: a failing timetable port makes the computation impossible (previewFreeze Layer line, ports 4 and 5).
  h.telemetry.inject('timetable', new Error('timeout:41ms'));
  const draft_id = seedDraft(h);
  await rejected(
    () => previewFreeze(h, { draft_id, session: instructor }),
    'PREVIEW_UNAVAILABLE',
    snapshot(h),
  );
});

test('PB-Q1 publish writes one immutable version and one outbox row', async () => {
  // Oracle: contracts.md publishVersion Q1 and Q2; ARCHITECTURE.md M2-AD-7 Rule (sha256 content_hash, immutable)
  // and section 5.2 (policy.version.published.v1 written through DECISION_OUTBOX with published_seq set).
  const manifest = await publishVersion(h, { session: instructor });
  expect(manifest.published_seq).toBe(2);
  expect(manifest.content_hash).toMatch(/^[a-f0-9]{64}$/);
  expect(rows(h, 'policy_version')).toHaveLength(2);
  expect(rows(h, 'policy_version').find((r) => r.published_seq === 2)).toMatchObject({
    immutable: 1,
  });
  expect(rows(h, 'decision_outbox')).toMatchObject([
    { event_type: 'policy.version.published.v1', published_seq: 2 },
  ]);
  expect(h.sideEffects).toEqual([]);
});

test('PB-I1 publish succeeds with the bus down and keeps the outbox row', async () => {
  // Oracle: contracts.md publishVersion Q-fail; ARCHITECTURE.md M2-AD-8 (outbox, at-least-once delivery).
  // FIXTURE ASSUMPTION: the harness fault value 'bus-down' marks the event bus unavailable.
  h.fault = 'bus-down';
  const manifest = await publishVersion(h, { session: instructor });
  expect(manifest.published_seq).toBe(2);
  expect(rows(h, 'decision_outbox')).toMatchObject([
    { event_type: 'policy.version.published.v1', published_seq: 2 },
  ]);
  expect(h.events).toEqual([]);
});

// P5-FIX-3 (2026-10-21): tests for story 1.3 criterion 2 (readiness gate run 1, MAJ-3).
// No fixture assumption beyond the existing harness and its manual clock.
test('EV-P3 same key with a different body is refused with 409', async () => {
  // Oracle: contracts.md evaluateRequest P4 (line 30) and catalog row IDEMPOTENCY_BODY_MISMATCH (line 162, 409):
  // the same (actor_id, key) with a different request_hash. request_hash covers expected_duration_min (line 30).
  await evaluateRequest(h, input());
  const before = snapshot(h);
  const other = input();
  other.request.expected_duration_min = 45;
  let error: unknown;
  try {
    await evaluateRequest(h, other);
  } catch (e) {
    error = e;
  }
  expect(error).toMatchObject({ code: 'IDEMPOTENCY_BODY_MISMATCH', http_status: 409 });
  expect(snapshot(h)).toBe(before);
  expect(rows(h, 'decision')).toHaveLength(1);
  expect(h.sideEffects).toEqual([]);
});

test('EV-P4 expired key is refused with 409 and its row is kept', async () => {
  // Oracle: contracts.md evaluateRequest Q2 (line 38: replay_window_expires_at = created_at + 24 h), P4 (line 30:
  // expired when replay_window_expires_at <= campus_now) and catalog row IDEMPOTENCY_KEY_EXPIRED (line 163, 409);
  // M2-AD-8 (contracts.md line 219): no UPDATE or DELETE on IDEMPOTENCY_KEY, so the expired row stays.
  await evaluateRequest(h, input());
  h.clock.advance(86400000);
  const before = snapshot(h);
  let error: unknown;
  try {
    await evaluateRequest(h, input());
  } catch (e) {
    error = e;
  }
  expect(error).toMatchObject({ code: 'IDEMPOTENCY_KEY_EXPIRED', http_status: 409 });
  expect(snapshot(h)).toBe(before);
  expect(rows(h, 'idempotency_key')).toHaveLength(1);
  expect(rows(h, 'decision')).toHaveLength(1);
  expect(h.sideEffects).toEqual([]);
});

// ---------------------------------------------------------------------------------------------
// P5-FIX-4 (2026-10-21): tests added after the readiness gate run 2 (finding CRIT-1, MAJ-6).
// FIXTURE ASSUMPTION: the shape of the injected facts 'availability', 'identity', 'access', 'catalog'
// and 'timetable' is defined here only; no source fixes it. Oracles are quoted from the PRD and contracts.md.
// ---------------------------------------------------------------------------------------------
test('EV-FLEET-01 failing hardware is refused as HARDWARE_FAILING', async () => {
  // Oracle: prd.md line 331 (R-FLEET-01: every satisfying class has available_count <= 0 and failing_count >= 1
  // -> DENY(HARDWARE_FAILING)); scenario S-7, line 531 (R-CONTEND-01 is NOT_EVALUATED); contracts.md section 3.2.
  h.telemetry.inject('availability', [
    { class_id: 'std-24', available_count: 0, cordoned_count: 0, failing_count: 1 },
  ]);
  const d = await evaluateRequest(h, input());
  expect(d).toMatchObject({
    outcome: 'DENY',
    cause: 'HARDWARE_FAILING',
    primary_rule_id: 'R-FLEET-01',
    admission: 'REJECTED',
  });
  expect(d.trace.find((t) => t.rule_id === 'R-CONTEND-01')?.state).toBe('NOT_EVALUATED');
});

test('EV-CONTEND-01 busy hardware is queued, not refused', async () => {
  // Oracle: prd.md line 341 (R-CONTEND-01: every satisfying class has available_count <= 0 and failing_count = 0
  // -> CONSTRAIN QUEUE_ONLY, admission QUEUED); line 208 (admission invariant: QUEUED iff a QUEUE_ONLY constraint).
  h.telemetry.inject('availability', [
    { class_id: 'std-24', available_count: 0, cordoned_count: 0, failing_count: 0 },
  ]);
  const d = await evaluateRequest(h, input());
  expect(d).toMatchObject({
    outcome: 'CONSTRAIN',
    primary_rule_id: 'R-CONTEND-01',
    admission: 'QUEUED',
  });
  expect(d.constraints).toEqual(
    expect.arrayContaining([expect.objectContaining({ kind: 'QUEUE_ONLY' })]),
  );
});

test('EV-SYS-01 system role outside its permitted workload kinds is not authorised', async () => {
  // Oracle: prd.md line 336 (R-SYS-01: actor_kind SYSTEM; NIGHT_TRAINING_DAEMON may use TRAINING and EVALUATION only
  // -> DENY(NOT_AUTHORIZED)); scenario S-6, line 530. Line 530 says R-NIGHT-01 is NO_MATCH, but lines 284-287 say rules
  // below the terminal rule are NOT_EVALUATED: the state of R-NIGHT-01 is therefore not asserted.
  h.telemetry.inject('identity', {
    actor_id: session.actor_id,
    actor_kind: 'SYSTEM',
    system_role: 'NIGHT_TRAINING_DAEMON',
  });
  const i = input();
  i.request.workload_kind = 'BACKGROUND_BATCH';
  const d = await evaluateRequest(h, i);
  expect(d).toMatchObject({
    outcome: 'DENY',
    cause: 'NOT_AUTHORIZED',
    primary_rule_id: 'R-SYS-01',
    admission: 'REJECTED',
  });
});

test('EV-AUTH-01 actor without entitlement to the subject is not authorised', async () => {
  // Oracle: prd.md line 333 (R-AUTH-01: the actor holds no entitlement to request.subject_id -> DENY(NOT_AUTHORIZED)).
  h.telemetry.inject('access', accessFacts({ subject_ids: [] }));
  const d = await evaluateRequest(h, input());
  expect(d).toMatchObject({
    outcome: 'DENY',
    cause: 'NOT_AUTHORIZED',
    primary_rule_id: 'R-AUTH-01',
    admission: 'REJECTED',
  });
});

test('EV-AUTH-02 role tier below the model requirement is not authorised', async () => {
  // Oracle: prd.md line 332 (R-AUTH-02: actor.role_tier < model_facts.required_min_role_tier -> DENY(NOT_AUTHORIZED));
  // tier order STUDENT < TEACHING_ASSISTANT < INSTRUCTOR (A-4, line 131).
  h.telemetry.inject('catalog', catalogFacts({
    min_vram_gb: 24,
    required_min_role_tier: 'INSTRUCTOR',
  }));
  const d = await evaluateRequest(h, input());
  expect(d).toMatchObject({
    outcome: 'DENY',
    cause: 'NOT_AUTHORIZED',
    primary_rule_id: 'R-AUTH-02',
    admission: 'REJECTED',
  });
});

test('EV-LAB-02 exam window refuses a request that is not exam bound', async () => {
  // Oracle: prd.md line 334 (R-LAB-02: campus_now in an EXAM window of a subject of the actor and the request is not
  // EXAM_BOUND -> DENY(WINDOW_PROTECTED)); the window is half-open (line 399).
  h.clock.set('2026-10-19T14:00:00.000Z');
  h.telemetry.inject('timetable', [
    timetableWindow({
      kind: 'EXAM',
      starts_at: '2026-10-19T13:00:00.000Z',
      ends_at: '2026-10-19T16:00:00.000Z',
    }),
  ]);
  h.telemetry.inject('access', accessFacts({ subject_ids: ['CS-340-CV'] }));
  const d = await evaluateRequest(h, input());
  expect(d).toMatchObject({
    outcome: 'DENY',
    cause: 'WINDOW_PROTECTED',
    primary_rule_id: 'R-LAB-02',
    admission: 'REJECTED',
  });
});

// Lift route. Oracle for the four tests below: contracts.md line 126 (outcomes of POST /policy/freezes/{id}/lift)
// and the catalog rows MISSING_REASON (line 178), FREEZE_NOT_LIFTABLE (line 175), ROLE_INSUFFICIENT (line 165).
// There is no full P/Q/I contract for the lift route; only these outcome notes are asserted.
test('LF-Q1 lifting an active freeze records the lift, one outbox row and one audit row', async () => {
  const freeze_id = seedFreeze(h);
  const r = await liftFreeze(h, { freeze_id, session: instructor, lift_reason: 'exam finished' });
  expect(r).toMatchObject({ freeze_id, state: 'LIFTED' });
  expect(rows(h, 'freeze')).toMatchObject([
    { freeze_id, state: 'LIFTED', lift_reason: 'exam finished' },
  ]);
  expect(rows(h, 'decision_outbox')).toMatchObject([
    { event_type: 'policy.freeze.lifted.v1', freeze_id },
  ]);
  expect(rows(h, 'audit_events').some((a) => a.action === 'FREEZE_LIFTED')).toBe(true);
});

test('LF-P1 lift without a reason is refused and writes nothing', async () => {
  const freeze_id = seedFreeze(h);
  await rejected(
    () => liftFreeze(h, { freeze_id, session: instructor, lift_reason: '' }),
    'MISSING_REASON',
    snapshot(h),
  );
});

test('LF-P2 lift of a freeze that is not active is refused and writes nothing', async () => {
  const freeze_id = seedFreeze(h, 'LIFTED');
  await rejected(
    () => liftFreeze(h, { freeze_id, session: instructor, lift_reason: 'again' }),
    'FREEZE_NOT_LIFTABLE',
    snapshot(h),
  );
});

test('LF-P3 lift by a caller below INSTRUCTOR is refused and writes nothing', async () => {
  const freeze_id = seedFreeze(h);
  await rejected(
    () => liftFreeze(h, { freeze_id, session, lift_reason: 'exam finished' }),
    'ROLE_INSUFFICIENT',
    snapshot(h),
  );
});

// ---------------------------------------------------------------------------------------------
// P5-FIX-5 (2026-10-21): tests for ruling DL-50 (ARCHITECTURE.md section 15.11), after gate run 3.
// Ruling: a DENY by R-QUOTA-01 dominates R-BOUND-01, and a DENY by one of the six rules of FR-2
// (R-TIER-01, R-TIER-02, R-AUTH-01, R-AUTH-02, R-QUOTA-01, R-FLEET-01) dominates R-FRZ-02, even though the
// table of prd.md section 6.2 orders them later. The overridden CONSTRAIN rule is NOT_EVALUATED (three states).
// FIXTURE ASSUMPTION: the same fact shapes as the tests above ('quota', 'timetable', 'freeze_states',
// 'reservation', 'access', 'catalog').
// ---------------------------------------------------------------------------------------------
test('EV-QBOUND-01 zero quota with a boundary inside the duration is DENY by R-QUOTA-01, not a deadline', async () => {
  // Oracle: prd.md line 432 (FR-8: with remaining = 0, 100 % of requests are DENY with R-QUOTA-01) and line 339
  // (R-QUOTA-01 -> DENY(QUOTA_EXHAUSTED)); R-BOUND-01 (line 338, precedence 13) would otherwise return a HARD_DEADLINE
  // CONSTRAIN for this request (same input as EDGE-FINAL). Ruling DL-50.
  h.clock.set('2026-10-20T03:00:00.000Z');
  h.telemetry.inject('timetable', [
    timetableWindow({
      starts_at: '2026-10-20T15:00:00.000Z',
      ends_at: '2026-10-20T17:00:00.000Z',
    }),
  ]);
  h.telemetry.inject('quota', { remaining: 0, need: 10 });
  const i = input();
  i.request.workload_kind = 'TRAINING';
  i.request.expected_duration_min = 800;
  const d = await evaluateRequest(h, i);
  expect(d).toMatchObject({
    outcome: 'DENY',
    cause: 'QUOTA_EXHAUSTED',
    primary_rule_id: 'R-QUOTA-01',
    admission: 'REJECTED',
  });
  expect(d.constraints).toEqual([]);
  expect(d.trace.find((t) => t.rule_id === 'R-BOUND-01')?.state).toBe('NOT_EVALUATED');
});

test('EV-FRZ-03 an allowance does not admit a request that R-TIER-02 or R-AUTH-02 denies', async () => {
  // Oracle: prd.md line 426 (FR-2: a request whose validated exam_binding is in allowances[] is admitted with
  // WINDOW_SCOPE only if it is not denied by R-TIER-01, R-TIER-02, R-AUTH-01, R-AUTH-02, R-QUOTA-01 or R-FLEET-01);
  // lines 326-333 (rule table). R-FRZ-02 (line 327, precedence 2) would otherwise be terminal. Ruling DL-50.
  // R-AUTH-01 is not used here: R-VALID-01 already checks the entitlement of an exam binding (prd.md line 362).
  h.clock.set('2026-10-19T14:00:00.000Z');
  h.telemetry.inject('freeze_states', [activeFreeze(['RSV-EXAM-01'])]);
  h.telemetry.inject('reservation', {
    reservation_id: 'RSV-EXAM-01',
    state: 'ACTIVE',
    subject_id: 'CS-340-CV',
    starts_at: '2026-10-19T13:30:00.000Z',
    ends_at: '2026-10-19T17:00:00.000Z',
  });
  const bound = () => {
    const i = input();
    i.request.workload_kind = 'EXAM_BOUND';
    i.request.exam_binding = 'RSV-EXAM-01';
    return i;
  };
  h.telemetry.inject('catalog', catalogFacts({ model_ref: 'vlm-70b', min_vram_gb: 48, }));
  h.telemetry.inject('access', accessFacts({
    subject_ids: ['CS-340-CV'],
    clearance: { max_gpu_count: 1, max_vram_gb: 24, unrestricted: false },
  }));
  const tier = bound();
  tier.request.model_ref = 'vlm-70b';
  tier.request.requested_vram_gb_per_gpu = 48;
  const d1 = await evaluateRequest(h, tier);
  expect(d1).toMatchObject({
    outcome: 'DENY',
    primary_rule_id: 'R-TIER-02',
    admission: 'REJECTED',
  });
  expect(d1.constraints).toEqual([]);
  expect(d1.trace.find((entry) => entry.rule_id === 'R-FRZ-02')?.state).toBe('NOT_EVALUATED');
  h.telemetry.inject('catalog', catalogFacts({
    min_vram_gb: 24,
    required_min_role_tier: 'INSTRUCTOR',
  }));
  h.telemetry.inject('access', accessFacts({ subject_ids: ['CS-340-CV'] }));
  const d2 = await evaluateRequest(h, { ...bound(), key: 'key-2' });
  expect(d2).toMatchObject({
    outcome: 'DENY',
    primary_rule_id: 'R-AUTH-02',
    admission: 'REJECTED',
  });
  expect(d2.constraints).toEqual([]);
  expect(d2.trace.find((entry) => entry.rule_id === 'R-FRZ-02')?.state).toBe('NOT_EVALUATED');
});

});
