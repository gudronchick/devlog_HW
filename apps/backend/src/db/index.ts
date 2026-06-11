import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/dev-log.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id          TEXT PRIMARY KEY,
    parent_id   TEXT REFERENCES tasks(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'todo'
                  CHECK(status IN ('todo', 'in-progress', 'done')),
    priority    TEXT NOT NULL DEFAULT 'medium'
                  CHECK(priority IN ('low', 'medium', 'high')),
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  )
`);

export default db;
