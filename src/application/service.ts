import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Runtime, Session, Row } from '../ports/runtime.ts';
import type { DecisionDto, EvaluateRequestDto, CreateFreezeDraftRequestDto, PreviewFreezeResponseDto } from '../domain/dto.ts';
import { evaluate, validateRegistry, type Facts, type Model, type Freeze, type Window } from '../domain/evaluate.ts';
import { RULES, ENGINE_VERSION, CAMPUS_TZ, TZDATA_VERSION, rank } from '../domain/registry.ts';
import { fail } from './errors.ts';
import { modelFact, windowFacts, freezeFacts, quotaFact, availabilityFacts, strings } from './facts.ts';
export function canonical(value: unknown): string {
    if (Array.isArray(value))
        return '[' + value.map(canonical).join(',') + ']';
    if (value && typeof value === 'object')
        return '{' + Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).filter(([, v]) => v !== undefined).map(([k, v]) => JSON.stringify(k) + ':' + canonical(v)).join(',') + '}';
    return JSON.stringify(value);
}
export const hash = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');
export function uuid7(at: string) {
    const bytes = randomBytes(16);
    bytes.writeUIntBE(Date.parse(at), 0, 6);
    bytes[6] = (bytes[6] & 15) | 112;
    bytes[8] = (bytes[8] & 63) | 128;
    const h = bytes.toString('hex');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
const plus = (at: string, ms: number) => new Date(Date.parse(at) + ms).toISOString();
export function authenticate(s: Session) {
    if (!s?.actor_id)
        fail('UNAUTHENTICATED', 401);
}
export function operator(s: Session) {
    authenticate(s);
    if (rank(s.role_tier) < rank('INSTRUCTOR') || !s.scopes.includes('LAB_OPERATOR'))
        fail('ROLE_INSUFFICIENT', 403);
}
export function manifest(h: Runtime, version?: number) {
    const row = version === undefined ? h.store.all('policy_version').sort((a, b) => Number(b.published_seq) - Number(a.published_seq))[0] : h.store.one('policy_version', { published_seq: version });
    if (!row)
        fail('VERSION_NOT_FOUND', 404);
    const { published_seq, published_at, content_hash, engine_version, campus_tz } = row;
    return { published_seq: Number(published_seq), published_at: String(published_at), content_hash: String(content_hash), engine_version: String(engine_version), campus_tz: String(campus_tz) };
}
export function initialize(h: Runtime) {
    if (!h.store.all('policy_version').length) {
        const at = h.clock.read();
        h.store.insert('policy_version', { published_seq: 1, published_at: at, content_hash: registryHash(), engine_version: ENGINE_VERSION, campus_tz: CAMPUS_TZ, immutable: 1, created_at: at });
    }
    validateRegistry(RULES, h.store.all('policy_document').map(r => String(r.doc_id)));
    if (h.store.all('policy_version').some(v => v.content_hash !== registryHash())) throw Error('Stored registry differs from this build; use a compatible release or migrate policy artifacts');
}
export function registryHash() {
    return hash({ rules: RULES, constants: { grace_ms: 300000, horizon_ms: 1800000, night: [22, 6] }, engine_version: ENGINE_VERSION, campus_tz: CAMPUS_TZ, tzdata_version: TZDATA_VERSION });
}
function outbox(h: Runtime, type: string, key: string, id: string | number, at: string, idem: string | null = null) {
    h.store.insert('decision_outbox', { outbox_id: uuid7(at), event_type: type, [key]: id, idempotency_key: idem, payload_ref: String(id), created_at: at });
}
function audit(h: Runtime, action: string, s: Session, at: string, freeze_id: string | null = null, detail: unknown = {}) {
    h.store.insert('audit_events', { id: uuid7(at), occurred_at: at, actor_id: s.actor_id, action, freeze_id, detail: canonical(detail), created_at: at });
}
function wire(r: EvaluateRequestDto) {
    if (!r || typeof r !== 'object' || Array.isArray(r))
        fail('WIRE_SHAPE_INVALID');
    const strings = ['request_id', 'request_chain_id', 'actor_ref', 'subject_id', 'model_ref'];
    for (const k of strings)
        if (typeof (r as unknown as Record<string, unknown>)[k] !== 'string' || !(r as unknown as Record<string, unknown>)[k])
            fail('WIRE_SHAPE_INVALID');
    if (!['INTERACTIVE_INFERENCE', 'BACKGROUND_BATCH', 'TRAINING', 'EVALUATION', 'EXAM_BOUND'].includes(r.workload_kind) || ![r.expected_duration_min, r.requested_gpu_count, r.requested_vram_gb_per_gpu].every(Number.isSafeInteger) || !(r.exam_binding === null || typeof r.exam_binding === 'string') || Object.keys(r).some(k => !strings.concat(['workload_kind', 'expected_duration_min', 'requested_gpu_count', 'requested_vram_gb_per_gpu', 'exam_binding', 'derived_from']).includes(k)))
        fail('WIRE_SHAPE_INVALID');
}
async function read(h: Runtime, port: string, fallback: unknown, context?: {
    session: Session;
    request?: EvaluateRequestDto;
}) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        return (await Promise.race([h.telemetry.read(port, context), new Promise<never>((_, reject) => {
                timer = setTimeout(() => reject(Error('FACT_TIMEOUT')), 40);
            })])) ?? fallback;
    }
    finally {
        clearTimeout(timer);
    }
}
function unpackFreeze(r: Row): Freeze {
    return { freeze_id: String(r.freeze_id), scope: String(r.scope), state: String(r.state), subject_ids: JSON.parse(String(r.subject_ids)), node_class_ids: JSON.parse(String(r.node_class_ids)), allowances: JSON.parse(String(r.allowances)), starts_at: String(r.starts_at), ends_at: String(r.ends_at) };
}
export async function gather(h: Runtime, r: EvaluateRequestDto, s: Session, at: string, version: number): Promise<Facts> {
    const f: Facts = { campus_now: at, policy_version: version, windows: [], session_actor_id: s.actor_id, role_tier: s.role_tier, actor_kind: 'HUMAN', subject_ids: [r.subject_id], quota: { remaining: 100000, need: r.expected_duration_min }, model: { model_ref: r.model_ref, min_vram_gb: 24 } };
    try {
        const identity = await read(h, 'identity', { actor_id: s.actor_id, actor_kind: 'HUMAN' }, { session: s, request: r }) as Record<string, unknown>;
        f.actor_kind = identity.actor_kind === 'SYSTEM' ? 'SYSTEM' : 'HUMAN';
        f.system_role = typeof identity.system_role === 'string' ? identity.system_role : undefined;
        f.actor_unknown = identity.status === 'NOT_FOUND';
        const access = await read(h, 'access', { subject_ids: [r.subject_id] }, { session: s, request: r }) as {
            subject_ids?: string[];
            clearance?: Facts['clearance'];
        };
        f.subject_ids = access.subject_ids === undefined ? [r.subject_id] : strings(access.subject_ids);
        f.clearance = access.clearance;
        const rawModel = await read(h, 'catalog', f.model, { session: s, request: r }) as Model & {
            status?: string;
        };
        f.model_unknown = rawModel.status === 'NOT_FOUND';
        if (!f.model_unknown)
            f.model = modelFact(rawModel);
        f.windows = windowFacts(await read(h, 'timetable', []));
        f.quota = quotaFact(await read(h, 'quota', f.quota, { session: s, request: r }));
        f.availability = availabilityFacts(await read(h, 'availability', [{ class_id: 'std-24', available_count: 31, failing_count: 0 }, { class_id: 'dual-48', available_count: 1, failing_count: 0 }]));
        f.freeze_states = freezeFacts(await read(h, 'freeze_states', h.store.all('freeze').map(unpackFreeze)));
        if (r.exam_binding)
            f.reservation = await read(h, 'reservation', null) as Facts['reservation'];
    }
    catch {
        f.dependency_failure = h.telemetry.calls.at(-1) ?? 'unknown';
    }
    return f;
}
function persist(h: Runtime, d: DecisionDto, f: Facts, key: string, requestHash: string) {
    const at = d.evaluated_at, ref = d.evidence_snapshot_ref;
    h.store.insert('idempotency_key', { actor_id: d.originating_actor_id, key, request_hash: requestHash, decision_id: d.decision_id, created_at: at, replay_window_expires_at: plus(at, 86400000) });
    h.store.insert('fact_snapshot', { ref, actor_id: d.originating_actor_id, actor_kind: f.actor_kind ?? 'HUMAN', role_tier: f.role_tier ?? 'STUDENT', max_gpu_count: f.clearance?.max_gpu_count ?? (f.role_tier === 'STUDENT' ? 1 : 2), max_vram_gb: f.clearance?.max_vram_gb ?? (f.role_tier === 'STUDENT' ? 24 : 48), subject_ids: canonical(f.subject_ids ?? []), model_facts: canonical(f.model ?? {}), node_classes: canonical(h.fleet), protected_windows: canonical(f.windows), freeze_states: canonical(f.freeze_states ?? []), quota_facts: canonical(f.quota ?? {}), queue_estimates: '{}', campus_now: at, campus_tz: CAMPUS_TZ, utc_offset_seconds_at_evaluated_at: -18000, tzdata_version: TZDATA_VERSION, night_window: '{"start":22,"end":6}', clock_override: null, staleness: '[]', policy_version: d.policy_version, created_at: at });
    const scalar = ['decision_id', 'outcome', 'admission', 'authority', 'cause', 'primary_rule_id', 'rationale', 'evaluated_at', 'valid_until', 'must_checkpoint_by', 'retry_after_ms', 'request_chain_id', 'subject_id', 'model_ref', 'node_class_id', 'originating_actor_id', 'submitted_by', 'derived_from', 'parent_kind', 'depth', 'evidence_snapshot_ref', 'policy_version'] as const;
    const row: Row = {};
    for (const k of scalar)
        row[k] = d[k];
    row.next_actions = canonical(d.next_actions);
    row.snapshot_retained = 1;
    row.created_at = at;
    h.store.insert('decision', row);
    h.store.insertMany('trace_entry', d.trace.map(t => ({ decision_id: d.decision_id, ...t, evidence: canonical(t.evidence), created_at: at }) as Row));
    for (const c of d.constraints) {
        const { reason, ...record } = c;
        h.store.insert('decision_constraint', { decision_id: d.decision_id, ...record, value: canonical(c.value), created_at: at });
    }
    h.store.insertMany('decision_citation', [...d.citations.entries()].map(([ordinal, c]) => ({ decision_id: d.decision_id, doc_id: c, ordinal, created_at: at })));
    outbox(h, 'policy.decision.v1', 'decision_id', d.decision_id, at, key);
}
export function restore(h: Runtime, id: string): DecisionDto {
    const row = h.store.one('decision', { decision_id: id })!, v = manifest(h, Number(row.policy_version)), snapshot = h.store.one('fact_snapshot', { ref: row.evidence_snapshot_ref })!;
    const trace = h.store.all('trace_entry', { decision_id: id }).sort((a, b) => Number(a.seq) - Number(b.seq)).map(t => ({ seq: Number(t.seq), rule_id: String(t.rule_id), state: t.state, evidence: JSON.parse(String(t.evidence)), precedence: Number(t.precedence), bound_role: t.bound_role }));
    const constraints = h.store.all('decision_constraint', { decision_id: id }).map(c => ({ constraint_id: c.constraint_id, kind: c.kind, value: JSON.parse(String(c.value)), reason: row.primary_rule_id, enforced_by: c.enforced_by, deadline: c.deadline }));
    const citations = h.store.all('decision_citation', { decision_id: id }).map(c => String(c.doc_id)).sort();
    const evidence = trace.find(t => t.rule_id === row.primary_rule_id)?.evidence ?? [];
    const { created_at, snapshot_retained, ...body } = row;
    return { ...body, content_hash: v.content_hash, engine_version: v.engine_version, campus_tz: v.campus_tz, tzdata_version: String(snapshot.tzdata_version), next_actions: JSON.parse(String(row.next_actions)), constraints, trace, suppressed: [], citations, stale_facts: [], explanation: { primary_rule_id: row.primary_rule_id, rule_ids: [row.primary_rule_id, ...trace.filter(t => t.state === 'MATCH' && t.rule_id !== row.primary_rule_id).map(t => t.rule_id)], observed_values: evidence, thresholds: [{ fact_path: 'actor.max_vram_gb', comparator: 'LE', value: snapshot.max_vram_gb }], citation_ids: citations } } as unknown as DecisionDto;
}
export interface EvaluationInput {
    request: EvaluateRequestDto;
    key: string;
    session: Session;
}
export async function evaluateRequest(h: Runtime, i: EvaluationInput, preview = false) {
    return h.store.exclusive(async () => {
        authenticate(i.session);
        wire(i.request);
        if (!preview && !i.key?.trim())
            fail('IDEMPOTENCY_KEY_MISSING');
        h.telemetry.calls.push('campus.clock');
        const at = h.clock.read();
        if (!Number.isFinite(Date.parse(at)))
            fail('DECISION_NOT_PRODUCED', 503, 'campus.clock');
        const version = manifest(h), requestHash = hash(i.request);
        const existing = preview ? undefined : h.store.one('idempotency_key', { actor_id: i.session.actor_id, key: i.key });
        if (existing) {
            if (String(existing.replay_window_expires_at) <= at)
                fail('IDEMPOTENCY_KEY_EXPIRED', 409);
            if (existing.request_hash !== requestHash)
                fail('IDEMPOTENCY_BODY_MISMATCH', 409);
            return restore(h, String(existing.decision_id));
        }
        if (i.request.derived_from) {
            const parent = h.store.one('decision', { decision_id: i.request.derived_from });
            if (!parent || parent.depth !== 0 || parent.originating_actor_id !== i.session.actor_id)
                fail('DERIVED_FROM_INVALID');
        }
        const f = await gather(h, i.request, i.session, at, version.published_seq);
        f.content_hash = version.content_hash;
        const d = evaluate(i.request, f, version.published_seq);
        d.engine_version = version.engine_version;
        d.decision_id = uuid7(at);
        d.evidence_snapshot_ref = hash({ request: i.request, facts: f, policy: version });
        d.constraints.forEach(c => c.constraint_id = uuid7(at));
        if (!preview)
            h.store.transaction(() => {
                if (!h.store.one('fact_snapshot', { ref: d.evidence_snapshot_ref }))
                    persist(h, d, f, i.key, requestHash);
                else {
                    d.evidence_snapshot_ref = hash({ ref: d.evidence_snapshot_ref, decision_id: d.decision_id });
                    persist(h, d, f, i.key, requestHash);
                }
                if (h.fault === 'after-decision-insert')
                    fail('TRANSACTION_ABORTED', 503);
            });
        return d;
    });
}
function draft(h: Runtime, id: string, at: string) {
    const d = h.store.one('freeze_draft', { draft_id: id });
    if (!d)
        fail('DRAFT_NOT_FOUND', 404);
    if (String(d.expires_at) <= at)
        fail('DRAFT_EXPIRED', 409);
    return d;
}
function signature(h: Runtime, p: Row) {
    return createHmac('sha256', h.tokenSecret).update(String(p.draft_id) + p.content_hash + p.actor_id + p.issued_at).digest('hex');
}
export interface FreezeInput {
    draft_id: string;
    session: Session;
    reason?: string;
    preview_token?: string;
}
export async function previewFreeze(h: Runtime, i: FreezeInput): Promise<PreviewFreezeResponseDto> {
    return h.store.exclusive(async () => {
        operator(i.session);
        const at = h.clock.read(), d = draft(h, i.draft_id, at), body = JSON.parse(String(d.draft_body));
        let windows: Window[], runtime: {
            status?: string;
            jobs?: {
                job_id: string;
                reservation_id?: string;
            }[];
        };
        try {
            windows = windowFacts(await read(h, 'timetable', []));
            runtime = await read(h, 'runtime', { status: 'AVAILABLE', jobs: [] }) as typeof runtime;
        }
        catch {
            fail('PREVIEW_UNAVAILABLE', 503);
        }
        const jobs = runtime.jobs ?? [], survivors = jobs.filter(j => body.allowances.includes(j.reservation_id)).map(j => j.job_id).sort();
        const p: Row = { preview_run_id: uuid7(at), draft_id: i.draft_id, actor_id: i.session.actor_id, content_hash: d.content_hash, issued_at: at, expires_at: plus(at, 60000), consumed_at: null, denied_count: jobs.length - survivors.length, survivors: canonical(survivors), next_protected_window: windows.filter(w => w.starts_at > at).map(w => w.starts_at).sort()[0] ?? null, runtime_snapshot: runtime.status === 'UNAVAILABLE' ? 0 : 1, created_at: at, updated_at: at };
        h.store.transaction(() => {
            h.store.insert('preview_run', p);
            audit(h, 'FREEZE_PREVIEW_COMPUTED', i.session, at, null, { draft_id: i.draft_id });
        });
        return { preview_token: Buffer.from(JSON.stringify({ preview_run_id: p.preview_run_id, signature: signature(h, p) })).toString('base64url'), denied_count: Number(p.denied_count), survivors, next_protected_window: p.next_protected_window as string | null, runtime_snapshot: p.runtime_snapshot ? 'AVAILABLE' : 'UNAVAILABLE', expires_at: String(p.expires_at) };
    });
}
export async function activateFreeze(h: Runtime, i: FreezeInput) {
    return h.store.exclusive(async () => {
        operator(i.session);
        const fresh = await read(h, 'identity.role_tier', i.session.role_tier, { session: i.session });
        if (typeof fresh !== 'string' || rank(fresh) < rank('INSTRUCTOR'))
            fail('ROLE_INSUFFICIENT', 403);
        if (!i.reason?.trim())
            fail('MISSING_REASON');
        const at = h.clock.read(), d = draft(h, i.draft_id, at);
        let token: {
            preview_run_id: string;
            signature: string;
        };
        try {
            token = JSON.parse(Buffer.from(i.preview_token ?? '', 'base64url').toString());
        }
        catch {
            fail('TOKEN_ABSENT', 409);
        }
        const p = h.store.one('preview_run', { preview_run_id: token.preview_run_id ?? '' });
        if (!p || p.draft_id !== i.draft_id || typeof token.signature !== 'string' || !/^[a-f0-9]{64}$/.test(token.signature) || !timingSafeEqual(Buffer.from(token.signature), Buffer.from(signature(h, p))))
            fail('TOKEN_ABSENT', 409);
        if (p.actor_id !== i.session.actor_id)
            fail('TOKEN_ACTOR_MISMATCH', 409);
        if (p.content_hash !== d.content_hash)
            fail('TOKEN_STALE', 409);
        if (p.consumed_at)
            fail('TOKEN_CONSUMED', 409);
        if (at > String(p.expires_at))
            fail('PREVIEW_EXPIRED', 409);
        const body = JSON.parse(String(d.draft_body)), version = manifest(h).published_seq, freeze_id = uuid7(at);
        if (body.ends_at <= at)
            fail('WINDOW_IN_PAST');
        h.store.transaction(() => {
            for (const old of h.store.all('freeze', { state: 'ACTIVE' })) {
                if (String(old.ends_at) <= at)
                    h.store.update('freeze', { freeze_id: old.freeze_id }, { state: 'EXPIRED', updated_at: at });
                else if (old.scope === body.scope && old.subject_ids === canonical(body.subject_ids) && old.node_class_ids === canonical(body.node_class_ids))
                    fail('DUPLICATE_ACTIVE_FREEZE', 409);
            }
            h.store.insert('freeze', { freeze_id, scope: body.scope, subject_ids: canonical(body.subject_ids), node_class_ids: canonical(body.node_class_ids), allowances: canonical(body.allowances), starts_at: body.starts_at, ends_at: body.ends_at, state: 'ACTIVE', reason: i.reason!.trim(), activated_by: i.session.actor_id, activated_by_role_tier: String(fresh), activated_at: at, supersedes: null, policy_version: version, created_at: at, updated_at: at });
            if (h.fault === 'after-freeze-insert')
                fail('TRANSACTION_ABORTED', 503);
            h.store.update('preview_run', { preview_run_id: p.preview_run_id }, { consumed_at: at, updated_at: at });
            outbox(h, 'policy.freeze.activated.v1', 'freeze_id', freeze_id, at);
            audit(h, 'FREEZE_ACTIVATED', i.session, at, freeze_id, {draft_id:i.draft_id});
        });
        return { freeze_id, policy_version: version };
    });
}
export async function liftFreeze(h: Runtime, i: {
    freeze_id: string;
    session: Session;
    lift_reason: string;
}) {
    return h.store.exclusive(async () => {
        operator(i.session);
        if (!i.lift_reason?.trim())
            fail('MISSING_REASON');
        const at = h.clock.read(), f = h.store.one('freeze', { freeze_id: i.freeze_id });
        if (!f) {if (h.store.one('freeze_draft',{draft_id:i.freeze_id})) fail('FREEZE_NOT_LIFTABLE',409);fail('FREEZE_NOT_FOUND',404);}
        if (f.state !== 'ACTIVE' || String(f.ends_at) <= at)
            fail('FREEZE_NOT_LIFTABLE', 409);
        h.store.transaction(() => {
            h.store.update('freeze', { freeze_id: i.freeze_id }, { state: 'LIFTED', lift_reason: i.lift_reason.trim(), updated_at: at });
            outbox(h, 'policy.freeze.lifted.v1', 'freeze_id', i.freeze_id, at);
            audit(h, 'FREEZE_LIFTED', i.session, at, i.freeze_id);
        });
        return { freeze_id: i.freeze_id, state: 'LIFTED' as const };
    });
}
export async function publishVersion(h: Runtime, i: {
    session: Session;
}) {
    return h.store.exclusive(async () => {
        operator(i.session);
        const at = h.clock.read(), published_seq = manifest(h).published_seq + 1;
        validateRegistry(RULES, h.store.all('policy_document').map(d => String(d.doc_id)));
        h.store.transaction(() => {
            h.store.insert('policy_version', { published_seq, published_at: at, content_hash: registryHash(), engine_version: ENGINE_VERSION, campus_tz: CAMPUS_TZ, immutable: 1, created_at: at });
            outbox(h, 'policy.version.published.v1', 'published_seq', published_seq, at);
        });
        h.policyVersion = published_seq;
        return manifest(h, published_seq);
    });
}
export async function createFreezeDraft(h: Runtime, b: CreateFreezeDraftRequestDto, s: Session) {
    return h.store.exclusive(async () => {
        operator(s);
        const at = h.clock.read();
        if (b.reason !== undefined && typeof b.reason !== 'string') fail('WIRE_SHAPE_INVALID');
        if (!b.reason?.trim())
            fail('MISSING_REASON');
        if (!['ALL', 'SUBJECT', 'NODE_CLASS'].includes(b.scope) || ![b.subject_ids, b.node_class_ids, b.allowances].every(a => Array.isArray(a) && a.every(x => typeof x === 'string')) || ![b.starts_at, b.ends_at].every(t => typeof t === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(t) && Number.isFinite(Date.parse(t)) && new Date(t).toISOString() === t))
            fail('WIRE_SHAPE_INVALID');
        if (b.ends_at <= b.starts_at)
            fail('WINDOW_INVALID_RANGE');
        if (b.ends_at <= at)
            fail('WINDOW_IN_PAST');
        if (b.scope === 'SUBJECT' ? !b.subject_ids.length : !!b.subject_ids.length)
            fail('WIRE_SHAPE_INVALID');
        if (b.scope === 'NODE_CLASS' ? !b.node_class_ids.length : !!b.node_class_ids.length)
            fail('WIRE_SHAPE_INVALID');
        const body = { ...b, subject_ids: [...new Set(b.subject_ids)].sort(), node_class_ids: [...new Set(b.node_class_ids)].sort(), allowances: [...new Set(b.allowances)].sort() }, draft_id = uuid7(at), content_hash = hash(body), expires_at = plus(at, 86400000);
        h.store.transaction(() => {
            h.store.insert('freeze_draft', { draft_id, content_hash, draft_body: canonical(body), created_by: s.actor_id, created_at: at, expires_at, updated_at: at });
            audit(h, 'FREEZE_DRAFT_CREATED', s, at, null, { draft_id });
            outbox(h, 'policy.freeze.drafted.v1', 'draft_id', draft_id, at);
        });
        return { draft_id, content_hash, expires_at };
    });
}
