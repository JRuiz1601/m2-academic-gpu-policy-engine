import type { DecisionDto, EvaluateRequestDto, DecisionCause, ConstraintValueDto } from './dto.ts';
import { RULES, ENGINE_VERSION, CAMPUS_TZ, TZDATA_VERSION, rank } from './registry.ts';
export interface Window {
    kind: string;
    starts_at: string;
    ends_at: string;
    subject_id?: string;
    reservation_id?: string;
}
export interface Model {
    model_ref: string;
    min_vram_gb: number;
    required_min_role_tier?: string;
    variants?: Model[];
    license_ref?: string;
}
export interface Freeze {
    freeze_id: string;
    scope: string;
    subject_ids?: string[];
    node_class_ids?: string[];
    state: string;
    starts_at: string;
    ends_at: string;
    allowances: string[];
}
export interface Facts {
    campus_now: string;
    policy_version: number;
    windows: Window[];
    actor_kind?: string;
    role_tier?: string;
    system_role?: string;
    session_actor_id?: string;
    subject_ids?: string[];
    clearance?: {
        max_gpu_count: number;
        max_vram_gb: number;
        unrestricted?: boolean;
    };
    model?: Model;
    quota?: {
        remaining: number;
        need?: number;
    };
    fleet?: unknown;
    availability?: {
        class_id: string;
        available_count: number;
        failing_count: number;
    }[];
    freeze_states?: Freeze[];
    reservation?: {
        reservation_id: string;
        state: string;
        subject_id: string;
        starts_at: string;
        ends_at: string;
    };
    dependency_failure?: string;
    content_hash?: string;
    actor_unknown?: boolean;
    model_unknown?: boolean;
    [key: string]: unknown;
}
// No IO, randomness, or system clock. Identifiers here are deterministic placeholders;
// the application assigns UUIDv7 and persists the result before replying.
export function evaluate(r: EvaluateRequestDto, f: Facts, version: number): DecisionDto {
    const now = Date.parse(f.campus_now), iso = (n: number) => new Date(n).toISOString();
    const active = (w: {
        starts_at: string;
        ends_at: string;
    }) => Date.parse(w.starts_at) <= now && now < Date.parse(w.ends_at);
    const role = f.role_tier ?? 'STUDENT', subjects = f.subject_ids ?? [r.subject_id];
    const model = f.model ?? { model_ref: r.model_ref, min_vram_gb: 24 };
    const clearance = f.clearance ?? { max_gpu_count: role === 'STUDENT' ? 1 : 2, max_vram_gb: role === 'STUDENT' ? 24 : 48 };
    const windows = f.windows.filter(w => !w.subject_id || subjects.includes(w.subject_id));
    const node = r.requested_vram_gb_per_gpu > 24 ? 'dual-48' : 'std-24';
    const freezes = (f.freeze_states ?? []).filter(w => w.state === 'ACTIVE' && active(w) && (w.scope === 'ALL' || w.scope === 'SUBJECT' && w.subject_ids?.includes(r.subject_id) || w.scope === 'NODE_CLASS' && w.node_class_ids?.includes(node)));
    const binding = f.reservation;
    const exam = !!r.exam_binding && !!binding && binding.reservation_id === r.exam_binding && binding.state === 'ACTIVE' && binding.subject_id === r.subject_id && active(binding) && subjects.includes(r.subject_id);
    const over = !clearance.unrestricted && (r.requested_gpu_count > clearance.max_gpu_count || r.requested_vram_gb_per_gpu > clearance.max_vram_gb);
    const hardware = r.requested_gpu_count > (r.requested_vram_gb_per_gpu > 24 ? 2 : 1) || r.requested_vram_gb_per_gpu > 48 || r.requested_vram_gb_per_gpu < model.min_vram_gb;
    const variant = (model.variants ?? []).filter(v => v.min_vram_gb <= clearance.max_vram_gb && rank(v.required_min_role_tier ?? 'STUDENT') <= rank(role)).sort((a, b) => a.model_ref < b.model_ref ? -1 : a.model_ref > b.model_ref ? 1 : 0)[0];
    const av = (f.availability ?? []).filter(a => a.class_id === node);
    const local = new Date(now - 5 * 3600000), hour = local.getUTCHours();
    const night = hour >= 22 || hour < 6;
    const nextSix = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + (hour >= 6 ? 1 : 0), 11);
    const horizon = now + 30 * 60000;
    const boundaries = [...windows.filter(w => Date.parse(w.starts_at) > now).map(w => Date.parse(w.starts_at)), ...(night ? [nextSix] : []), ...(exam && binding ? [Date.parse(binding.ends_at)] : []), ...freezes.map(w => Date.parse(w.ends_at))];
    const bound = boundaries.length ? Math.min(...boundaries) - 5 * 60000 : Infinity;
    const end = now + r.expected_duration_min * 60000;
    let valid = iso(Math.min(horizon, Math.max(now, bound))), primary = 'R-ALLOW-01', cause: DecisionCause | null = null;
    const constraints: DecisionDto['constraints'] = [];
    const add = (value: ConstraintValueDto, by: string, deadline: string | null = null) => constraints.push({ constraint_id: `00000000-0000-7000-8000-${String(constraints.length).padStart(12, '0')}`, kind: value.kind, value, reason: primary, enforced_by: by, deadline });
    const deny = (rule: string, why: DecisionCause) => {
        primary = rule;
        cause = why;
    };
    const invalid = [r.requested_gpu_count, r.requested_vram_gb_per_gpu, r.expected_duration_min].some(n => !Number.isSafeInteger(n) || n <= 0) || !!f.session_actor_id && r.actor_ref !== f.session_actor_id || !!r.exam_binding && !exam;
    // Mandatory denials dominate provisional constraints (DL-50). All predicates are pure.
    if (invalid)
        deny('R-VALID-01', 'INVALID_REQUEST');
    else if (f.actor_unknown)
        deny('R-VALID-01', 'ACTOR_UNKNOWN');
    else if (f.model_unknown)
        deny('R-VALID-01', 'MODEL_NOT_FOUND');
    else if (f.dependency_failure)
        deny('R-DEP-01', 'DEPENDENCY_UNAVAILABLE');
    else if (freezes.some(w => !exam || !w.allowances.includes(r.exam_binding!)))
        deny('R-FRZ-01', 'FREEZE_ACTIVE');
    else if (over && !variant)
        deny('R-TIER-02', 'NOT_AUTHORIZED');
    else if (hardware && !variant)
        deny('R-TIER-01', 'NO_SUCH_HARDWARE');
    else if (av.length && av.every(a => a.available_count <= 0 && a.failing_count >= 1))
        deny('R-FLEET-01', 'HARDWARE_FAILING');
    else if (rank(role) < rank(model.required_min_role_tier ?? 'STUDENT'))
        deny('R-AUTH-02', 'NOT_AUTHORIZED');
    else if (!subjects.includes(r.subject_id))
        deny('R-AUTH-01', 'NOT_AUTHORIZED');
    else if (windows.some(w => w.kind === 'EXAM' && active(w) && (!exam || w.reservation_id !== r.exam_binding)))
        deny('R-LAB-02', 'WINDOW_PROTECTED');
    else if (windows.some(w => ['CLASS', 'LAB'].includes(w.kind) && active(w)) && !['INTERACTIVE_INFERENCE', 'EXAM_BOUND'].includes(r.workload_kind) && !exam)
        deny('R-LAB-01', 'WINDOW_PROTECTED');
    else if (f.actor_kind === 'SYSTEM' && !({ NIGHT_TRAINING_DAEMON: ['TRAINING', 'EVALUATION'], EMERGENCY_BROADCAST: ['EXAM_BOUND'] } as Record<string, string[]>)[f.system_role ?? '']?.includes(r.workload_kind))
        deny('R-SYS-01', 'NOT_AUTHORIZED');
    else if (f.actor_kind !== 'SYSTEM' && ['TRAINING', 'BACKGROUND_BATCH'].includes(r.workload_kind) && !night && !exam)
        deny('R-NIGHT-01', 'WINDOW_PROTECTED');
    else if ((f.quota?.remaining ?? 100000) <= 0)
        deny('R-QUOTA-01', 'QUOTA_EXHAUSTED');
    else if (freezes.length && exam) {
        primary = 'R-FRZ-02';
        add({ kind: 'WINDOW_SCOPE', boundary_ref: freezes[0].freeze_id }, 'M7');
    }
    else if ((over || hardware) && variant) {
        primary = 'R-TIER-03';
        add({ kind: 'MODEL_VARIANT', model_ref: variant.model_ref }, 'M7');
        add({ kind: 'RESOURCE_SUBSTITUTION', requested_gpu_count: 1, requested_vram_gb_per_gpu: variant.min_vram_gb }, 'M7');
    }
    else if (bound <= now) {
        valid = f.campus_now;
        add({ kind: 'WINDOW_SCOPE', boundary_ref: 'past-bound' }, 'M9');
    }
    else if (end > bound) {
        primary = 'R-BOUND-01';
        valid = iso(bound);
        add({ kind: 'HARD_DEADLINE', must_checkpoint_by: valid }, 'M9', valid);
    }
    else if ((f.quota?.remaining ?? 100000) < (f.quota?.need ?? 0)) {
        primary = 'R-QUOTA-02';
        add({ kind: 'QUOTA_CAP', cap_value: f.quota!.remaining, requires_commit_confirmation: true }, 'M8', valid);
    }
    else if (av.length && av.every(a => a.available_count <= 0 && a.failing_count === 0)) {
        primary = 'R-CONTEND-01';
        add({ kind: 'QUEUE_ONLY', queue_estimate_ref: 'M3:' + node }, 'M3', valid);
    }
    // Combine independent safety obligations so a deadline never hides a quota cap.
    if (!cause && bound > now && end > bound && !constraints.some(c => c.kind === 'HARD_DEADLINE')) {
        valid = iso(bound);
        add({ kind: 'HARD_DEADLINE', must_checkpoint_by: valid }, 'M9', valid);
    }
    if (!cause && bound > now && (f.quota?.remaining ?? 100000) < (f.quota?.need ?? 0) && !constraints.some(c => c.kind === 'QUOTA_CAP'))
        add({ kind: 'QUOTA_CAP', cap_value: f.quota!.remaining, requires_commit_confirmation: true }, 'M8', valid);
    if (!cause)
        for (const c of constraints)
            if (['HARD_DEADLINE', 'QUOTA_CAP', 'QUEUE_ONLY'].includes(c.kind))
                c.deadline = valid;
    const rule = RULES.find(x => x.rule_id === primary)!;
    const evidence = [{ fact_path: 'campus_now', value: f.campus_now }, { fact_path: 'request.requested_vram_gb_per_gpu', value: r.requested_vram_gb_per_gpu }, { fact_path: 'model.min_vram_gb', value: model.min_vram_gb }, { fact_path: 'actor.role_tier', value: role }];
    const contributors = new Set([primary, ...constraints.filter(c => c.kind === 'HARD_DEADLINE').map(() => 'R-BOUND-01'), ...constraints.filter(c => c.kind === 'QUOTA_CAP').map(() => 'R-QUOTA-02')]);
    const citationIds = [...new Set(RULES.filter(x => contributors.has(x.rule_id)).flatMap(x => x.citation_ids))].sort();
    const outcome = cause ? 'DENY' : primary === 'R-ALLOW-01' ? 'ALLOW' : 'CONSTRAIN';
    const activeClass = windows.find(active);
    const reason = primary === 'R-LAB-01' ? `GPU access restricted during scheduled lab class ${activeClass?.subject_id ?? r.subject_id}; next available ${activeClass?.ends_at}` : primary === 'R-TIER-02' && model.min_vram_gb <= 24 ? 'Workload fits standard 24GB workstation; server tier restricted; suggested node std-24' : primary === 'R-ALLOW-01' ? 'Standard student lab policy satisfied' : cause ?? primary;
    return { decision_id: '00000000-0000-7000-8000-000000000000', outcome, admission: cause ? 'REJECTED' : primary === 'R-CONTEND-01' ? 'QUEUED' : 'ADMITTED', authority: constraints.some(c => c.kind === 'QUOTA_CAP') ? 'PROVISIONAL' : 'FINAL', primary_rule_id: primary, cause, rationale: `${primary}: ${cause ?? reason}. ${reason}`, next_actions: cause ? [primary === 'R-LAB-01' ? `Retry at ${activeClass?.ends_at}` : 'Check permissions, model and available quota; use std-24 when eligible'] : [], constraints: cause ? [] : constraints, trace: RULES.map((x, i) => ({ seq: i, rule_id: x.rule_id, state: contributors.has(x.rule_id) ? 'MATCH' : x.precedence < rule.precedence && !['R-BOUND-01', 'R-FRZ-02'].includes(x.rule_id) ? 'NO_MATCH' : 'NOT_EVALUATED', evidence: contributors.has(x.rule_id) ? evidence : [], precedence: x.precedence, bound_role: x.rule_id === 'R-BOUND-01' && primary === x.rule_id ? 'governing' : null })), suppressed: [], citations: citationIds, policy_version: version, content_hash: f.content_hash ?? '0'.repeat(64), engine_version: ENGINE_VERSION, campus_tz: CAMPUS_TZ, tzdata_version: TZDATA_VERSION, evaluated_at: f.campus_now, valid_until: cause ? null : valid, must_checkpoint_by: constraints.some(c => c.kind === 'HARD_DEADLINE') ? valid : null, retry_after_ms: cause === 'DEPENDENCY_UNAVAILABLE' ? 2000 : null, stale_facts: [], evidence_snapshot_ref: 'pending', request_chain_id: r.request_chain_id, subject_id: r.subject_id, model_ref: r.model_ref, node_class_id: node, derived_from: r.derived_from ?? null, parent_kind: r.derived_from ? 'DERIVED' : 'ROOT', depth: r.derived_from ? 1 : 0, originating_actor_id: f.session_actor_id ?? r.actor_ref, submitted_by: f.actor_kind === 'SYSTEM' ? 'SYSTEM' : 'HUMAN', explanation: { primary_rule_id: primary, rule_ids: [primary, ...[...contributors].filter(x => x !== primary)], observed_values: evidence, thresholds: [{ fact_path: 'actor.max_vram_gb', comparator: 'LE', value: clearance.max_vram_gb }], citation_ids: citationIds } };
}
export function validateRegistry(rules: unknown[], documents: string[]): void {
    const seen = new Set<number>(), ids = new Set<string>();
    for (const item of rules) {
        const r = item as typeof RULES[number];
        if (seen.has(r.precedence))
            throw Error('DUPLICATE_PRECEDENCE');
        seen.add(r.precedence);
    }
    for (const item of rules) {
        const r = item as typeof RULES[number];
        if (!Number.isInteger(r.precedence) || r.precedence < -1 || r.precedence > 1000 || ids.has(r.rule_id) || !r.rationale_template_id || !r.citation_ids?.length || r.citation_ids.some(x => !documents.includes(x)))
            throw Error('REGISTRY_INVALID');
        ids.add(r.rule_id);
    }
}
