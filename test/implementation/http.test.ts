import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse } from 'yaml';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { config } from '../../src/config.ts';
import { createRuntime, sessions, fixture } from '../../src/adapters/outbound/simulator.ts';
import { createHttpServer } from '../../src/adapters/inbound/http.ts';
import type { Runtime } from '../../src/ports/runtime.ts';
import type { Config } from '../../src/config.ts';
import type { SqliteStore } from '../../src/adapters/outbound/sqlite.ts';
import type { EvaluateRequestDto } from '../../src/domain/dto.ts';
type Schema = {
    $ref?: string;
    oneOf?: Schema[];
    allOf?: Schema[];
    type?: string | string[];
    enum?: unknown[];
    const?: unknown;
    required?: string[];
    properties?: Record<string, Schema>;
    additionalProperties?: boolean;
    items?: Schema;
    pattern?: string;
    minLength?: number;
    minimum?: number;
    maximum?: number;
    minItems?: number;
};
const spec = parse(readFileSync('planning/detailed-design/schemas/openapi.yaml', 'utf8'));
// General schema assertions over the upstream schemas, independent of implementation DTOs.
function matches(value: unknown, schema: Schema): boolean {
    if (schema.$ref)
        return matches(value, spec.components.schemas[schema.$ref.split('/').at(-1)!]);
    if (schema.oneOf)
        return schema.oneOf.filter(s => matches(value, s)).length === 1;
    if (schema.allOf && !schema.allOf.every(s => matches(value, s)))
        return false;
    if (schema.enum && !schema.enum.some(x => x === value))
        return false;
    if ('const' in schema && schema.const !== value)
        return false;
    const types = schema.type === undefined ? [] : Array.isArray(schema.type) ? schema.type : [schema.type];
    const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
    if (types.length && !types.some(t => t === type || t === 'integer' && typeof value === 'number' && Number.isInteger(value)))
        return false;
    if (typeof value === 'string' && (schema.pattern && !new RegExp(schema.pattern).test(value) || schema.minLength !== undefined && value.length < schema.minLength))
        return false;
    if (typeof value === 'number' && (schema.minimum !== undefined && value < schema.minimum || schema.maximum !== undefined && value > schema.maximum))
        return false;
    if (Array.isArray(value) && (schema.minItems !== undefined && value.length < schema.minItems || schema.items && !value.every(x => matches(x, schema.items!))))
        return false;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const obj = value as Record<string, unknown>;
        if (schema.required?.some(k => !(k in obj)))
            return false;
        if (schema.additionalProperties === false && Object.keys(obj).some(k => !schema.properties?.[k]))
            return false;
        for (const [k, s] of Object.entries(schema.properties ?? {}))
            if (k in obj && !matches(obj[k], s))
                return false;
    }
    return true;
}
const conforms = (name: string, value: unknown) => expect(matches(value, spec.components.schemas[name]), `${name}: ${JSON.stringify(value)}`).toBe(true);
let dir: string, h: Runtime, c: Config, server: Server, base: string;
const request = () => fixture<EvaluateRequestDto>('request');
async function start() {
    server = createHttpServer(h, c, sessions());
    await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}
