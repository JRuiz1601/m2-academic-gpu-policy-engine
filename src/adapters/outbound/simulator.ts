import { readFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Runtime, Session } from '../../ports/runtime.ts';
import type { Model } from '../../domain/evaluate.ts';
import { openStore } from './sqlite.ts';
import { initialize } from '../../application/service.ts';
import type { Config } from '../../config.ts';
// Fixture files are immutable static catalog data: read each file once, parse per call so callers still get their own copy.
const fixtureText = new Map<string, string>();
export const fixture = <T>(name: string): T => {
    let text = fixtureText.get(name);
    if (text === undefined) {
        text = readFileSync(new URL(`../../../fixtures/${name}.json`, import.meta.url), 'utf8');
        fixtureText.set(name, text);
    }
    return JSON.parse(text);
};
export function createRuntime(c: Config): Runtime {
    if (c.database !== ':memory:')
        mkdirSync(dirname(c.database), { recursive: true });
    const fleet = fixture<Runtime['fleet']>('fleet');
    if (fleet.length !== 32 || fleet.filter(n => n.gpu_count === 1 && n.vram_gb_per_gpu === 24).length !== 31 || fleet.filter(n => n.gpu_count === 2 && n.vram_gb_per_gpu === 48).length !== 1)
        throw Error('Invalid simulated fleet');
    const h: Runtime = { store: openStore(c.database), clock: { read: () => c.simulatedNow }, fleet, tokenSecret: c.tokenSecret, policyVersion: 1, fault: null, telemetry: { calls: [], async read(port, context) {
                this.calls.push(port);
                const s = context?.session, r = context?.request;
                switch (port) {
                    case 'identity': return { actor_id: s?.actor_id, actor_kind: 'HUMAN' };
                    case 'identity.role_tier': return s?.role_tier;
                    case 'access': return { subject_ids: ['CS-101'], clearance: { max_gpu_count: s?.role_tier === 'STUDENT' ? 1 : 2, max_vram_gb: s?.role_tier === 'STUDENT' ? 24 : 48 } };
                    case 'catalog': return fixture<Model[]>('models').find(m => m.model_ref === r?.model_ref) ?? { status: 'NOT_FOUND' };
                    case 'timetable': return fixture('timetable');
                    case 'quota': return { remaining: 100000, need: r?.expected_duration_min ?? 0 };
                    case 'availability': return [{ class_id: 'std-24', available_count: 31, failing_count: 0 }, { class_id: 'dual-48', available_count: 1, failing_count: 0 }];
                    case 'runtime': return { status: 'AVAILABLE', jobs: [] };
                    case 'bus': return { status: 'AVAILABLE' };
                    default: return undefined;
                }
            } } };
    initialize(h);
    return h;
}
export const sessions = () => fixture<Record<string, Session>>('sessions');
