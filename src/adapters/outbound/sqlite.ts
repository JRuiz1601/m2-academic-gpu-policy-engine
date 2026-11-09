import { DatabaseSync, type StatementSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import type { Row, Store } from '../../ports/runtime.ts';
const identifier = (s: string) => {
    if (!/^[a-z_]+$/.test(s))
        throw Error('Invalid SQL identifier');
    return '"' + s + '"';
};
export class SqliteStore implements Store {
    private tail: Promise<unknown> = Promise.resolve();
    readonly db: DatabaseSync;
    // Prepared statements are reused by SQL text. The text is built only from fixed identifiers and '?' placeholders, so the cache stays small and never holds data.
    private statements = new Map<string, StatementSync>();
    private prepared(sql: string): StatementSync {
        let s = this.statements.get(sql);
        if (!s) {
            s = this.db.prepare(sql);
            this.statements.set(sql, s);
        }
        return s;
    }
    constructor(db: DatabaseSync) {
        this.db=db;
    }
    all(table: string, where: Row = {}): Row[] {
        const keys = Object.keys(where);
        return this.prepared(`SELECT * FROM ${identifier(table)}${keys.length ? ' WHERE ' + keys.map(k => identifier(k) + ' IS ?').join(' AND ') : ''}`).all(...Object.values(where)) as Row[];
    }
    one(table: string, where: Row) {
        return this.all(table, where)[0];
    }
    insert(table: string, row: Row) {
        const keys = Object.keys(row);
        this.prepared(`INSERT INTO ${identifier(table)} (${keys.map(identifier).join(',')}) VALUES (${keys.map(() => '?').join(',')})`).run(...Object.values(row));
    }
    // One multi-row INSERT for rows that share the same columns (one statement instead of N); same atomicity inside the caller's transaction.
    insertMany(table: string, rows: Row[]) {
        if (!rows.length)
            return;
        const keys = Object.keys(rows[0]!), group = `(${keys.map(() => '?').join(',')})`;
        this.prepared(`INSERT INTO ${identifier(table)} (${keys.map(identifier).join(',')}) VALUES ${rows.map(() => group).join(',')}`).run(...rows.flatMap(r => keys.map(k => r[k] ?? null)));
    }
    update(table: string, where: Row, changes: Row) {
        this.prepared(`UPDATE ${identifier(table)} SET ${Object.keys(changes).map(k => identifier(k) + '=?').join(',')} WHERE ${Object.keys(where).map(k => identifier(k) + ' IS ?').join(' AND ')}`).run(...Object.values(changes), ...Object.values(where));
    }
    transaction<T>(action: () => T): T {
        this.db.exec('BEGIN IMMEDIATE');
        try {
            const value = action();
            this.db.exec('COMMIT');
            return value;
        }
        catch (e) {
            this.db.exec('ROLLBACK');
            throw e;
        }
    }
    exclusive<T>(action: () => Promise<T>): Promise<T> {
        const next = this.tail.then(action);
        this.tail = next.catch(() => {
        });
        return next;
    }
}
const stores = new WeakMap<DatabaseSync, SqliteStore>();
export function wrapDatabase(db: DatabaseSync) {
    let s = stores.get(db);
    if (!s) {
        s = new SqliteStore(db);
        stores.set(db, s);
    }
    return s;
}
export function openStore(path: string) {
    const db = new DatabaseSync(path);
    db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
    if (!db.prepare("SELECT name FROM sqlite_master WHERE name='policy_version'").get())
        db.exec(readFileSync(new URL('./001_m2_schema.sqlite.sql', import.meta.url), 'utf8'));
    return wrapDatabase(db);
}
