// Clock port implementation for fast-forward evaluation. Simulated and deterministic: time moves only
// when the caller advances it, never with the wall clock.
export class TimeDilationClock {
    private nowMs: number;
    constructor(start: string) {
        this.nowMs = TimeDilationClock.parse(start);
    }
    private static parse(instant: string): number {
        const ms = Date.parse(instant);
        if (!Number.isFinite(ms))
            throw Error('TimeDilationClock needs a valid ISO instant');
        return ms;
    }
    read(): string {
        return new Date(this.nowMs).toISOString();
    }
    advanceTo(instant: string): void {
        this.nowMs = TimeDilationClock.parse(instant);
    }
    advanceBy(ms: number): void {
        if (!Number.isFinite(ms))
            throw Error('TimeDilationClock needs a finite number of milliseconds');
        this.nowMs += ms;
    }
}
