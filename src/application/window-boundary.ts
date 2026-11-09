import type { Runtime } from '../ports/runtime.ts';
import { evaluateWindowBoundary, type BoundaryResult } from '../domain/window-boundary.ts';
import { windowFacts } from './facts.ts';
import { fail } from './errors.ts';
const KINDS = ['INTERACTIVE_INFERENCE', 'BACKGROUND_BATCH', 'TRAINING', 'EVALUATION', 'EXAM_BOUND'];
const FIELDS = ['job_ref', 'workload_kind', 'approved_policy', 'extension_minutes'];
// Use case for POST /policy/window-boundary: validate the DTO, read the Clock and timetable ports, apply the pure rule.
export async function windowBoundary(h: Runtime, b: Record<string, unknown>): Promise<BoundaryResult> {
    if (Object.keys(b).some(k => !FIELDS.includes(k)) || typeof b.job_ref !== 'string' || !b.job_ref || typeof b.workload_kind !== 'string' || !KINDS.includes(b.workload_kind) || b.approved_policy !== 'NIGHT')
        fail('WIRE_SHAPE_INVALID');
    if ('extension_minutes' in b && (!Number.isSafeInteger(b.extension_minutes) || (b.extension_minutes as number) < 1))
        fail('WIRE_SHAPE_INVALID');
    try {
        const now = h.clock.read(), windows = windowFacts(await h.telemetry.read('timetable') ?? []);
        if (!Number.isFinite(Date.parse(now)))
            throw Error('CLOCK_UNREADABLE');
        return evaluateWindowBoundary({ job_ref: b.job_ref, workload_kind: b.workload_kind, approved_policy: 'NIGHT' }, now, b.extension_minutes as number | undefined, windows);
    }
    catch {
        return fail('DECISION_NOT_PRODUCED', 503);
    }
}
