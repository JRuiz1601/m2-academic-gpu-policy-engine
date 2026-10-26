import type { DatabaseSync } from 'node:sqlite';
import type { Runtime, Session } from './runtime.ts';
import { wrapDatabase } from '../adapters/outbound/sqlite.ts';
import * as service from '../application/service.ts';
export type { Session };
// Compatibility seam for Solu-2 test fixtures. Production uses Runtime and Store ports.
type Legacy = Omit<Runtime, 'store'> & {
    db: DatabaseSync;
};
const runtime = (h: Legacy): Runtime => ({ ...h, store: wrapDatabase(h.db) });
export type EvaluationInput = service.EvaluationInput;
export type FreezeInput = service.FreezeInput;
export const evaluateRequest = (h: Legacy, i: EvaluationInput) => service.evaluateRequest(runtime(h), i);
export const previewFreeze = (h: Legacy, i: FreezeInput) => service.previewFreeze(runtime(h), i);
export const activateFreeze = (h: Legacy, i: FreezeInput) => service.activateFreeze(runtime(h), i);
export const publishVersion = (h: Legacy, i: {
    session: Session;
}) => service.publishVersion(runtime(h), i);
export const liftFreeze = (h: Legacy, i: {
    freeze_id: string;
    session: Session;
    lift_reason: string;
}) => service.liftFreeze(runtime(h), i);
