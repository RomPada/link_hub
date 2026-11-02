# LinkHub v0.5.4 — Safe refactoring report

## Scope and preservation guarantees

The changes are limited to CSS rules with no runtime producer, unused interface translation entries, documentation, cache-version labels and regression tests. The following implementation files and database migrations are unchanged in behavior: `src/worker.js` (version comment only), `src/web-push.js`, `public/sw.js`, `public/admin.webmanifest`, `public/manifest.webmanifest`, and all `migrations/0001_init.sql` through `0005_notifications.sql`.

No API routes, D1 schema/columns, cookies, authentication, analytics, outbound redirects, PWA install behavior, service-worker code or Web Push code were modified.

## What was removed

- **CSS:** 18 legacy class names, 44 selector entries comprising 42 now-empty rules. The original stylesheet had 55,043 bytes; the cleaned version has 51,356 bytes. Roughly 3.7 KB of unused CSS was removed.
- **Public translations:** the unused `tagline`, `categoryResources` and `categoryChannels` fields from each of five public locales (15 entries).
- **Admin translations:** one obsolete `Open page` label and one duplicate `Profile header` label (2 entries).
- **Tests:** a hardcoded version check was replaced with a project-version-based assertion.

## Why legacy favicon assets remain

All icons in the source ZIP still have active consumers:

| Asset | Active use |
| --- | --- |
| `public/icon.svg` | Public site's default fallback through `/site-icon` |
| `public/favicon.ico` | Public favicon fallback for browsers requesting `/favicon.ico` |
| `public/icons/icon-192.png`, `icon-512.png` | Public PWA manifest (`manifest.webmanifest`) |
| `public/icons/admin-192.png`, `admin-512.png` | Installed admin PWA and browser push icon |
| `public/icons/admin-48.png`, `admin-96.png` | Public footer, admin sidebar/login |
| `public/icons/admin-favicon.ico` | Admin tab favicon |

Deleting the old public icons would silently change the visible public PWA identity or break fallback routes. Because this task forbids visual and functional changes, **no referenced image files were deleted**. The editable public favicon in Appearance remains independent from the fixed admin icon.

## Other intentionally retained compatibility pieces

- `buttons.category` and old `settings` flags remain in historical migrations/D1 to preserve the database schema. Removing them requires a separate database migration and is out of scope.
- The `toast-error` selector is retained because it is constructed dynamically in client code.
- The `visually-hidden-input` class remains; only the unused older `visually-hidden` class was removed.
- `public/admin-uk.js`, `public/locales.js`, manifests and `public/sw.js` remain necessary for localization, PWA and notifications.

## Validation

- **49 / 49 automated tests passed** (46 existing tests and 3 new regression tests).
- Compared original and new CSS using PostCSS parsing: **all 584 active selector declarations**, including their exact order and media-query contexts, are preserved.
- Production API implementation, push engine, service worker, PWA manifests, D1 migrations and image assets were not changed.
- No new database migration or secret setup is required.

The production Cloudflare deployment and direct Android push delivery were not run in this environment; these remain deployment-level checks.
