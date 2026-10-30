-- LinkHub v0.3.0: destination button visual identity. No event data is altered.
ALTER TABLE buttons ADD COLUMN icon_mode TEXT NOT NULL DEFAULT 'auto'
  CHECK (icon_mode IN ('auto','url','upload','default'));
ALTER TABLE buttons ADD COLUMN icon_url TEXT NOT NULL DEFAULT '';
ALTER TABLE buttons ADD COLUMN icon_data TEXT NOT NULL DEFAULT '';
