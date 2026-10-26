import { test, expect } from 'vitest';
import {
  fake_clock,
  seed_fleet,
  db,
  sim_telemetry,
  harness,
  seedDraft,
  seedPreview,
  rows,
} from '../fixtures/index.js';
test('clock crosses midnight without sleep', () => {
  const c = fake_clock('2026-10-19T23:59:59.999Z');
  c.advance(1);
  expect(c.read()).toBe('2026-10-20T00:00:00.000Z');
  expect(c.reads).toBe(1);
});
test('fleet has 31 standard and one dual healthy node', () => {
  const f = seed_fleet();
  expect(f).toHaveLength(32);
  expect(f.filter((n) => n.gpu_count === 1 && n.vram_gb_per_gpu === 24)).toHaveLength(31);
  expect(f.filter((n) => n.gpu_count === 2 && n.vram_gb_per_gpu === 48)).toHaveLength(1);
  expect(f.every((n) => n.health === 'HEALTHY')).toBe(true);
});
test('SQL migration seeds twelve policy documents and enables foreign keys', () => {
  const d = db();
  try {
    expect(d.prepare('SELECT count(*) AS n FROM policy_document').get()?.n).toBe(12);
    expect(d.prepare('PRAGMA foreign_keys').get()?.foreign_keys).toBe(1);
    expect(
      d.prepare("SELECT name FROM sqlite_master WHERE type='trigger'").all().length,
    ).toBeGreaterThan(0);
  } finally {
    d.close();
  }
});
test('telemetry injects failure and records port calls', async () => {
  const t = sim_telemetry();
  t.inject('quota', new Error('offline'));
  await expect(t.read('quota')).rejects.toThrow('offline');
  expect(t.calls).toEqual(['quota']);
});
test('draft seed satisfies shipped schema', () => {
  const h = harness();
  try {
    const id = seedDraft(h);
    expect(rows(h, 'freeze_draft')[0]?.draft_id).toBe(id);
  } finally {
    h.db.close();
  }
});
test('activation seed supplies valid unconsumed preview without invoking preview SUT', () => {
  const h = harness();
  try {
    const token = seedPreview(h, seedDraft(h));
    expect(JSON.parse(Buffer.from(token, 'base64url').toString()).preview_run_id).toBe(
      rows(h, 'preview_run')[0]?.preview_run_id,
    );
    expect(rows(h, 'preview_run')[0]?.consumed_at).toBeNull();
    expect(rows(h, 'policy_version')).toHaveLength(1);
  } finally {
    h.db.close();
  }
});
