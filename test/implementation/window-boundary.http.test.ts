import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { config } from '../../src/config.ts';
import { createRuntime, sessions } from '../../src/adapters/outbound/simulator.ts';
import { createHttpServer } from '../../src/adapters/inbound/http.ts';
import { TimeDilationClock } from '../../src/adapters/outbound/time-dilation-clock.ts';
import type { Runtime } from '../../src/ports/runtime.ts';
import type { SqliteStore } from '../../src/adapters/outbound/sqlite.ts';

// Story 2.4 acceptance (Flow A, ATDD). Campus-local 06:00:00 (America/Panama, UTC-05:00) = 11:00:00Z.
let dir: string, h: Runtime, server: Server, base: string, clock: TimeDilationClock;
const at = (hhmmss: string) => `2026-10-19T${hhmmss}.000Z`;
const job = { job_ref: 'night-batch-1', workload_kind: 'BACKGROUND_BATCH', approved_policy: 'NIGHT' };
async function boundary(body: unknown, token = 'student-demo-token') {
  const r = await fetch(base + '/policy/window-boundary', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: r.status, body: await r.json() };
}
beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'm2-story24-'));
  const c = config({ DATABASE_PATH: join(dir, 'policy.sqlite') });
  h = createRuntime(c);
  clock = new TimeDilationClock(at('10:00:00'));
  h.clock = clock;
  server = createHttpServer(h, c, sessions());
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterEach(async () => {
  await new Promise<void>((resolve, reject) => server.close(e => (e ? reject(e) : resolve())));
  (h.store as SqliteStore).db.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('Story 2.4 Midnight Window Rollover over HTTP', () => {
  it('at 05:55:00 an active night batch job gets EVICT_WARNING with 5 minutes and hard deadline 06:00:00', async () => {
    clock.advanceTo(at('10:55:00'));
    const r = await boundary(job);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ action: 'EVICT_WARNING', minutes_remaining: 5, hard_deadline: '06:00:00' });
  });
  it('at 05:54:59 there is no warning yet', async () => {
    clock.advanceTo(at('10:54:59'));
    const r = await boundary(job);
    expect(r.status).toBe(200);
    expect(r.body.action).toBe('CONTINUE');
  });
  it('fast-forwarding the clock one second turns CONTINUE into EVICT_WARNING', async () => {
    clock.advanceTo(at('10:54:59'));
    expect((await boundary(job)).body.action).toBe('CONTINUE');
    clock.advanceBy(1000);
    expect((await boundary(job)).body.action).toBe('EVICT_WARNING');
  });
  it('at exactly 06:00:00 the job is past the boundary and is evicted', async () => {
    clock.advanceTo(at('11:00:00'));
    const r = await boundary(job);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ action: 'EVICT', minutes_remaining: 0, hard_deadline: '06:00:00' });
  });
  it('a +30 min extension at 05:59:00 is denied citing the 08:00:00 class start', async () => {
    clock.advanceTo(at('10:59:00'));
    const r = await boundary({ ...job, extension_minutes: 30 });
    expect(r.status).toBe(200);
    expect(r.body.action).toBe('DENY');
    expect(r.body.rule_id).toBe('R-BOUND-01');
    expect(r.body.reason).toContain('Scheduled laboratory classes begin at 08:00:00');
  });
  it('an extension that ends before 06:00:00 is allowed', async () => {
    clock.advanceTo(at('10:20:00'));
    const r = await boundary({ ...job, extension_minutes: 30 });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ action: 'EXTEND_ALLOWED', hard_deadline: '06:00:00' });
  });
  it('rejects malformed bodies with a structured WIRE_SHAPE_INVALID error', async () => {
    for (const bad of [{ ...job, approved_policy: 'DAY' }, { ...job, extension_minutes: -5 }, { job_ref: 'x' }, { ...job, surprise: true }]) {
      const r = await boundary(bad);
      expect(r.status).toBe(400);
      expect(r.body.code).toBe('WIRE_SHAPE_INVALID');
    }
  });
  it('requires a session', async () => {
    const r = await fetch(base + '/policy/window-boundary', { method: 'POST', body: JSON.stringify(job) });
    expect(r.status).toBe(401);
  });
});
