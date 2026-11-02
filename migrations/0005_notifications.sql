-- LinkHub v0.5.0 — browser push subscriptions and per-device notification preferences.
-- Existing event history, links, profile and sessions are unchanged.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint_hash TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  device_name TEXT NOT NULL DEFAULT 'Android device',
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
  notify_views INTEGER NOT NULL DEFAULT 0 CHECK(notify_views IN (0,1)),
  notify_unique INTEGER NOT NULL DEFAULT 1 CHECK(notify_unique IN (0,1)),
  notify_outbound INTEGER NOT NULL DEFAULT 1 CHECK(notify_outbound IN (0,1)),
  source_filter TEXT NOT NULL DEFAULT 'all',
  cooldown_seconds INTEGER NOT NULL DEFAULT 60,
  last_sent_at INTEGER NOT NULL DEFAULT 0,
  last_test_at INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_enabled ON push_subscriptions(enabled);
