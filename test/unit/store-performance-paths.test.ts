import { describe, it, expect } from 'vitest';
import { openStore } from '../../src/adapters/outbound/sqlite.ts';
import { fixture } from '../../src/adapters/outbound/simulator.ts';

// Story 2.5 performance paths: prepared-statement reuse, multi-row insert, cached fixture text.
describe('SqliteStore prepared statements and insertMany', () => {
  const at = '2026-10-19T03:00:00.000Z';
  const doc = (id: string) => ({ doc_id: id, title: `t-${id}`, owner: 'o', version: '1', content_hash: null, created_at: at, updated_at: at });

  it('repeated identical queries and inserts keep returning correct, current data', () => {
    const store = openStore(':memory:');
    const before = store.all('policy_document').length;
    store.insert('policy_document', doc('P-1'));
    expect(store.all('policy_document')).toHaveLength(before + 1);
    store.insert('policy_document', doc('P-2'));
    expect(store.all('policy_document')).toHaveLength(before + 2);
    expect(store.one('policy_document', { doc_id: 'P-2' })?.title).toBe('t-P-2');
    expect(store.one('policy_document', { doc_id: 'P-3' })).toBeUndefined();
  });

  it('insertMany writes every row once, in order, with a single statement', () => {
    const store = openStore(':memory:');
    const before = store.all('policy_document').length;
    store.insertMany('policy_document', [doc('M-1'), doc('M-2'), doc('M-3')]);
    const rows = store.all('policy_document').slice(before);
    expect(rows.map(r => r.doc_id)).toEqual(['M-1', 'M-2', 'M-3']);
  });

  it('insertMany with no rows is a no-op', () => {
    const store = openStore(':memory:');
    const before = store.all('policy_document').length;
    store.insertMany('policy_document', []);
    expect(store.all('policy_document')).toHaveLength(before);
  });

  it('insertMany is atomic with the surrounding transaction: a failure rolls every row back', () => {
    const store = openStore(':memory:');
    const before = store.all('policy_document').length;
    expect(() => store.transaction(() => {
      store.insertMany('policy_document', [doc('A-1'), doc('A-2')]);
      throw Error('abort');
    })).toThrow('abort');
    expect(store.all('policy_document')).toHaveLength(before);
  });

  it('insertMany rejects a violated constraint without partial writes', () => {
    const store = openStore(':memory:');
    const before = store.all('policy_document').length;
    expect(() => store.insertMany('policy_document', [doc('D-1'), doc('D-1')])).toThrow();
    expect(store.all('policy_document')).toHaveLength(before);
  });

  it('rejects identifiers that are not plain lowercase names, so cached SQL text never carries input', () => {
    const store = openStore(':memory:');
    expect(() => store.all('policy_document; DROP TABLE x')).toThrow('Invalid SQL identifier');
  });
});

describe('fixture() cached text', () => {
  it('returns an independent object per call, so a caller mutation cannot leak into the next read', () => {
    const first = fixture<{ request_id: string }>('request');
    first.request_id = 'mutated';
    expect(fixture<{ request_id: string }>('request').request_id).toBe('req-demo');
  });
});
