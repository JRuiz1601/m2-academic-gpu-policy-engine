export type Row = Record<string, string | number | null>;
export interface Store {
    all(table: string, where?: Row): Row[];
    one(table: string, where: Row): Row | undefined;
    insert(table: string, row: Row): void;
    update(table: string, where: Row, changes: Row): void;
    transaction<T>(action: () => T): T;
    exclusive<T>(action: () => Promise<T>): Promise<T>;
}
export interface Session {
    actor_id: string;
    role_tier: string;
    scopes: string[];
}
export interface Runtime {
    store: Store;
    clock: {
        read(): string;
    };
    telemetry: {
        read(port: string, context?: {
            session: Session;
            request?: import('../domain/dto.ts').EvaluateRequestDto;
        }): Promise<unknown>;
        calls: string[];
    };
    fleet: {
        node_id: string;
        node_class_id: string;
        gpu_count: number;
        vram_gb_per_gpu: number;
        health: string;
    }[];
    tokenSecret: string;
    fault: string | null;
    policyVersion: number;
}
