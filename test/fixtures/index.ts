import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import { expect } from 'vitest';
import type {
  DecisionDto,
  EvaluateRequestDto,
} from '../../planning/detailed-design/schemas/dto.js';
import type { Session } from '../../ports/in/policy.js';
export function fake_clock(initial = '2026-10-19T03:00:00.000Z') {
  let now = Date.parse(initial);
  let reads = 0;
  return {
    read() {
      reads++;
      return new Date(now).toISOString();
    },
    advance(ms: number) {
      now += ms;
    },
    set(s: string) {
      now = Date.parse(s);
    },
    get reads() {
      return reads;
    },
  };
}
export function seed_fleet() {
  return Array.from({ length: 32 }, (_, i) => ({
    node_id: `node-${i + 1}`,
    node_class_id: i < 31 ? 'std-24' : 'dual-48',
    gpu_count: i < 31 ? 1 : 2,
    vram_gb_per_gpu: i < 31 ? 24 : 48,
    health: 'HEALTHY',
  }));
}
export function sim_telemetry() {
  const script = new Map<string, unknown>();
  const calls: string[] = [];
  return {
    script,
    calls,
    inject(port: string, value: unknown) {
      script.set(port, value);
    },
    async read(port: string) {
      calls.push(port);
      const v = script.get(port);
      if (v instanceof Error) throw v;
      return v;
    },
  };
}
export function db() {
  const d = new DatabaseSync(':memory:');
  d.exec(
    readFileSync(
      new URL('../../planning/detailed-design/schemas/001_m2_schema.sqlite.sql', import.meta.url),
      'utf8',
    ),
  );
  return d;
}
export function explain_assert(d: DecisionDto) {
  expect(d.primary_rule_id).toMatch(/^R-[A-Z]+-\d{2}$/);
  expect(d.citations.length).toBeGreaterThan(0);
  expect(d.rationale).toContain(d.primary_rule_id);
  const entry = d.trace.find((t) => t.rule_id === d.primary_rule_id);
  expect(entry?.evidence.length).toBeGreaterThan(0);
}
export const session: Session = { actor_id: 'actor-elena', role_tier: 'STUDENT', scopes: [] };
export const instructor: Session = {
  actor_id: 'actor-reed',
  role_tier: 'INSTRUCTOR',
  scopes: ['LAB_OPERATOR'],
};
export const instructor2: Session = {
  actor_id: 'actor-park',
  role_tier: 'INSTRUCTOR',
  scopes: ['LAB_OPERATOR'],
};
export function request(): EvaluateRequestDto {
  return {
    request_id: 'req-1',
    request_chain_id: 'chain-1',
    actor_ref: session.actor_id,
    workload_kind: 'INTERACTIVE_INFERENCE',
    subject_id: 'CS-340-CV',
    model_ref: 'small-24',
    requested_gpu_count: 1,
    requested_vram_gb_per_gpu: 24,
    expected_duration_min: 30,
    exam_binding: null,
  };
}
export function harness() {
  const store = db();
  store
    .prepare(
      'INSERT INTO policy_version(published_seq,published_at,content_hash,engine_version,campus_tz,immutable,created_at) VALUES(?,?,?,?,?,?,?)',
    )
    .run(
      1,
      '2026-10-19T03:00:00.000Z',
      'a'.repeat(64),
      'fixture-v1',
      'America/Panama',
      1,
      '2026-10-19T03:00:00.000Z',
    );
  return {
    db: store,
    clock: fake_clock(),
    fleet: seed_fleet(),
    telemetry: sim_telemetry(),
    events: [] as { event_type: string; decision_id?: string; freeze_id?: string }[],
    sideEffects: [] as string[],
    policyVersion: 1,
    tokenSecret: 'test-only-never-production',
    fault: null as string | null,
  };
}
export type Harness = ReturnType<typeof harness>;
export function rows(h: Harness, table: string): Record<string, unknown>[] {
  if (!/^[a-z_]+$/.test(table)) throw Error('table');
  return h.db.prepare(`SELECT * FROM ${table}`).all();
}
export function snapshot(h: Harness) {
  const tables = h.db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all();
  return JSON.stringify(tables.map((t) => [t.name, rows(h, String(t.name))]));
}
export function seedDraft(h: Harness) {
  const id = '0199aaaa-aaaa-7aaa-8aaa-aaaaaaaaaaaa';
  h.db
    .prepare(
      'INSERT INTO freeze_draft(draft_id,content_hash,draft_body,created_by,created_at,expires_at,updated_at) VALUES(?,?,?,?,?,?,?)',
    )
    .run(
      id,
      'a'.repeat(64),
      JSON.stringify({
        scope: 'ALL',
        subject_ids: [],
        node_class_ids: [],
        allowances: [],
        starts_at: '2026-10-19T03:00:00.000Z',
        ends_at: '2026-10-19T05:00:00.000Z',
        reason: 'exam',
      }),
      instructor.actor_id,
      '2026-10-19T03:00:00.000Z',
      '2026-10-20T03:00:00.000Z',
      '2026-10-19T03:00:00.000Z',
    );
  return id;
}
// Test-only token encoding proposal; production encoding is a G-07 architecture decision.
export function signToken(
  h: Harness,
  preview_run_id: string,
  draft_id: string,
  actor_id: string,
  issued_at = '2026-10-19T03:00:00.000Z',
  hash = 'a'.repeat(64),
) {
  const signature = createHmac('sha256', h.tokenSecret)
    .update(draft_id + hash + actor_id + issued_at)
    .digest('hex');
  return Buffer.from(JSON.stringify({ preview_run_id, signature })).toString('base64url');
}
export function seedPreview(h: Harness, draft_id: string) {
  const preview_run_id = '0199cccc-cccc-7ccc-8ccc-cccccccccccc',
    issued_at = '2026-10-19T03:00:00.000Z',
    hash = 'a'.repeat(64);
  h.db
    .prepare(
      'INSERT INTO preview_run(preview_run_id,draft_id,actor_id,content_hash,issued_at,expires_at,consumed_at,denied_count,survivors,next_protected_window,runtime_snapshot,created_at,updated_at) VALUES(?,?,?,?,?,?,NULL,0,?,NULL,1,?,?)',
    )
    .run(
      preview_run_id,
      draft_id,
      instructor.actor_id,
      hash,
      issued_at,
      '2026-10-19T03:01:00.000Z',
      '[]',
      issued_at,
      issued_at,
    );
  const signature = createHmac('sha256', h.tokenSecret)
    .update(draft_id + hash + instructor.actor_id + issued_at)
    .digest('hex');
  return Buffer.from(JSON.stringify({ preview_run_id, signature })).toString('base64url');
}

