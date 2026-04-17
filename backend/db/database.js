const Database = require('better-sqlite3');
const path = require('path');

let db;

function getDb() {
  if (db) return db;
  db = new Database(path.join(__dirname, '../omni_copilot.db'));
  db.pragma('journal_mode = WAL');
  initSchema(db);
  console.log('[DB] SQLite connected and schema initialized');
  return db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tokens (
      service TEXT PRIMARY KEY,
      access_token TEXT,
      refresh_token TEXT,
      token_expiry INTEGER,
      extra_data TEXT,
      connected_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT,
      created_at TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT,
      role TEXT,
      content TEXT,
      created_at TEXT,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    );
  `);
}

module.exports = { getDb };
