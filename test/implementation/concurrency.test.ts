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
import type { Config } from '../../src/config.ts';
import type { SqliteStore } from '../../src/adapters/outbound/sqlite.ts';
import type { EvaluateRequestDto } from '../../src/domain/dto.ts';

// Story 2.5 concurrency hammer: real HTTP, Promise.all, assertions on database rows.
let dir: string, h: Runtime, c: Config, server: Server, base: string;
const baseRequest = () => fixture<EvaluateRequestDto>('request');
async function post(path: string, body: unknown, key?: string, token = 'student-demo-token') {
  const r = await fetch(base + path, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}) }, body: JSON.stringify(body) });
  return { status: r.status, text: await r.text() };
}
beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'm2-conc-'));
  c = config({ DATABASE_PATH: join(dir, 'policy.sqlite') });
  h = createRuntime(c);
  // Yield to the macrotask queue inside a fact read (an event turn, not a timer) so that concurrent use cases genuinely interleave.
  const read = h.telemetry.read.bind(h.telemetry);
  h.telemetry.read = async (port, context) => {
    await new Promise<void>(resolve => setImmediate(resolve));
    return read(port, context);
  };
  server = createHttpServer(h, c, sessions());
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterEach(async () => {
  await new Promise<void>((resolve, reject) => server.close(e => (e ? reject(e) : resolve())));
  (h.store as SqliteStore).db.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('Concurrency hammer', () => {
  it('50 parallel requests with the SAME Idempotency-Key store exactly one decision and return byte-identical responses', async () => {
    const results = await Promise.all(Array.from({ length: 50 }, () => post('/policy/decisions', baseRequest(), 'same-key')));
    expect(results.every(r => r.status === 200)).toBe(true);
    expect(new Set(results.map(r => r.text)).size).toBe(1);
    expect(h.store.all('decision')).toHaveLength(1);
    expect(h.store.all('idempotency_key')).toHaveLength(1);
    expect(h.store.all('decision_outbox', { event_type: 'policy.decision.v1' })).toHaveLength(1);
  });

  it('100 parallel requests with distinct keys produce 100 distinct decisions, no 5xx, and one outbox row each', async () => {
    const results = await Promise.all(Array.from({ length: 100 }, (_, i) => post('/policy/decisions', { ...baseRequest(), request_id: `req-${i}`, request_chain_id: `chain-${i}` }, `key-${i}`)));
    expect(results.filter(r => r.status >= 500)).toHaveLength(0);
    expect(results.every(r => r.status === 200)).toBe(true);
    const ids = new Set(results.map(r => (JSON.parse(r.text) as { decision_id: string }).decision_id));
    expect(ids.size).toBe(100);
    const decisions = h.store.all('decision');
    expect(decisions).toHaveLength(100);
    expect(h.store.all('decision_outbox', { event_type: 'policy.decision.v1' })).toHaveLength(decisions.length);
  });

  it('two simultaneous activations of the same freeze draft leave exactly one ACTIVE freeze', async () => {
    const token = 'instructor-demo-token';
    const draft = JSON.parse((await post('/policy/freezes', { scope: 'ALL', subject_ids: [], node_class_ids: [], allowances: [], starts_at: c.simulatedNow, ends_at: '2026-10-19T05:00:00.000Z', reason: 'exam' }, undefined, token)).text) as { draft_id: string };
    const preview = JSON.parse((await post('/policy/freezes/preview', { draft_id: draft.draft_id }, undefined, token)).text) as { preview_token: string };
    const activate = () => post(`/policy/freezes/${draft.draft_id}/activate`, { reason: 'exam', preview_token: preview.preview_token }, undefined, token);
    const [a, b] = await Promise.all([activate(), activate()]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    expect(h.store.all('freeze', { state: 'ACTIVE' })).toHaveLength(1);
    expect(h.store.all('decision_outbox', { event_type: 'policy.freeze.activated.v1' })).toHaveLength(1);
  });

  it('two simultaneous activations of different drafts with the same scope leave exactly one ACTIVE freeze', async () => {
    const token = 'instructor-demo-token';
    const arm = async () => {
      const d = JSON.parse((await post('/policy/freezes', { scope: 'ALL', subject_ids: [], node_class_ids: [], allowances: [], starts_at: c.simulatedNow, ends_at: '2026-10-19T05:00:00.000Z', reason: 'exam' }, undefined, token)).text) as { draft_id: string };
      const p = JSON.parse((await post('/policy/freezes/preview', { draft_id: d.draft_id }, undefined, token)).text) as { preview_token: string };
      return () => post(`/policy/freezes/${d.draft_id}/activate`, { reason: 'exam', preview_token: p.preview_token }, undefined, token);
    };
    const [first, second] = [await arm(), await arm()];
    const results = await Promise.all([first(), second()]);
    expect(results.map(r => r.status).sort()).toEqual([200, 409]);
    expect(h.store.all('freeze', { state: 'ACTIVE' })).toHaveLength(1);
  });
});
