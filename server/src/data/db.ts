import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const appDb = new Database(path.join(dataDir, 'app.db'));
const targetDb = new Database(path.join(dataDir, 'mock_target.db'));

appDb.pragma('journal_mode = WAL');
targetDb.pragma('journal_mode = WAL');

// Initialize app metadata schema
appDb.exec(`
  CREATE TABLE IF NOT EXISTS migration_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version INTEGER NOT NULL,
    status TEXT NOT NULL,
    mapping_json TEXT NOT NULL,
    approver TEXT,
    approved_at TEXT
  );
  
  CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER,
    type TEXT,
    status TEXT,
    source_count INTEGER,
    accepted_count INTEGER,
    rejected_count INTEGER,
    skipped_duplicates INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS quarantine (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER,
    source_key TEXT,
    raw_record TEXT,
    errors TEXT
  );
`);

// Initialize target mock schema
targetDb.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    account_id TEXT PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    status TEXT,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS migration_lineage (
    record_key TEXT PRIMARY KEY,
    account_id TEXT,
    run_id INTEGER
  );
`);

export { appDb, targetDb };
