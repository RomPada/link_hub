-- LinkHub v0.1.0 — Cloudflare D1 (SQLite). Run through Wrangler migrations.
-- Dates are UTC Unix timestamps in milliseconds. We do not store IP addresses or referrers.

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  display_name TEXT NOT NULL DEFAULT 'Your Brand',
  headline TEXT NOT NULL DEFAULT 'Everything in one place.',
  bio TEXT NOT NULL DEFAULT 'Follow, explore, and stay connected.',
  avatar_url TEXT NOT NULL DEFAULT '',
  accent_color TEXT NOT NULL DEFAULT '#4267e9',
  updated_at INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO settings (id) VALUES (1);

CREATE TABLE IF NOT EXISTS sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE COLLATE NOCASE,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS buttons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Find me on',
  accent TEXT NOT NULL DEFAULT '#e9eefc',
  active INTEGER NOT NULL DEFAULT 0 CHECK (active IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('view', 'outbound')),
  source_id INTEGER REFERENCES sources(id) ON DELETE SET NULL,
  source_name TEXT NOT NULL DEFAULT 'Direct',
  button_id INTEGER REFERENCES buttons(id) ON DELETE SET NULL,
  button_name TEXT,
  visitor_id TEXT NOT NULL,
  country TEXT,
  device TEXT,
  occurred_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_kind_time ON events(kind, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_source_time ON events(source_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_button_time ON events(button_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_visitor_time ON events(visitor_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON admin_sessions(expires_at);

CREATE TABLE IF NOT EXISTS login_attempts (
  key_hash TEXT PRIMARY KEY,
  failures INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL
);

-- Sources are active and ready to share. Every source URL renders the SAME landing page.
INSERT OR IGNORE INTO sources (name, slug) VALUES
  ('Instagram', 'ig'), ('Telegram', 'tg'), ('Facebook', 'fb'),
  ('X', 'x'), ('Reddit', 'reddit');

-- These are INACTIVE examples: no one is sent to placeholder profiles.
INSERT INTO buttons (title, subtitle, url, category, accent, active, sort_order)
SELECT 'Patreon', 'Support my work', 'https://www.patreon.com/', 'Membership', '#f9e8e7', 0, 1
WHERE NOT EXISTS (SELECT 1 FROM buttons);
INSERT INTO buttons (title, subtitle, url, category, accent, active, sort_order)
SELECT 'SubscribeStar', 'Exclusive updates', 'https://www.subscribestar.com/', 'Membership', '#f9edd7', 0, 2
WHERE (SELECT count(*) FROM buttons) = 1;
INSERT INTO buttons (title, subtitle, url, category, accent, active, sort_order)
SELECT 'X', 'Follow my updates', 'https://x.com/', 'Social', '#e8eefa', 0, 3
WHERE (SELECT count(*) FROM buttons) = 2;
INSERT INTO buttons (title, subtitle, url, category, accent, active, sort_order)
SELECT 'GitHub', 'Explore my projects', 'https://github.com/', 'Social', '#e4f0e9', 0, 4
WHERE (SELECT count(*) FROM buttons) = 3;
