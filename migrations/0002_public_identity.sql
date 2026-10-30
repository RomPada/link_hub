-- LinkHub v0.2.0. Applied AFTER 0001_init.sql. Preserves user content and analytics.
ALTER TABLE settings ADD COLUMN avatar_text TEXT NOT NULL DEFAULT '';
ALTER TABLE settings ADD COLUMN avatar_background TEXT NOT NULL DEFAULT '#142849';
ALTER TABLE settings ADD COLUMN avatar_shape TEXT NOT NULL DEFAULT 'rounded';
ALTER TABLE settings ADD COLUMN favicon_data TEXT NOT NULL DEFAULT '';
ALTER TABLE settings ADD COLUMN show_top_brand INTEGER NOT NULL DEFAULT 1 CHECK(show_top_brand IN (0,1));
ALTER TABLE settings ADD COLUMN show_top_tagline INTEGER NOT NULL DEFAULT 1 CHECK(show_top_tagline IN (0,1));

-- Replace ONLY untouched v0.1.0 example buttons with neutral, visible, safe examples.
-- Custom buttons and altered destinations remain untouched.
UPDATE buttons SET title='Example Resource One', subtitle='Open a sample destination',
  url='https://example.com/resource-one', category='Resources', active=1
WHERE title='Patreon' AND url='https://www.patreon.com/';
UPDATE buttons SET title='Example Resource Two', subtitle='Explore another example',
  url='https://example.com/resource-two', category='Resources', active=1
WHERE title='SubscribeStar' AND url='https://www.subscribestar.com/';
UPDATE buttons SET title='Example Channel One', subtitle='Browse the sample channel',
  url='https://example.com/channel-one', category='Channels', active=1
WHERE title='X' AND url='https://x.com/';
UPDATE buttons SET title='Example Channel Two', subtitle='Visit the sample channel',
  url='https://example.com/channel-two', category='Channels', active=1
WHERE title='GitHub' AND url='https://github.com/';

-- Make the untouched source labels independent of any platform brands.
UPDATE sources SET name='Source One' WHERE name='Instagram' AND slug='ig';
UPDATE sources SET name='Source Two' WHERE name='Telegram' AND slug='tg';
UPDATE sources SET name='Source Three' WHERE name='Facebook' AND slug='fb';
UPDATE sources SET name='Source Four' WHERE name='X' AND slug='x';
UPDATE sources SET name='Source Five' WHERE name='Reddit' AND slug='reddit';
