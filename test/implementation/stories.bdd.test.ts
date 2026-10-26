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
// BDD-mapped acceptance tests for annex stories 2.1, 2.2 and 2.3, driven through the real HTTP adapter.
// Local campus zone is America/Panama (UTC-05:00): Monday 10:30 local = 2026-10-19T15:30:00.000Z.
const MONDAY_1030 = '2026-10-19T15:30:00.000Z', MONDAY_1200 = '2026-10-19T17:00:00.000Z', MONDAY_1300 = '2026-10-19T18:00:00.000Z';
let dir: string, h: Runtime, server: Server, base: string, seq = 0;
const request = () => fixture<EvaluateRequestDto>('request');
async function boot(simulatedNow?: string) {
    dir = mkdtempSync(join(tmpdir(), 'm2-bdd-'));
    const c = config({ DATABASE_PATH: join(dir, 'policy.sqlite'), ...(simulatedNow ? { SIMULATED_NOW: simulatedNow } : {}) });
    h = createRuntime(c);
    server = createHttpServer(h, c, sessions());
    await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}
async function shutdown() {
    await new Promise<void>(resolve => server.close(() => resolve()));
    (h.store as SqliteStore).db.close();
    rmSync(dir, { recursive: true, force: true });
}
async function api(path: string, method = 'GET', body?: unknown, token = 'student-demo-token', key = `bdd-${++seq}`) {
    const response = await fetch(base + path, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Idempotency-Key': key }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json() };
}
const evaluate = (body: unknown, token?: string, key?: string) => api('/policy/decisions', 'POST', body, token, key);
const expectStructuredError = (r: { status: number; body: Record<string, unknown> }, status: number, code: string) => {
    expect(r.status).toBe(status);
    expect(r.body).toMatchObject({ code, http_status: status });
    expect(typeof r.body.message).toBe('string');
    expect(JSON.stringify(r.body)).not.toMatch(/stack|node_modules|\.ts:\d/);
};
describe('Story 2.1 — baseline GPU access evaluation', () => {
    beforeEach(() => boot());
    afterEach(shutdown);
    // Given student mateo entitled to CS-101, When he requests a 24GB workstation for a small model,
    // Then the outcome is ALLOW with the rule and a cited rationale.
    it('Given student mateo and a 24GB workstation request, When evaluated, Then ALLOW with "Standard student lab policy satisfied"', async () => {
        const r = await evaluate(request());
        expect(r.status).toBe(200);
        expect(r.body.outcome).toBe('ALLOW');
        expect(r.body.primary_rule_id).toBe('R-ALLOW-01');
        expect(r.body.rationale).toContain('Standard student lab policy satisfied');
        expect(r.body.citations).toContain('POL-TIER');
        expect(r.body.node_class_id).toBe('std-24');
        expect(r.body.originating_actor_id).toBe('mateo');
    });
    // Given a subject mateo is not entitled to, When he requests access, Then DENY citing the entitlement rule.
    it('Given no entitlement to the subject, When evaluated, Then DENY R-AUTH-01 citing the entitlement policy', async () => {
        const r = await evaluate({ ...request(), subject_id: 'MATH-999' });
        expect(r.status).toBe(200);
        expect(r.body).toMatchObject({ outcome: 'DENY', primary_rule_id: 'R-AUTH-01', cause: 'NOT_AUTHORIZED', admission: 'REJECTED' });
        expect(r.body.citations).toContain('POL-ENTITLE');
        expect(r.body.rationale).toContain('R-AUTH-01');
    });
    // Given an invalid request, When sent, Then a structured 4xx error (code, message) without a stack trace.
    it('Given a malformed or non-contract body, When sent, Then 400 structured error with code and message', async () => {
        const raw = await fetch(base + '/policy/decisions', { method: 'POST', headers: { Authorization: 'Bearer student-demo-token', 'Idempotency-Key': 'bad-json' }, body: '{' });
        expectStructuredError({ status: raw.status, body: await raw.json() }, 400, 'WIRE_SHAPE_INVALID');
        expectStructuredError(await evaluate({ ...request(), role: 'ADMIN' }), 400, 'WIRE_SHAPE_INVALID');
        expectStructuredError(await api('/policy/decisions', 'POST', request(), 'student-demo-token', ''), 400, 'IDEMPOTENCY_KEY_MISSING');
        expect(h.store.all('decision')).toHaveLength(0);
    });
    it('Given well-formed JSON with a non-positive GPU count, When sent, Then a journalled DENY R-VALID-01 (not an HTTP error)', async () => {
        const r = await evaluate({ ...request(), requested_gpu_count: 0 });
        expect(r.status).toBe(200);
        expect(r.body).toMatchObject({ outcome: 'DENY', primary_rule_id: 'R-VALID-01', cause: 'INVALID_REQUEST' });
        expect(h.store.all('decision')).toHaveLength(1);
    });
});
describe('Story 2.2 — time-window class protection', () => {
    afterEach(shutdown);
    // Given a class window CS-101 Monday 10:00–12:00 (fixtures/timetable.json).
    it('Given CS-101 Monday 10:00–12:00 and clock Monday 10:30, When mateo requests batch GPU work, Then DENY with the lab-class rationale and next window', async () => {
        await boot(MONDAY_1030);
        const r = await evaluate({ ...request(), workload_kind: 'BACKGROUND_BATCH' });
        expect(r.status).toBe(200);
        expect(r.body).toMatchObject({ outcome: 'DENY', primary_rule_id: 'R-LAB-01', cause: 'WINDOW_PROTECTED', evaluated_at: MONDAY_1030 });
        expect(r.body.rationale).toContain('GPU access restricted during scheduled lab class CS-101');
        expect(r.body.rationale).toContain(`next available ${MONDAY_1200}`);
        expect(r.body.next_actions).toEqual([`Retry at ${MONDAY_1200}`]);
        expect(r.body.citations).toEqual(expect.arrayContaining(['POL-LAB', 'SCHEDULE-2026-T5']));
    });
    // The window end is exclusive: at 12:00 sharp the class is over.
    it('Given the same window, When the clock is exactly 12:00, Then the request is allowed (end exclusive)', async () => {
        await boot(MONDAY_1200);
        const r = await evaluate({ ...request(), workload_kind: 'EVALUATION' });
        expect(r.status).toBe(200);
        expect(r.body).toMatchObject({ outcome: 'ALLOW', primary_rule_id: 'R-ALLOW-01' });
    });
    it('Given the same request outside the window (13:00), When evaluated, Then ALLOW', async () => {
        await boot(MONDAY_1300);
        const r = await evaluate({ ...request(), workload_kind: 'EVALUATION' });
        expect(r.body.outcome).toBe('ALLOW');
    });
    // Finding (ai-decision-log entry 12): the engine lets INTERACTIVE_INFERENCE through during class by design.
    it('Current behaviour: interactive inference is not blocked by the class window; only asynchronous work is', async () => {
        await boot(MONDAY_1030);
        const r = await evaluate(request());
        expect(r.body.primary_rule_id).not.toBe('R-LAB-01');
    });
});
describe('Story 2.3 — VRAM hardware tier restriction', () => {
    beforeEach(() => boot());
    afterEach(shutdown);
    const server48 = () => ({ ...request(), requested_vram_gb_per_gpu: 48 });
    // Given a Student, When they request the 48GB server for a model needing 8GB, Then DENY and suggest the 24GB workstation.
    it('Given a Student requesting the 48GB server for an 8GB model, When evaluated, Then DENY R-TIER-02 suggesting the 24GB workstation', async () => {
        const r = await evaluate(server48());
        expect(r.status).toBe(200);
        expect(r.body).toMatchObject({ outcome: 'DENY', primary_rule_id: 'R-TIER-02', cause: 'NOT_AUTHORIZED', node_class_id: 'dual-48' });
        expect(r.body.rationale).toContain('Workload fits standard 24GB workstation; server tier restricted');
        expect(r.body.rationale).toContain('std-24');
        expect(r.body.explanation.observed_values).toContainEqual({ fact_path: 'model.min_vram_gb', value: 8 });
        expect(r.body.explanation.observed_values).toContainEqual({ fact_path: 'request.requested_vram_gb_per_gpu', value: 48 });
        expect(r.body.citations).toContain('POL-TIER');
    });
    it('Given a Researcher or Instructor with the same request, When evaluated, Then R-TIER-02 does not deny', async () => {
        const researcher = await evaluate({ ...server48(), actor_ref: 'researcher' }, 'researcher-demo-token');
        const instructor = await evaluate({ ...server48(), actor_ref: 'rebecca' }, 'instructor-demo-token');
        for (const r of [researcher, instructor]) {
            expect(r.status).toBe(200);
            expect(r.body.primary_rule_id).not.toBe('R-TIER-02');
            expect(r.body.outcome).toBe('ALLOW');
            expect(r.body.node_class_id).toBe('dual-48');
        }
    });
    // vlm-70b needs 48GB and INSTRUCTOR. Finding (ai-decision-log entry 11): for a Student the role-minimum rule R-AUTH-02
    // fires before the R-TIER-03 variant substitution, so the q4 variant is never offered. R-TIER-02 does not deny.
    it('Given a model needing more than 24GB, When a Student requests it, Then it is not denied by R-TIER-02 (role minimum R-AUTH-02 applies first)', async () => {
        const r = await evaluate({ ...request(), model_ref: 'vlm-70b', requested_vram_gb_per_gpu: 48 });
        expect(r.status).toBe(200);
        expect(r.body).toMatchObject({ outcome: 'DENY', primary_rule_id: 'R-AUTH-02', cause: 'NOT_AUTHORIZED' });
        expect(r.body.primary_rule_id).not.toBe('R-TIER-02');
    });
    it('Given a model needing more than 24GB, When a Researcher requests the server, Then ALLOW on the 48GB class', async () => {
        const r = await evaluate({ ...request(), actor_ref: 'researcher', model_ref: 'vlm-70b', requested_vram_gb_per_gpu: 48 }, 'researcher-demo-token');
        expect(r.body).toMatchObject({ outcome: 'ALLOW', node_class_id: 'dual-48' });
    });
    it('Given the shipped simulated fleet fixture, Then it has 32 nodes: 31 x 24GB workstations and 1 server with 2 x 48GB', () => {
        expect(h.fleet).toHaveLength(32);
        expect(h.fleet.filter(n => n.gpu_count === 1 && n.vram_gb_per_gpu === 24)).toHaveLength(31);
        expect(h.fleet.filter(n => n.gpu_count === 2 && n.vram_gb_per_gpu === 48)).toHaveLength(1);
    });
});
describe('Error payloads follow the OpenAPI catalog', () => {
    beforeEach(() => boot());
    afterEach(shutdown);
    it('400 WIRE_SHAPE_INVALID for an unknown field', async () => {
        expectStructuredError(await evaluate({ ...request(), surprise: true }), 400, 'WIRE_SHAPE_INVALID');
    });
    it('401 UNAUTHENTICATED for an unknown bearer token', async () => {
        expectStructuredError(await api('/policy/rules', 'GET', undefined, 'forged-token'), 401, 'UNAUTHENTICATED');
    });
    it('403 ROLE_INSUFFICIENT when a student opens the freeze console', async () => {
        expectStructuredError(await api('/policy/freezes'), 403, 'ROLE_INSUFFICIENT');
    });
    it('404 for an unknown policy version, freeze and route', async () => {
        expectStructuredError(await api('/policy/versions/999'), 404, 'VERSION_NOT_FOUND');
        expectStructuredError(await api('/policy/freezes/no-such-freeze', 'GET', undefined, 'instructor-demo-token'), 404, 'FREEZE_NOT_FOUND');
        expectStructuredError(await api('/policy/unknown'), 404, 'WIRE_SHAPE_INVALID');
    });
    it('409 IDEMPOTENCY_BODY_MISMATCH when a key is reused with a different body', async () => {
        const first = await evaluate(request(), undefined, 'reused-key');
        expect(first.status).toBe(200);
        const second = await evaluate({ ...request(), expected_duration_min: 31 }, undefined, 'reused-key');
        expectStructuredError(second, 409, 'IDEMPOTENCY_BODY_MISMATCH');
        expect(h.store.all('decision')).toHaveLength(1);
    });
    it('503 TRANSACTION_ABORTED with retry hint when persistence faults, leaving nothing behind', async () => {
        h.fault = 'after-decision-insert';
        const r = await evaluate(request());
        expectStructuredError(r, 503, 'TRANSACTION_ABORTED');
        expect(r.body.retry_after_ms).toBe(2000);
        expect(h.store.all('decision')).toHaveLength(0);
    });
    // The OpenAPI catalog defines no 422: semantic problems are 400/409 or a journalled DENY (see ai-decision-log).
});
