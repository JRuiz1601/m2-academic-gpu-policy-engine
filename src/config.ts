export interface Config {
    port: number;
    host: string;
    database: string;
    tokenSecret: string;
    simulatedNow: string;
    allowClockOverride: boolean;
}
export function config(env: NodeJS.ProcessEnv = process.env): Config {
    const port = Number(env.PORT ?? 3000), host = env.HOST ?? '127.0.0.1';
    if (!Number.isInteger(port) || port < 0 || port > 65535)
        throw Error('PORT must be an integer from 0 through 65535');
    const simulatedNow = env.SIMULATED_NOW ?? '2026-10-19T03:00:00.000Z';
    if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(simulatedNow) || new Date(simulatedNow).toISOString() !== simulatedNow)
        throw Error('SIMULATED_NOW must be a UTC instant with milliseconds');
    if (env.NODE_ENV === 'production')
        throw Error('Impl-1 supplies local simulation only; configure production identity and fact adapters before deployment');
    const tokenSecret = env.TOKEN_SECRET ?? 'local-simulation-secret-at-least-32-characters';
    if (tokenSecret.length < 32)
        throw Error('TOKEN_SECRET needs at least 32 characters');
    if (env.ALLOW_CLOCK_OVERRIDE && !['true', 'false'].includes(env.ALLOW_CLOCK_OVERRIDE))
        throw Error('ALLOW_CLOCK_OVERRIDE must be true or false');
    return { port, host, database: env.DATABASE_PATH ?? './data/m2.sqlite', tokenSecret, simulatedNow, allowClockOverride: env.ALLOW_CLOCK_OVERRIDE === 'true' };
}
