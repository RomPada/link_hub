-- LinkHub v0.4.0 — cover artwork, optional uploaded avatar, unified links.
-- Existing profile values, destinations and analytics are preserved.
ALTER TABLE settings ADD COLUMN cover_image_url TEXT NOT NULL DEFAULT '';
ALTER TABLE settings ADD COLUMN cover_image_data TEXT NOT NULL DEFAULT '';
ALTER TABLE settings ADD COLUMN avatar_data TEXT NOT NULL DEFAULT '';
-- Section labels are deprecated: one ordered list replaces categories.
UPDATE buttons SET category='Links' WHERE category<>'Links';
