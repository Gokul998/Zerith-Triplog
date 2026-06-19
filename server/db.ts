import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), ".data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "triplog.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_color TEXT NOT NULL DEFAULT '#6366f1',
    push_subscription TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    destination TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'planning',
    notes TEXT NOT NULL DEFAULT '',
    currency TEXT NOT NULL DEFAULT 'USD',
    budget_amount REAL,
    owner_id TEXT NOT NULL,
    cover_image_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS trip_members (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    joined_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(trip_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS invites (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL,
    email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS checklist_items (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL,
    text TEXT NOT NULL,
    checked INTEGER NOT NULL DEFAULT 0,
    checked_by TEXT,
    category TEXT NOT NULL DEFAULT 'general',
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL,
    day_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'sightseeing',
    start_time TEXT,
    end_time TEXT,
    cost REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'planned',
    vote_up TEXT NOT NULL DEFAULT '[]',
    vote_down TEXT NOT NULL DEFAULT '[]',
    sort_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL,
    paid_by TEXT NOT NULL,
    title TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    category TEXT NOT NULL DEFAULT 'other',
    split_among TEXT NOT NULL DEFAULT '[]',
    date TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    FOREIGN KEY (paid_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    date TEXT NOT NULL,
    location TEXT NOT NULL DEFAULT '',
    mood TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS memory_images (
    id TEXT PRIMARY KEY,
    memory_id TEXT NOT NULL,
    trip_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
    size_bytes INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    trip_id TEXT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Migration: add share_token column to trips if not present
const tripsColumns = db.pragma("table_info(trips)") as any[];
if (!tripsColumns.find((c: any) => c.name === "share_token")) {
  db.exec("ALTER TABLE trips ADD COLUMN share_token TEXT");
}

export default db;
