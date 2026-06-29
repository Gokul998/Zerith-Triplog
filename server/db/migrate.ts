import pool from "./mysql";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id          VARCHAR(36)  PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  email       VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL DEFAULT '',
  avatar_color VARCHAR(20)  NOT NULL DEFAULT '#6366f1',
  google_id   VARCHAR(255) NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_google_id (google_id)
);

CREATE TABLE IF NOT EXISTS trips (
  id            VARCHAR(36)   PRIMARY KEY,
  owner_id      VARCHAR(36)   NOT NULL,
  title         VARCHAR(255)  NOT NULL,
  destination   VARCHAR(255)  NOT NULL,
  start_date    DATE          NOT NULL,
  end_date      DATE          NOT NULL,
  status        ENUM('planning','active','completed','cancelled') NOT NULL DEFAULT 'planning',
  notes         TEXT          NULL,
  currency      VARCHAR(10)   NOT NULL DEFAULT 'USD',
  budget_amount DECIMAL(12,2) NULL,
  share_token   VARCHAR(64)   NULL UNIQUE,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_owner (owner_id),
  INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS trip_members (
  id        VARCHAR(36) PRIMARY KEY,
  trip_id   VARCHAR(36) NOT NULL,
  user_id   VARCHAR(36) NOT NULL,
  role      ENUM('member','viewer') NOT NULL DEFAULT 'member',
  joined_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_trip_user (trip_id, user_id)
);

CREATE TABLE IF NOT EXISTS invites (
  id         VARCHAR(36)  PRIMARY KEY,
  trip_id    VARCHAR(36)  NOT NULL,
  invited_by VARCHAR(36)  NOT NULL,
  email      VARCHAR(255) NOT NULL,
  token      VARCHAR(64)  NOT NULL UNIQUE,
  status     ENUM('pending','accepted','declined') NOT NULL DEFAULT 'pending',
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  INDEX idx_token (token)
);

CREATE TABLE IF NOT EXISTS itinerary_days (
  id         VARCHAR(36)  PRIMARY KEY,
  trip_id    VARCHAR(36)  NOT NULL,
  date       DATE         NOT NULL,
  title      VARCHAR(255) NOT NULL DEFAULT '',
  day_number INT          NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  INDEX idx_trip_date (trip_id, date)
);

CREATE TABLE IF NOT EXISTS activities (
  id          VARCHAR(36)  PRIMARY KEY,
  trip_id     VARCHAR(36)  NOT NULL,
  day_id      VARCHAR(36)  NULL,
  title       VARCHAR(255) NOT NULL,
  description TEXT         NULL,
  category    VARCHAR(50)  NOT NULL DEFAULT 'sightseeing',
  location    VARCHAR(255) NULL,
  start_time  VARCHAR(10)  NULL,
  cost        DECIMAL(10,2) NOT NULL DEFAULT 0,
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  FOREIGN KEY (day_id)  REFERENCES itinerary_days(id) ON DELETE SET NULL,
  INDEX idx_trip (trip_id),
  INDEX idx_day (day_id)
);

CREATE TABLE IF NOT EXISTS memories (
  id         VARCHAR(36)  PRIMARY KEY,
  trip_id    VARCHAR(36)  NOT NULL,
  user_id    VARCHAR(36)  NOT NULL,
  title      VARCHAR(255) NOT NULL,
  note       TEXT         NULL,
  date       DATE         NULL,
  location   VARCHAR(255) NULL,
  mood       VARCHAR(50)  NULL,
  photo_url  VARCHAR(500) NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_trip (trip_id)
);

CREATE TABLE IF NOT EXISTS expenses (
  id          VARCHAR(36)   PRIMARY KEY,
  trip_id     VARCHAR(36)   NOT NULL,
  user_id     VARCHAR(36)   NOT NULL,
  title       VARCHAR(255)  NOT NULL,
  amount      DECIMAL(12,2) NOT NULL,
  currency    VARCHAR(10)   NOT NULL DEFAULT 'USD',
  category    VARCHAR(50)   NOT NULL DEFAULT 'other',
  date        DATE          NOT NULL,
  notes       TEXT          NULL,
  receipt_url VARCHAR(500)  NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_trip (trip_id)
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id         VARCHAR(36)  PRIMARY KEY,
  trip_id    VARCHAR(36)  NOT NULL,
  text       VARCHAR(255) NOT NULL,
  category   VARCHAR(50)  NOT NULL DEFAULT 'general',
  checked    TINYINT(1)   NOT NULL DEFAULT 0,
  checked_by VARCHAR(36)  NULL,
  created_by VARCHAR(36)  NOT NULL,
  sort_order INT          NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trip_id)    REFERENCES trips(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_trip (trip_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id         VARCHAR(36) PRIMARY KEY,
  trip_id    VARCHAR(36) NOT NULL,
  user_id    VARCHAR(36) NOT NULL,
  content    TEXT        NOT NULL,
  type       VARCHAR(20) NOT NULL DEFAULT 'text',
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_trip_time (trip_id, created_at)
);

CREATE TABLE IF NOT EXISTS notifications (
  id         VARCHAR(36) PRIMARY KEY,
  user_id    VARCHAR(36) NOT NULL,
  title      VARCHAR(255) NOT NULL,
  body       TEXT        NULL,
  type       VARCHAR(50) NOT NULL DEFAULT 'info',
  read_at    DATETIME    NULL,
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id)
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         VARCHAR(36) PRIMARY KEY,
  user_id    VARCHAR(36) NOT NULL,
  endpoint   TEXT        NOT NULL,
  p256dh     TEXT        NOT NULL,
  auth       TEXT        NOT NULL,
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id              VARCHAR(36) PRIMARY KEY,
  user_id         VARCHAR(36) NOT NULL,
  provider        VARCHAR(20) NOT NULL,
  provider_sub_id VARCHAR(255) NULL,
  provider_order_id VARCHAR(255) NULL,
  status          ENUM('active','cancelled','expired','pending') NOT NULL DEFAULT 'pending',
  plan            VARCHAR(20) NOT NULL DEFAULT 'pro',
  amount          DECIMAL(10,2) NOT NULL,
  currency        VARCHAR(10) NOT NULL,
  interval_type   VARCHAR(20) NOT NULL DEFAULT 'monthly',
  current_period_end DATETIME NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_provider_sub (provider_sub_id)
);
`;

// ALTER statements to patch existing tables that were created with wrong columns
const PATCHES = [
  // checklist_items: rename label→text, add created_by, checked_by
  `ALTER TABLE checklist_items CHANGE COLUMN label text VARCHAR(255) NOT NULL`,
  `ALTER TABLE checklist_items ADD COLUMN created_by VARCHAR(36) NOT NULL DEFAULT '' AFTER checked`,
  `ALTER TABLE checklist_items ADD COLUMN checked_by VARCHAR(36) NULL AFTER created_by`,
  // invites: add expires_at if missing
  `ALTER TABLE invites ADD COLUMN expires_at DATETIME NOT NULL DEFAULT (NOW() + INTERVAL 7 DAY)`,
  // activities: add end_time, status, currency if missing
  `ALTER TABLE activities ADD COLUMN end_time VARCHAR(10) NULL AFTER start_time`,
  `ALTER TABLE activities ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'planned' AFTER end_time`,
  `ALTER TABLE activities ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT 'USD' AFTER cost`,
  // expenses: add paid_by and split_among (migration used user_id instead)
  `ALTER TABLE expenses ADD COLUMN paid_by VARCHAR(36) NOT NULL DEFAULT '' AFTER trip_id`,
  `ALTER TABLE expenses ADD COLUMN split_among TEXT NOT NULL AFTER notes`,
  `UPDATE expenses SET split_among = '[]' WHERE split_among IS NULL OR split_among = ''`,
  // users: add plan and trial columns
  `ALTER TABLE users ADD COLUMN plan ENUM('free','trial','pro') NOT NULL DEFAULT 'free' AFTER avatar_color`,
  `ALTER TABLE users ADD COLUMN trial_ends_at DATETIME NULL AFTER plan`,
  // set new registrations to trial (14 days) — existing users stay free
];

export async function runMigrations() {
  const conn = await pool.getConnection();
  try {
    const statements = SCHEMA.split(";").map(s => s.trim()).filter(s => s.length > 0);
    for (const sql of statements) {
      await conn.execute(sql);
    }
    // Apply patches — ignore duplicate column errors (already patched)
    for (const sql of PATCHES) {
      try {
        await conn.execute(sql);
      } catch (e: any) {
        if (e.code !== "ER_DUP_FIELDNAME" && e.code !== "ER_BAD_FIELD_ERROR") throw e;
      }
    }
    console.log("Database migrations complete");
  } finally {
    conn.release();
  }
}
