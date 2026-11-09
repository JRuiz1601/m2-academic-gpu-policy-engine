import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { config } from '../../src/config.ts';
import { createRuntime, sessions, fixture } from '../../src/adapters/outbound/simulator.ts';
import { createHttpServer } from '../../src/adapters/inbound/http.ts';
import type { Runtime } from '../../src/ports/runtime.ts';
import type { SqliteStore } from '../../src/adapters/outbound/sqlite.ts';
import type { EvaluateRequestDto } from '../../src/domain/dto.ts';

// Flow C (test-after) regressions found by the coverage gap analysis of the Impl-1 HTTP adapter and freeze use cases.
let dir: string, h: Runtime, server: Server, base: string, now: string;
async function call(path: string, method = 'GET', body?: unknown, token = 'student-demo-token') {
  const r = await fetch(base + path, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Idempotency-Key': 'edge-key' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const text = await r.text();
  return { status: r.status, text, body: JSON.parse(text) as Record<string, unknown> };
}
beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'm2-edge-'));
  const c = config({ DATABASE_PATH: join(dir, 'policy.sqlite'), ALLOW_CLOCK_OVERRIDE: 'true' });
  now = c.simulatedNow;
  h = createRuntime(c);
  server = createHttpServer(h, c, sessions());
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterEach(async () => {
  await new Promise<void>((resolve, reject) => server.close(e => (e ? reject(e) : resolve())));
  (h.store as SqliteStore).db.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('structured errors at the HTTP edge', () => {
  it('GET on the decisions route is a 405 with the standard error shape', async () => {
    const r = await call('/policy/decisions');
    expect(r.status).toBe(405);
    expect(r.body.code).toBe('WIRE_SHAPE_INVALID');
  });
  it('an unknown route is a structured 404', async () => {
    const r = await call('/policy/nope');
    expect(r.status).toBe(404);
    expect(r.body.message).toBe('Route not found');
  });
  it('a malformed evaluated_at_override on preview is rejected for an instructor', async () => {
    const r = await call('/policy/decisions/preview?evaluated_at_override=yesterday', 'POST', fixture<EvaluateRequestDto>('request'), 'instructor-demo-token');
    expect(r.status).toBe(400);
    expect(r.body.code).toBe('WIRE_SHAPE_INVALID');
  });
  it('a student cannot use the clock override', async () => {
    const r = await call('/policy/decisions/preview?evaluated_at_override=2026-10-19T03:00:00.000Z', 'POST', fixture<EvaluateRequestDto>('request'));
    expect(r.status).toBe(403);
    expect(r.body.code).toBe('CLOCK_OVERRIDE_FORBIDDEN');
  });
  it('version lookups reject a bad since_seq and report an unknown version', async () => {
    expect((await call('/policy/versions?since_seq=abc')).status).toBe(400);
    expect((await call('/policy/versions?since_seq=0')).status).toBe(400);
    const r = await call('/policy/versions/999');
    expect(r.status).toBe(404);
    expect(r.body.code).toBe('VERSION_NOT_FOUND');
  });
  it('freeze reads reject an unknown filter value and report an unknown freeze', async () => {
    expect((await call('/policy/freezes?state=BOGUS', 'GET', undefined, 'instructor-demo-token')).status).toBe(400);
    expect((await call('/policy/freezes?scope=GALAXY', 'GET', undefined, 'instructor-demo-token')).status).toBe(400);
    const r = await call('/policy/freezes/does-not-exist', 'GET', undefined, 'instructor-demo-token');
    expect(r.status).toBe(404);
    expect(r.body.code).toBe('FREEZE_NOT_FOUND');
  });
  it('freeze actions need an operator session', async () => {
    const r = await call('/policy/freezes', 'POST', {}, 'student-demo-token');
    expect(r.status).toBe(403);
    expect(r.body.code).toBe('ROLE_INSUFFICIENT');
    const researcher = await call('/policy/freezes', 'GET', undefined, 'researcher-demo-token');
    expect(researcher.status).toBe(403);
  });
});

describe('freeze draft validation', () => {
  const draft = (over: Record<string, unknown>) => ({ scope: 'ALL', subject_ids: [], node_class_ids: [], allowances: [], starts_at: now, ends_at: '2026-10-19T05:00:00.000Z', reason: 'exam', ...over });
  it.each([
    ['a blank reason', { reason: '   ' }, 'MISSING_REASON'],
    ['an end before the start', { starts_at: '2026-10-19T05:00:00.000Z', ends_at: '2026-10-19T04:00:00.000Z' }, 'WINDOW_INVALID_RANGE'],
    ['a window that ended before now', { starts_at: '2026-10-18T01:00:00.000Z', ends_at: '2026-10-18T02:00:00.000Z' }, 'WINDOW_IN_PAST'],
  ])('rejects %s with %s and stores no draft', async (_name, over, code) => {
    const r = await call('/policy/freezes', 'POST', draft(over), 'instructor-demo-token');
    expect(r.status).toBe(400);
    expect(r.body.code).toBe(code);
    expect(h.store.all('freeze_draft')).toHaveLength(0);
  });
  it('a lift without a reason and an activation without a preview token are structured errors', async () => {
    const created = await call('/policy/freezes', 'POST', draft({}), 'instructor-demo-token');
    expect(created.status).toBe(201);
    const noToken = await call(`/policy/freezes/${created.body.draft_id}/activate`, 'POST', { reason: 'exam' }, 'instructor-demo-token');
    expect(noToken.status).toBe(409);
    expect(noToken.body.code).toBe('TOKEN_ABSENT');
    const lift = await call('/policy/freezes/unknown/lift', 'POST', {}, 'instructor-demo-token');
    expect([400, 404]).toContain(lift.status);
    expect(lift.text).not.toMatch(/node_modules|\.ts:\d+/);
  });
});
