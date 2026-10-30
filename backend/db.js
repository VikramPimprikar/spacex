
const Database = require("better-sqlite3");

const db = new Database("syncspace.db");

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS meetings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    agenda TEXT DEFAULT '',
    participants TEXT DEFAULT '[]',
    notes TEXT DEFAULT '',
    summary TEXT DEFAULT '',
    status TEXT DEFAULT 'in_progress',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meeting_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id)
  );

  CREATE TABLE IF NOT EXISTS action_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    owner TEXT,
    due_date TEXT,
    status TEXT DEFAULT 'open',
    outcome TEXT,
    source_meeting_id INTEGER,
    FOREIGN KEY (source_meeting_id) REFERENCES meetings(id)
  );

  CREATE TABLE IF NOT EXISTS meeting_actions (
    meeting_id INTEGER NOT NULL,
    action_item_id INTEGER NOT NULL,
    added_at TEXT DEFAULT CURRENT_TIMESTAMP,
    carry_forward_note TEXT DEFAULT '',
    PRIMARY KEY (meeting_id, action_item_id),
    FOREIGN KEY (meeting_id) REFERENCES meetings(id),
    FOREIGN KEY (action_item_id) REFERENCES action_items(id)
  );

  CREATE TABLE IF NOT EXISTS knowledge_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source_type TEXT DEFAULT 'document',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS activity_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action_item_id INTEGER,
    meeting_id INTEGER,
    event_type TEXT NOT NULL,
    details TEXT DEFAULT '{}',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

module.exports = db;