async function stop() {
    await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
}
async function api(path: string, method = 'GET', body?: unknown, token = 'student-demo-token', key = 'http-key') {
    const response = await fetch(base + path, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Idempotency-Key': key }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json() };
}
async function raw(path: string, body: unknown, key: string, token = 'student-demo-token') {
    const response = await fetch(base + path, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify(body) });
    return { status: response.status, text: await response.text() };
}
beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'm2-impl1-'));
    c = config({ DATABASE_PATH: join(dir, 'policy.sqlite'), ALLOW_CLOCK_OVERRIDE: 'true' });
    h = createRuntime(c);
    await start();
});
afterEach(async () => {
    if (server?.listening)
        await stop();
    (h?.store as SqliteStore)?.db.close();
    rmSync(dir, { recursive: true, force: true });
});
describe('HTTP, contracts and durable state', () => {
    it('serves the responsive local console',async()=>{const r=await fetch(base+'/');expect(r.status).toBe(200);const html=await r.text();expect(html).toContain('Evaluar solicitud');expect(html).toContain('Confirmar y activar congelación');expect(html).toContain('aria-live');});
    it('health and readiness are public; protected routes reject forged tokens', async () => {
        for (const path of ['/health', '/ready']) {
            const r = await api(path, 'GET', undefined, '');
            expect(r.status).toBe(200);
            conforms(path === '/health' ? 'HealthResponseDto' : 'ReadyResponseDto', r.body);
        }
        const r = await api('/policy/rules', 'GET', undefined, 'invented');
        expect(r.status).toBe(401);
        conforms('ErrorBodyDto', r.body);
    });
    it('evaluates through the real HTTP adapter and conforms to the complete Decision schema', async () => {
        const r = await api('/policy/decisions', 'POST', request());
        expect(r.status).toBe(200);
        expect(r.body.outcome).toBe('ALLOW');
        conforms('DecisionDto', r.body);
        expect(h.store.all('decision_outbox')).toHaveLength(1);
    });
    it('decision survives process restart and replay is byte equivalent', async () => {
        const rawFirst = await raw('/policy/decisions', request(), 'raw-restart');
        const first = await api('/policy/decisions', 'POST', request());
        await stop();
        (h.store as SqliteStore).db.close();
        h = createRuntime(c);
        await start();
        const replay = await api('/policy/decisions', 'POST', request());
        expect(replay).toEqual(first);
        const rawReplay = await raw('/policy/decisions', request(), 'raw-restart');
        expect(rawReplay.status).toBe(rawFirst.status);
        expect(rawReplay.text).toBe(rawFirst.text);
        expect(h.store.all('decision')).toHaveLength(2);
    });
    it('same-process replay returns the identical raw response text', async () => {
        const first = await raw('/policy/decisions', request(), 'raw-same');
        const replay = await raw('/policy/decisions', request(), 'raw-same');
        expect(first.status).toBe(200);
        expect(replay.text).toBe(first.text);
        expect(h.store.all('decision')).toHaveLength(1);
    });
    it('changed exam_binding with the same key returns 409 without another decision', async () => {
        await api('/policy/decisions', 'POST', request());
        const r = await api('/policy/decisions', 'POST', { ...request(), exam_binding: 'different' });
        expect(r.status).toBe(409);
        expect(r.body.code).toBe('IDEMPOTENCY_BODY_MISMATCH');
        conforms('ErrorBodyDto', r.body);
        expect(h.store.all('decision')).toHaveLength(1);
    });
    it('concurrent HTTP retries commit one decision', async () => {
        const rs = await Promise.all(Array.from({ length: 8 }, () => api('/policy/decisions', 'POST', request())));
        expect(rs.every(r => r.status === 200)).toBe(true);
        expect(new Set(rs.map(r => r.body.decision_id)).size).toBe(1);
        expect(h.store.all('decision_outbox')).toHaveLength(1);
    });
    it('malformed JSON and extra request fields return structured 400 errors', async () => {
        const raw = await fetch(base + '/policy/decisions', { method: 'POST', headers: { Authorization: 'Bearer student-demo-token' }, body: '{' });
        expect(raw.status).toBe(400);
        conforms('ErrorBodyDto', await raw.json());
        const r = await api('/policy/decisions', 'POST', { ...request(), role: 'ADMIN' });
        expect(r.status).toBe(400);
        expect(h.store.all('decision')).toHaveLength(0);
    });
    it('actor spoof is a journalled decision; unknown model is a cited denial', async () => {
        const spoof = await api('/policy/decisions', 'POST', { ...request(), actor_ref: 'rebecca' });
        expect(spoof.status).toBe(200);
        expect(spoof.body.cause).toBe('INVALID_REQUEST');
        conforms('DecisionDto', spoof.body);
        const unknown = await api('/policy/decisions', 'POST', { ...request(), model_ref: 'missing' }, 'student-demo-token', 'missing');
        expect(unknown.body.cause).toBe('MODEL_NOT_FOUND');
        conforms('DecisionDto', unknown.body);
    });
    it('preview and gated clock override leave no durable evaluation writes', async () => {
        const denied = await api('/policy/decisions/preview?evaluated_at_override=2026-10-19T15:30:00.000Z', 'POST', request());
        expect(denied.status).toBe(403);
        const r = await api('/policy/decisions/preview?evaluated_at_override=2026-10-19T15:30:00.000Z', 'POST', { ...request(), actor_ref: 'rebecca', workload_kind: 'BACKGROUND_BATCH' }, 'instructor-demo-token');
        expect(r.status).toBe(200);
        expect(r.body.primary_rule_id).toBe('R-LAB-01');
        conforms('DecisionDto', r.body);
        for (const t of ['decision', 'idempotency_key', 'fact_snapshot', 'decision_outbox'])
            expect(h.store.all(t)).toHaveLength(0);
    });
    it('full freeze lifecycle validates draft, preview, activation, read, list and lift contracts', async () => {
        const token = 'instructor-demo-token';
        const d = await api('/policy/freezes', 'POST', { scope: 'ALL', subject_ids: [], node_class_ids: [], allowances: [], starts_at: c.simulatedNow, ends_at: '2026-10-19T05:00:00.000Z', reason: 'exam' }, token);
        expect(d.status).toBe(201);
        conforms('CreateFreezeDraftResponseDto', d.body);
        const p = await api('/policy/freezes/preview', 'POST', { draft_id: d.body.draft_id }, token);
        expect(p.status).toBe(200);
        conforms('PreviewFreezeResponseDto', p.body);
        const a = await api(`/policy/freezes/${d.body.draft_id}/activate`, 'POST', { reason: 'exam', preview_token: p.body.preview_token }, token);
        expect(a.status).toBe(200);
        conforms('ActivateFreezeResponseDto', a.body);
        const item = await api(`/policy/freezes/${a.body.freeze_id}`, 'GET', undefined, token);
        expect(item.status).toBe(200);
        conforms('FreezeDto', item.body);
        const list = await api('/policy/freezes?state=ACTIVE', 'GET', undefined, token);
        conforms('FreezeListResponseDto', list.body);
        expect(list.body.count).toBe(1);
        const frozen = await api('/policy/decisions', 'POST', request());
        expect(frozen.body.cause).toBe('FREEZE_ACTIVE');
        const lifted = await api(`/policy/freezes/${a.body.freeze_id}/lift`, 'POST', { lift_reason: 'exam finished' }, token);
        expect(lifted.status).toBe(200);
        conforms('LiftFreezeResponseDto', lifted.body);
        const readable = await api(`/policy/freezes/${a.body.freeze_id}`, 'GET', undefined, token);
        expect(readable.body.lifted_by).toBe('rebecca');
    });
    it('version routes and publish match upstream shapes', async () => {
        const token = 'instructor-demo-token';
        for (const [path, name] of [['/policy/rules', 'RulesResponseDto'], ['/policy/versions', 'VersionsResponseDto'], ['/policy/versions/1', 'VersionDetailResponseDto']]) {
            const r = await api(path);
            expect(r.status).toBe(200);
            conforms(name, r.body);
        }
        const r = await api('/policy/versions/publish', 'POST', {}, token);
        expect(r.status).toBe(201);
        conforms('VersionManifestDto', r.body);
        expect(r.body.published_seq).toBe(2);
        const bad = await api('/policy/versions/100');
        expect(bad.status).toBe(404);
        conforms('ErrorBodyDto', bad.body);
    });
    it('malformed fact is fail closed and poisons never persist', async () => {
        h.telemetry.read = async (port) => {
            h.telemetry.calls.push(port);
            if (port === 'quota')
                return { remaining: 0.5, email: 'secret@example.edu' };
            return undefined;
        };
        const r = await api('/policy/decisions', 'POST', request());
        expect(r.body.cause).toBe('DEPENDENCY_UNAVAILABLE');
        conforms('DecisionDto', r.body);
        expect(JSON.stringify(h.store.all('fact_snapshot'))).not.toContain('secret@example.edu');
    });
    it('transaction faults roll back keys, snapshots, decisions and outbox', async () => {
        h.fault = 'after-decision-insert';
        const r = await api('/policy/decisions', 'POST', request());
        expect(r.status).toBe(503);
        for (const t of ['decision', 'idempotency_key', 'fact_snapshot', 'decision_outbox'])
            expect(h.store.all(t)).toHaveLength(0);
    });
    it('immutable records and stored versions refuse SQL mutations', async () => {
        await api('/policy/decisions', 'POST', request());
        const db = (h.store as SqliteStore).db;
        for (const table of ['decision', 'fact_snapshot', 'decision_outbox', 'policy_version', 'idempotency_key'])
            expect(() => db.exec(`DELETE FROM ${table}`)).toThrow();
        expect(() => db.exec("UPDATE policy_version SET engine_version='bad' WHERE published_seq=1")).toThrow();
    });
    it('scope normalization makes duplicate active freezes conflict', async () => {
        const token = 'instructor-demo-token';
        const b = { scope: 'SUBJECT', subject_ids: ['B', 'A', 'B'], node_class_ids: [], allowances: [], starts_at: c.simulatedNow, ends_at: '2026-10-19T05:00:00.000Z', reason: 'exam' };
        async function arm(subject_ids: string[]) {
            const d = await api('/policy/freezes', 'POST', { ...b, subject_ids }, token);
            const p = await api('/policy/freezes/preview', 'POST', { draft_id: d.body.draft_id }, token);
            return api(`/policy/freezes/${d.body.draft_id}/activate`, 'POST', { reason: 'exam', preview_token: p.body.preview_token }, token);
        }
        expect((await arm(b.subject_ids)).status).toBe(200);
        expect((await arm(['A', 'B'])).status).toBe(409);
        expect(h.store.all('freeze')).toHaveLength(1);
    });
    it('readiness returns named failure when simulated bus is down', async () => {
        h.telemetry.read = async () => {
            throw Error('offline');
        };
        const r = await api('/ready');
        expect(r.status).toBe(503);
        expect(r.body.failing_check).toBe('bus');
        conforms('ErrorBodyDto', r.body);
    });
});
describe('Policy console alias (story 2.6)', () => {
    it('serves the same console at /admin/policy-console as at /, read-only', async () => {
        const root = await fetch(base + '/'), alias = await fetch(base + '/admin/policy-console');
        expect(alias.status).toBe(200);
        expect(alias.headers.get('content-type')).toContain('text/html');
        expect(await alias.text()).toBe(await root.text());
        const post = await fetch(base + '/admin/policy-console', { method: 'POST' });
        expect(post.status).toBe(401);
    });
});
