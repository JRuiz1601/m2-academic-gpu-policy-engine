export class PolicyError extends Error {
    code: string;
    http_status: number;
    retry_after_ms: number | null;
    failing_port: string | null;
    stage: null = null;
    failing_check: string | null = null;
    constructor(code: string, status = 400, port: string | null = null) {
        super(code);
        this.code = code;
        this.http_status = status;
        this.retry_after_ms = status === 503 ? 2000 : null;
        this.failing_port = port;
    }
    toJSON() {
        return { code: this.code, http_status: this.http_status, message: this.message, retry_after_ms: this.retry_after_ms, failing_port: this.failing_port, stage: this.stage, failing_check: this.failing_check };
    }
}
export function fail(code: string, status = 400, port: string | null = null): never {
    throw new PolicyError(code, status, port);
}
