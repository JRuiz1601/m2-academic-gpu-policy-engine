import { readFileSync } from 'node:fs';
import { createServer, type IncomingMessage } from 'node:http';
import type { Runtime, Session, Row } from '../../ports/runtime.ts';
import type { EvaluateRequestDto, CreateFreezeDraftRequestDto } from '../../domain/dto.ts';
import { evaluateRequest, createFreezeDraft, previewFreeze, activateFreeze, liftFreeze, publishVersion, manifest, operator } from '../../application/service.ts';
import { PolicyError, fail } from '../../application/errors.ts';
import { validateRegistry } from '../../domain/evaluate.ts';
import { RULES, rank } from '../../domain/registry.ts';
import type { Config } from '../../config.ts';
async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
    let size = 0;
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
        size += chunk.length;
        if (size > 65536)
            fail('WIRE_SHAPE_INVALID');
        chunks.push(chunk);
    }
    try {
        const text = Buffer.concat(chunks).toString('utf8'), value = text ? JSON.parse(text) : {};
        if (!value || typeof value !== 'object' || Array.isArray(value))
            fail('WIRE_SHAPE_INVALID');
        return value;
    }
    catch {
        fail('WIRE_SHAPE_INVALID');
    }
}
function shape(b: Record<string, unknown>, allowed: string[], required: string[] = allowed) {
    if (Object.keys(b).some(k => !allowed.includes(k)) || required.some(k => !(k in b)))
        fail('WIRE_SHAPE_INVALID');
}
function freezeView(h: Runtime, row: Row, at: string): Record<string, unknown> {
    const { created_at, updated_at, ...view } = row;
    return { ...view, subject_ids: JSON.parse(String(row.subject_ids)), node_class_ids: JSON.parse(String(row.node_class_ids)), allowances: JSON.parse(String(row.allowances)), state: row.state === 'ACTIVE' && String(row.ends_at) <= at ? 'EXPIRED' : row.state, lifted_by: h.store.all('audit_events', { freeze_id: row.freeze_id, action: 'FREEZE_LIFTED' })[0]?.actor_id ?? null, successor_freeze_id: h.store.one('freeze', { supersedes: row.freeze_id })?.freeze_id ?? null };
}
export function createHttpServer(h: Runtime, c: Config, tokens: Record<string, Session>) {
    return createServer(async (req, res) => {
        const send = (status: number, value: unknown) => {
            res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
            res.end(JSON.stringify(value));
        };
        try {
            const url = new URL(req.url ?? '/', 'http://localhost'), path = url.pathname, method = req.method ?? 'GET';
            if (method === 'GET' && path === '/') {
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
                res.end(readFileSync(new URL('./web/index.html', import.meta.url)));
                return;
            }
            if (method === 'GET' && path === '/health')
                return send(200, { status: 'OK' });
            if (method === 'GET' && path === '/ready') {
                const checks: {
                    check_name: string;
                    ok: boolean;
                }[] = [];
                try {
                    validateRegistry(RULES, h.store.all('policy_document').map(d => String(d.doc_id)));
                    checks.push({ check_name: 'registry', ok: true });
                }
                catch {
                    checks.push({ check_name: 'registry', ok: false });
                }
                checks.push({ check_name: 'clock', ok: Number.isFinite(Date.parse(h.clock.read())) });
                try {
                    await h.store.exclusive(async () => h.store.transaction(() => {
                    }));
                    checks.push({ check_name: 'store', ok: true });
                }
                catch {
                    checks.push({ check_name: 'store', ok: false });
                }
                try {
                    checks.push({ check_name: 'bus', ok: (await h.telemetry.read('bus') as {
                            status?: string;
                        })?.status === 'AVAILABLE' });
                }
                catch {
                    checks.push({ check_name: 'bus', ok: false });
                }
                const failed = checks.find(x => !x.ok);
                if (failed) {
                    const e = new PolicyError('READY_CHECK_FAILED', 503);
                    e.failing_check = failed.check_name;
                    throw e;
                }
                return send(200, { status: 'READY', checks });
            }
            const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1], session = token ? tokens[token] : undefined;
            if (!session)
                fail('UNAUTHENTICATED', 401);
            if (path === '/policy/decisions' || path === '/policy/decisions/preview') {
                if (method !== 'POST')
                    return send(405, { code: 'WIRE_SHAPE_INVALID', http_status: 405, message: 'Method not allowed', retry_after_ms: null, failing_port: null, stage: null, failing_check: null });
                const r = await body(req) as unknown as EvaluateRequestDto, preview = path.endsWith('/preview'), override = url.searchParams.get('evaluated_at_override');
                if (override && (!preview || !c.allowClockOverride || rank(session.role_tier) < rank('INSTRUCTOR')))
                    fail('CLOCK_OVERRIDE_FORBIDDEN', 403);
                if (override && (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(override) || !Number.isFinite(Date.parse(override))))
                    fail('WIRE_SHAPE_INVALID');
                const runtime = override ? { ...h, clock: { read: () => override } } : h;
                return send(200, await evaluateRequest(runtime, { request: r, key: String(req.headers['idempotency-key'] ?? ''), session }, preview));
            }
            if (method === 'GET' && path === '/policy/rules') {
                const v = url.searchParams.get('version'), m = manifest(h, v ? Number(v) : undefined);
                return send(200, { published_seq: m.published_seq, rules: RULES });
            }
            if (method === 'GET' && path === '/policy/versions') {
                const since = url.searchParams.get('since_seq');
                if (since && (!Number.isInteger(Number(since)) || Number(since) < 1))
                    fail('WIRE_SHAPE_INVALID');
                return send(200, { versions: h.store.all('policy_version').filter(v => Number(v.published_seq) > Number(since ?? 0)).sort((a, b) => Number(a.published_seq) - Number(b.published_seq)).map(v => manifest(h, Number(v.published_seq))) });
            }
            if (method === 'POST' && path === '/policy/versions/publish') {
                shape(await body(req), [], []);
                return send(201, await publishVersion(h, { session }));
            }
            const v = path.match(/^\/policy\/versions\/(\d+)$/);
            if (method === 'GET' && v) {
                const m = manifest(h, Number(v[1]));
                return send(200, { manifest: m, rules: RULES, policy_documents: h.store.all('policy_document').map(({ created_at, updated_at, ...d }) => d) });
            }
            if (path.startsWith('/policy/freezes'))
                operator(session);
            if (method === 'POST' && path === '/policy/freezes') {
                const b = await body(req);
                shape(b, ['scope', 'subject_ids', 'node_class_ids', 'allowances', 'starts_at', 'ends_at', 'reason']);
                return send(201, await createFreezeDraft(h, b as unknown as CreateFreezeDraftRequestDto, session));
            }
            if (method === 'POST' && path === '/policy/freezes/preview') {
                const b = await body(req);
                shape(b, ['draft_id']);
                if (typeof b.draft_id !== 'string')
                    fail('WIRE_SHAPE_INVALID');
                return send(200, await previewFreeze(h, { draft_id: b.draft_id, session }));
            }
            const action = path.match(/^\/policy\/freezes\/([^/]+)\/(activate|lift)$/);
            if (method === 'POST' && action) {
                const b = await body(req);
                if (action[2] === 'lift') {
                    shape(b, ['lift_reason'], []);
                    if (typeof b.lift_reason !== 'string' && b.lift_reason !== undefined)
                        fail('WIRE_SHAPE_INVALID');
                    return send(200, await liftFreeze(h, { freeze_id: action[1], session, lift_reason: String(b.lift_reason ?? '') }));
                }
                shape(b, ['reason', 'preview_token'], []);
                if (Object.values(b).some(v => typeof v !== 'string'))
                    fail('WIRE_SHAPE_INVALID');
                return send(200, await activateFreeze(h, { draft_id: action[1], session, reason: String(b.reason ?? ''), preview_token: String(b.preview_token ?? '') }));
            }
            const id = path.match(/^\/policy\/freezes\/([^/]+)$/);
            if (method === 'GET' && id) {
                const row = h.store.one('freeze', { freeze_id: id[1] });
                if (!row)
                    fail('FREEZE_NOT_FOUND', 404);
                return send(200, freezeView(h, row, h.clock.read()));
            }
            if (method === 'GET' && path === '/policy/freezes') {
                const at = h.clock.read();
                let items = h.store.all('freeze').map(row => ({ item_kind: 'FREEZE', freeze: freezeView(h, row, at) }));
                const state = url.searchParams.get('state'), scope = url.searchParams.get('scope'), from = url.searchParams.get('from'), to = url.searchParams.get('to');
                if (state && !['DRAFT', 'ACTIVE', 'LIFTED', 'EXPIRED'].includes(state) || scope && !['ALL', 'SUBJECT', 'NODE_CLASS'].includes(scope))
                    fail('WIRE_SHAPE_INVALID');
                items = items.filter(i => (!state || i.freeze.state === state) && (!scope || i.freeze.scope === scope) && (!from || String(i.freeze.ends_at) > from) && (!to || String(i.freeze.starts_at) < to));
                const activatedDrafts=new Set(h.store.all('audit_events',{action:'FREEZE_ACTIVATED'}).map(a=>JSON.parse(String(a.detail)).draft_id));
                const drafts = h.store.all('freeze_draft').filter(d => String(d.expires_at) > at && !activatedDrafts.has(d.draft_id)).filter(d => {
                    const b = JSON.parse(String(d.draft_body));
                    return (!state || state === 'DRAFT') && (!scope || b.scope === scope) && (!from || b.ends_at > from) && (!to || b.starts_at < to);
                }).map(({ draft_id, content_hash, created_by, created_at, expires_at }) => ({ item_kind: 'DRAFT', draft: { draft_id, content_hash, created_by, created_at, expires_at } }));
                return send(200, { items: [...items, ...drafts], count: items.length + drafts.length });
            }
            return send(404, { code: 'WIRE_SHAPE_INVALID', http_status: 404, message: 'Route not found', retry_after_ms: null, failing_port: null, stage: null, failing_check: null });
        }
        catch (error) {
            if (error instanceof PolicyError)
                return send(error.http_status, error);
            console.error('Request failed:', error instanceof Error ? error.message : 'unknown error');
            return send(503, new PolicyError('DECISION_NOT_PRODUCED', 503));
        }
    });
}
