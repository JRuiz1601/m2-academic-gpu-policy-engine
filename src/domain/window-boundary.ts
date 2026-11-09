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
// Campus-local time is the fixed UTC-05:00 profile (America/Panama has no DST), see registry TZDATA_VERSION.
const OFFSET_MS = -5 * 3_600_000, DAY = 86_400, HARD_DEADLINE_SEC = 6 * 3600, NIGHT_START_SEC = 22 * 3600, WARNING_SEC = 300;
export const HARD_DEADLINE = '06:00:00';
const clockText = (sec: number) => [Math.floor(sec / 3600), Math.floor(sec / 60) % 60, sec % 60].map(n => String(n).padStart(2, '0')).join(':');
const localSeconds = (instant: string) => Math.floor((Date.parse(instant) + OFFSET_MS) / 1000);
// First class or lab start (campus-local HH:MM:SS) on the campus day that contains the hard deadline.
function firstClassStart(windows: Window[], deadlineLocalDay: number): string | undefined {
    const starts = windows.filter(w => w.kind === 'CLASS' || w.kind === 'LAB').map(w => localSeconds(w.starts_at)).filter(s => Math.floor(s / DAY) === deadlineLocalDay);
    return starts.length ? clockText(Math.min(...starts) % DAY) : undefined;
}
// Pure: no wall clock, no IO. `now` is the instant read from the Clock port; `windows` come from the timetable fact.
export function evaluateWindowBoundary(_job: BoundaryJob, now: string, extensionMinutes?: number, windows: Window[] = []): BoundaryResult {
    const local = localSeconds(now), day = Math.floor(local / DAY), second = local - day * DAY;
    // Seconds until the next 06:00:00; zero when the clock is already in the protected day (06:00:00-21:59:59).
    const remaining = second < HARD_DEADLINE_SEC ? HARD_DEADLINE_SEC - second : second >= NIGHT_START_SEC ? DAY + HARD_DEADLINE_SEC - second : 0;
    const minutes = Math.ceil(remaining / 60);
    const base = { hard_deadline: HARD_DEADLINE };
    if (extensionMinutes !== undefined) {
        if (extensionMinutes * 60 > remaining) {
            const deadlineDay = second >= NIGHT_START_SEC ? day + 1 : day, first = firstClassStart(windows, deadlineDay);
            return { ...base, action: 'DENY', minutes_remaining: minutes, rule_id: 'R-BOUND-01', reason: `Extension of ${extensionMinutes} minutes would cross the ${HARD_DEADLINE} hard deadline of the NIGHT policy.${first ? ` Scheduled laboratory classes begin at ${first}.` : ''}` };
        }
        return { ...base, action: 'EXTEND_ALLOWED', minutes_remaining: minutes, rule_id: 'R-NIGHT-01', reason: `Extension of ${extensionMinutes} minutes ends before the ${HARD_DEADLINE} hard deadline.` };
    }
    if (remaining === 0)
        return { ...base, action: 'EVICT', minutes_remaining: 0, rule_id: 'R-BOUND-01', reason: `The NIGHT policy expired at ${HARD_DEADLINE}; the job must be evicted.` };
    if (remaining <= WARNING_SEC)
        return { ...base, action: 'EVICT_WARNING', minutes_remaining: minutes, rule_id: 'R-BOUND-01', reason: `The NIGHT policy hard-expires at ${HARD_DEADLINE}; ${minutes} minute(s) remain.` };
    return { ...base, action: 'CONTINUE', minutes_remaining: minutes, rule_id: 'R-NIGHT-01', reason: `The job is inside the NIGHT window; ${minutes} minute(s) remain before ${HARD_DEADLINE}.` };
}
