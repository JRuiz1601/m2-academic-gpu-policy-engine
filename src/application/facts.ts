import type { Window, Freeze, Model, Facts } from '../domain/evaluate.ts';
function object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw Error('MALFORMED_FACT');
    return value as Record<string, unknown>;
}
function text(v: unknown): string {
    if (typeof v !== 'string' || !v.length)
        throw Error('MALFORMED_FACT');
    return v;
}
function integer(v: unknown): number {
    if (!Number.isSafeInteger(v))
        throw Error('MALFORMED_FACT');
    return v as number;
}
function instant(v: unknown): string {
    const s = text(v);
    if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(s) || !Number.isFinite(Date.parse(s)))
        throw Error('MALFORMED_FACT');
    return s;
}
function array(v: unknown): unknown[] {
    if (!Array.isArray(v))
        throw Error('MALFORMED_FACT');
    return v;
}
export function strings(v: unknown): string[] {
    return array(v).map(text).sort();
}
export function modelFact(v: unknown): Model {
    const m = object(v), min = integer(m.min_vram_gb);
    if (min <= 0)
        throw Error('MALFORMED_FACT');
    return { model_ref: text(m.model_ref), min_vram_gb: min, required_min_role_tier: m.required_min_role_tier === undefined ? undefined : text(m.required_min_role_tier), variants: m.variants === undefined ? [] : array(m.variants).map(modelFact) };
}
export function windowFacts(v: unknown): Window[] {
    return array(v).map(value => {
        const w = object(value), kind = text(w.kind);
        if (!['CLASS', 'LAB', 'EXAM'].includes(kind))
            throw Error('MALFORMED_FACT');
        const starts_at = instant(w.starts_at), ends_at = instant(w.ends_at);
        if (ends_at <= starts_at)
            throw Error('MALFORMED_FACT');
        return { kind, starts_at, ends_at, ...(w.subject_id === undefined ? {} : { subject_id: text(w.subject_id) }), ...(w.reservation_id === undefined ? {} : { reservation_id: text(w.reservation_id) }) };
    });
}
export function freezeFacts(v: unknown): Freeze[] {
    return array(v).map(value => {
        const f = object(value);
        return { freeze_id: text(f.freeze_id), scope: text(f.scope), state: text(f.state), starts_at: instant(f.starts_at), ends_at: instant(f.ends_at), allowances: strings(f.allowances), subject_ids: f.subject_ids === undefined ? [] : strings(f.subject_ids), node_class_ids: f.node_class_ids === undefined ? [] : strings(f.node_class_ids), ...(typeof f.reason === 'string' && f.reason ? { reason: f.reason } : {}) };
    });
}
export function quotaFact(v: unknown): NonNullable<Facts['quota']> {
    const q = object(v);
    return { remaining: integer(q.remaining), need: q.need === undefined ? 0 : integer(q.need) };
}
export function availabilityFacts(v: unknown): NonNullable<Facts['availability']> {
    return array(v).map(value => {
        const a = object(value);
        return { class_id: text(a.class_id), available_count: integer(a.available_count), failing_count: integer(a.failing_count) };
    });
}
