import type { Window } from './evaluate.ts';
export type BoundaryAction = 'CONTINUE' | 'EVICT_WARNING' | 'EVICT' | 'EXTEND_ALLOWED' | 'DENY';
export interface BoundaryJob {
    job_ref: string;
    workload_kind: string;
    approved_policy: 'NIGHT';
}
export interface BoundaryResult {
    action: BoundaryAction;
    minutes_remaining: number;
    hard_deadline: string;
    reason: string;
    rule_id: string;
}
// RED-PHASE STUB (story 2.4): intentionally inert so acceptance tests compile and fail on behaviour.
export function evaluateWindowBoundary(_job: BoundaryJob, _now: string, _extensionMinutes?: number, _windows: Window[] = []): BoundaryResult {
    return { action: 'CONTINUE', minutes_remaining: 0, hard_deadline: '', reason: '', rule_id: '' };
}
