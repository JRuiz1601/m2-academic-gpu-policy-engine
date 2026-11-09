// Tiny cross-platform launcher used by playwright.config.ts (no shell env syntax).
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'm2-e2e-'));
process.env.PORT = process.env.E2E_PORT ?? '4173';
process.env.HOST = '127.0.0.1';
process.env.DATABASE_PATH = join(dir, 'e2e.sqlite');
process.env.SIMULATED_NOW = process.env.SIMULATED_NOW ?? '2026-10-19T03:00:00.000Z';
// src/main.ts prints "M2 listening at http://..." once the socket is bound.
await import('../../src/main.ts');