// P5-FIX-4: seeds one freeze row (scope ALL, 03:00-05:00 campus clock default) for the lift tests.
// FIXTURE ASSUMPTION: the row follows the sqlite schema checks; activated_by is the first instructor.
export function seedFreeze(h: Harness, state: 'ACTIVE' | 'LIFTED' = 'ACTIVE') {
  const freeze_id = '0199eeee-eeee-7eee-8eee-eeeeeeeeeeee';
  const at = '2026-10-19T03:00:00.000Z';
  h.db
    .prepare(
      'INSERT INTO freeze(freeze_id,scope,subject_ids,node_class_ids,allowances,starts_at,ends_at,state,reason,lift_reason,activated_by,activated_by_role_tier,activated_at,supersedes,policy_version,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,NULL,1,?,?)',
    )
    .run(
      freeze_id,
      'ALL',
      '[]',
      '[]',
      '[]',
      at,
      '2026-10-19T05:00:00.000Z',
      state,
      'exam',
      state === 'LIFTED' ? 'exam finished' : null,
      instructor.actor_id,
      'INSTRUCTOR',
      at,
      at,
      at,
    );
  return freeze_id;
}

export function protectedWindow(overrides: Partial<{
  kind: string;
  starts_at: string;
  ends_at: string;
}> = {}) {
  return {
    kind: 'CLASS',
    starts_at: '2026-10-19T03:00:00.000Z',
    ends_at: '2026-10-19T04:00:00.000Z',
    ...overrides,
  };
}
export function timetableWindow(overrides: Partial<ReturnType<typeof protectedWindow> & {
  subject_id: string;
}> = {}) {
  return { ...protectedWindow(), subject_id: 'CS-340-CV', ...overrides };
}
export function catalogFacts(overrides: Record<string, unknown> = {}) {
  return { model_ref: 'small-24', min_vram_gb: 24, variants: [], ...overrides };
}
export function accessFacts(overrides: Record<string, unknown> = {}) {
  return { actor_id: session.actor_id, ...overrides };
}
