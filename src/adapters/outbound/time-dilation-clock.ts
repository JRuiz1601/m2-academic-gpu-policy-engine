// RED-PHASE STUB (story 2.4): Clock port implementation with fast-forward; inert until the green phase.
export class TimeDilationClock {
    private start: string;
    constructor(start: string) {
        this.start = start;
    }
    read(): string {
        return this.start;
    }
    advanceTo(_instant: string): void {}
    advanceBy(_ms: number): void {}
}
