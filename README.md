# LinkHub

> **Current version: v0.5.3.** LinkHub uses a fixed, rounded-square icon with transparent outer corners for the admin dashboard, admin PWA, and public-page footer. The public page's **browser favicon remains configurable** under **Appearance → Site favicon**. Admin and public icon preferences are independent. No D1 migration is required for this update.

A self-hosted, single-profile link landing page with independent analytics for incoming visits and outbound destination clicks. Built on **Cloudflare Workers**, **Cloudflare D1**, and lightweight browser-native HTML/CSS/JavaScript.

**Version:** 0.5.3 · **Runtime:** Cloudflare Workers · **Database:** D1 (SQLite) · **Default public language:** English

## Overview

Visitors open the same landing page at `/` or through an administrator-defined entry URL, such as `/source-one`. Each entry URL is attributed to its configured source. On the landing page, visitors choose which external destination to open. A tracked outbound route, `/out/:id`, records their selection before redirecting.

These are independent metrics:

| Metric | Definition |
| --- | --- |
| Page views | Counted page visits, excluding detected bots and prefetches |
| Unique visitors | Approximate distinct browser identifiers for page views within the selected period |
| Outbound clicks | Clicks on a configured destination button |
| Click-through rate | Outbound clicks divided by page views; not a per-visitor conversion rate |

Source attribution reflects the entry URL used, not a verified upstream website. Country comes from Cloudflare's approximate country metadata. The dashboard displays human-readable names with ISO codes (such as Netherlands (NL)). For local development (`localhost`), country is recorded as unknown because a development proxy can otherwise be mistaken for a visitor's location. Cloudflare geolocation can also be affected by VPNs and proxies; historic country codes cannot be retroactively corrected. Analytics data contains anonymous browser identifiers, country codes, device categories, and timestamps; the app does not persist raw visitor IPs or HTTP referrer URLs.

## Features

**Public page**

- Responsive social-style profile with cover image, overlapping avatar, display name, headline, and bio. Cover and avatar can use HTTPS image URLs or uploaded PNG/JPEG/WebP images (256 KiB each). A built-in gradient and monogram are the fallbacks.
- Single ordered list of destination buttons with editable descriptions, colors, order, and visibility (no categories).
- Destination icons with a styled, keyboard-operable mode selector: automatic `/favicon.ico` from the destination origin, custom image URL, upload (PNG/WebP/ICO, up to 60 KiB), or the default arrow. A missing auto icon falls back to the arrow.
- Editable browser favicon (PNG/WebP/ICO), stored in D1.
- Live accent color applied to highlights, link arrows, and interactive states.
- SVG-based language selector with a centered globe/chevron for English (default), Japanese, German, Spanish, and French. Interface copy is localized; user-authored names and descriptions are not translated automatically.

**Administration and analytics**

- Password-based admin login and revocable sessions; same-origin checks for data-changing requests and login rate limiting.
- Create, edit, pause, and delete entry sources and destination buttons. The admin and public page use the same unified ordering; the up/down controls reorder across the entire list.
- Analytics periods: Today (the default when opening the admin dashboard), 7 days, This month, All time (UTC boundaries).
- Interactive dashboard cards for Page views, Unique visitors and Outbound clicks: open detailed event logs for the selected period (up to 250 records). CTR is a read-only calculated metric with no detail dialog.
- Individual event deletion with confirmation (permanent, authenticated, reflected immediately in analytics).
- Human-readable country names next to ISO country codes and keyboard-accessible admin language selector.
- Source, destination, and country rankings, a 14-day chart (today first, with scrollable, angled labels on narrow screens), and recent events showing device type.
- English / Ukrainian admin interface; default English. The `/admn` login page is always English.
- Installable **LinkHub Admin** PWA with its own `/admn` manifest and a service worker for browser push notifications.
- Dedicated **Notifications** workspace with keyboard-operable custom selectors for device, source and delivery interval: up to 8 subscribed administrator devices, test pushes, per-device enable/mute, page visits, new unique visitors and outbound clicks; source filters and 0/1/5/15-minute throttling.
- Web Push uses VAPID and Web Crypto without a paid push service. No notification permission is requested from public visitors.

**Appearance and layout**

- The full-width Appearance form includes a social-profile preview and controls for cover image URL/upload/removal, avatar image URL/upload/removal, fallback letters, avatar shape, and accent color.
- The public-page shortcut remains available in the sidebar, without a duplicate action inside Appearance. Mobile navigation uses a full-width sticky header with a burger-menu button instead of horizontally scrolling tabs. The menu stays accessible while the page scrolls and includes Open public page (new browser tab) and Sign out.

**Operational design**

- No runtime dependency on third-party analytics products.
- No React/Next.js build step; assets are deployed with one Worker.
- D1 migration files are additive and applied using Wrangler. v0.5.0 introduced device subscriptions (`0005_notifications.sql`); v0.5.3 does not change the database schema.
- Runs on Cloudflare Free plans within the platform's request and database limits. A `*.workers.dev` deployment doesn't require a purchased domain.

## Requirements

- Node.js 22 or newer (LTS recommended).
- npm, a Cloudflare account, and Wrangler (installed through `npm install`).
- An existing D1 database for upgrades, or a new database for first installation.

## Upgrade from v0.5.2

Keep the existing GitHub repository, Cloudflare Worker, D1 database, `database_id` in `wrangler.jsonc`, `.dev.vars` and production secrets. **No D1 migration or VAPID key rotation is required for v0.5.3.**

```bash
npm install
npm test
npm run dev
```

Verify that the private `/admn` interface uses the new LinkHub mark, and that the public page footer also shows that mark. In **Appearance → Site favicon**, upload a public favicon to change the public browser tab icon; this must not change the private admin icon. Then publish the update:

```bash
npm run deploy
```

The installed admin PWA uses separate branded icon assets. Browser and Android launcher caches may retain the former icon temporarily; reopen the PWA, and if needed remove and reinstall the admin shortcut to refresh its icon. This affects the launcher icon only and does not erase server-side links, statistics or push subscriptions.

## Quick start: local development

Run these commands in the repository root:

```bash
npm install
npm test
npx wrangler login
```

**New installation only:** create a D1 database and copy its `database_id` into the existing `d1_databases[0].database_id` value in `wrangler.jsonc`:

```bash
npx wrangler d1 create linkhub-db
```

**Existing installation:** retain the current Worker name, D1 binding, and `database_id` in `wrangler.jsonc`. Do not create another database or copy the example `database_id` over an active configuration.

Create your local secrets file:

```bash
cp .dev.vars.example .dev.vars
```

On Windows PowerShell, use `Copy-Item .dev.vars.example .dev.vars` instead. Set `ADMIN_PASSWORD` and a long random `SESSION_SECRET` in `.dev.vars`. Generate a random hex value with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

To enable push alerts, generate VAPID keys once and place them in `.dev.vars`, along with your existing admin secrets (instructions below).

Then run:

```bash
npm run db:local
npm run dev
```

Open the localhost address printed by Wrangler (normally `http://localhost:8787`). Visit `/admn` to sign in. The old `/admin` address is no longer available. **The local D1 database and remote D1 database are separate**; local changes do not automatically appear in production.

## Deploy to Cloudflare

Apply pending migrations to the existing remote database **before deploying the new Worker code**:

```bash
npm run db:remote
```

Review the migration confirmation, then deploy:

```bash
npm run deploy
```

Set production secrets for the Worker:

```bash
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET
```

Secrets persist across future deployments. They must not appear in GitHub. If production secrets were previously configured, do not rotate them unnecessarily.

To enable push in production, also set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` using `npx wrangler secret put NAME`. Follow the Android installation section below.


Wrangler prints the `*.workers.dev` address after deployment. Configure the profile, destination URLs, button icons and entry sources from `/admn`. For an existing installation, verify a sample visit and an outbound click after the migration.

### Migrations

| File | Scope |
| --- | --- |
| `migrations/0001_init.sql` | Settings, sources, buttons, events, sessions; neutral sample entries |
| `migrations/0002_public_identity.sql` | Public identity and custom site favicon fields |
| `migrations/0003_button_icons.sql` | Destination button icon mode, URL, and uploaded image |
| `migrations/0004_profile_header.sql` | Cover-image URL/upload, uploaded avatar; disables old categories while preserving destinations and event history |
| `migrations/0005_notifications.sql` | Browser push subscriptions and device preferences |

Wrangler tracks applied migrations. `npm run db:local` and `npm run db:remote` apply only pending migrations in their respective databases. **Existing records are retained.** Keep a D1 backup before upgrading a production database.

## Environment and configuration

| Name | Location | Description |
| --- | --- | --- |
| `ADMIN_PASSWORD` | `.dev.vars` / Worker secret | Private dashboard password |
| `SESSION_SECRET` | `.dev.vars` / Worker secret | Session and login-protection secret; use 32+ random bytes |
| `DB` | `wrangler.jsonc` D1 binding | D1 database binding name |
| `ASSETS` | `wrangler.jsonc` assets binding | Static files from `public/` |

Do not commit `.dev.vars`, keys, passwords, or session secrets. Do not change a production `database_id` while upgrading.

## Repository structure

```text
public/              Frontend HTML, CSS, JavaScript and localization
src/worker.js        Worker routes, authentication, analytics and D1 data access
migrations/          Ordered D1 migrations
  0001_init.sql
  0002_public_identity.sql
  0003_button_icons.sql
  0004_profile_header.sql
  0005_notifications.sql
tests/               Node.js integration, unit and frontend tests
wrangler.jsonc       Worker routing, static asset and D1 bindings
package.json         npm commands and development dependencies
PATCHLIST.md         Release history
```

## Commands

| Command | Purpose |
| --- | --- |
| `npm install` | Install the development toolchain |
| `npm test` | Execute the automated test suite |
| `npm run dev` | Run the Worker and local D1 in development |
| `npm run db:local` | Apply pending migrations to local D1 |
| `npm run db:remote` | Apply pending migrations to remote D1 |
| `npm run deploy` | Publish the Worker and frontend assets |

## Usage notes

- Replace neutral sample destinations (`example.com`) before sharing the public page.
- Automatic destination favicons use `https://destination-domain/favicon.ico`; availability depends on the destination's server and browser policies. Choose Image URL or Upload when you need a precise icon.
- Uploaded icons are limited to PNG, WebP, and ICO images; SVG and HTML are intentionally disallowed.
- Editing or pausing a destination doesn't erase existing event history. Deletion retains stored event names but nulls deleted foreign-key relationships.
- A previously assigned source may be carried to an outbound click in the same browser via a first-party cookie; it is not guaranteed attribution across devices or browsers.
- D1 / Worker free-tier limits and pricing are subject to Cloudflare's current terms.

## Security

The admin dashboard requires authentication. Passwords and session secrets are provided as Worker secrets rather than bundled into static assets. Visitor identifiers are first-party, pseudonymous cookies, not authenticated users. Treat analytics as approximate and disclose tracking according to applicable law and your privacy policy.

## Versioning

This project uses Semantic Versioning and Conventional Commits. See [`PATCHLIST.md`](PATCHLIST.md) for release notes.

## Android installation and Web Push

The admin can be installed as a standalone Android PWA. Use a deployed HTTPS `*.workers.dev` address (or an HTTPS custom domain). Localhost supports service workers for desktop development, but a Codespaces preview/iframe is not a reliable Android push environment.

### One-time VAPID setup

Generate a key pair from the project root:

```bash
npm run vapid:generate
```

Store the resulting pair securely. Do not change it after registering devices: changing the public key invalidates existing subscriptions. Set a **real contact email** in `VAPID_SUBJECT`, formatted as `mailto:address@domain.com`.

For local use, append the following **real values** to your existing `.dev.vars`:

```dotenv
VAPID_PUBLIC_KEY=<generated-public-key>
VAPID_PRIVATE_KEY=<generated-private-key>
VAPID_SUBJECT=mailto:<your-real-contact-email>
```

For the deployed Worker, configure the **same** credentials as secrets:

```bash
npx wrangler secret put VAPID_PUBLIC_KEY
npx wrangler secret put VAPID_PRIVATE_KEY
npx wrangler secret put VAPID_SUBJECT
```

Paste each value at Wrangler's prompt. Never commit `.dev.vars` or private VAPID keys into Git. `ADMIN_PASSWORD` and `SESSION_SECRET` remain unchanged. **Run `npm run db:local` / `npm run db:remote` before the new code as appropriate.**

### Install on Android and enable alerts

1. Open `https://<your-worker>.workers.dev/admn` in **Chrome for Android** and sign in.
2. Open **Notifications** using the compact mobile section menu.
3. Tap **Install admin app**, or use Chrome **⋮ → Install app** / **Add to Home screen** if there is no install prompt.
4. Launch **LinkHub Admin** from the phone's home screen (start URL `/admn`).
5. Visit **Notifications → Enable notifications** and grant Android/browser notification permission.
6. Select the registered device, then choose **New unique visitors**, **Outbound button clicks**, **All other page visits**, a particular traffic source (or all), and the **minimum interval** between alerts. Save preferences.
7. Tap **Send test**; check the Android notification tray. A push service accepting the message does not guarantee immediate delivery to the phone.

### Behavior, security, and costs

- Notifications are sent **after events are stored**; failed delivery does not interrupt link tracking or analytics.
- New unique visitors are determined by a browser's anonymous visitor ID, not a verified individual.
- The minimum interval suppresses notifications during the selected interval; suppressed events are **not queued** or summarized. An interval of zero can produce many notifications and increase D1/Worker usage.
- Each device can be configured, muted, tested, or removed independently (up to 8). Subscriptions expired with HTTP 404/410 are removed automatically.
- Payloads include at most the source, destination name and approximate country, **not visitor IDs, IPs or referrer URLs**.
- Push subscriptions and settings are administrator-only and require same-origin writes; browser push endpoints are restricted to known providers to prevent SSRF.
- The service worker does **not cache private pages or analytics data**. If your admin session expires, you still have to sign in.
- Web Push itself does not require a paid provider, but Worker and D1 usage must stay within the Cloudflare free-tier limits; delivery is best-effort and can be limited by browser, Android battery/permission settings or network availability.

### Troubleshooting

If you see a D1 table error after upgrading, run the correct migration (`npm run db:local` for local development or `npm run db:remote` for production) **before launching the new Worker**. For missing push notifications, check the real HTTPS deployment, VAPID configuration, Android permissions and **Send test**. If you rotate VAPID keys, re-enable push on every device.

### Push delivery diagnostics

1. Verify your Worker is deployed with `npm run deploy`, then open the LinkHub Admin PWA on Android at `/admn`.
2. Go to **Notifications**, confirm notifications are enabled on your phone, and press **Send test**. The endpoint must be registered, Android notification permission must be granted, and your device must have connectivity.
3. A successful test means **accepted by the push service**, not guaranteed delivery to Android. If it is accepted but unseen, check Android Settings → Apps → LinkHub Admin (or Chrome) → Notifications, any browser-site permissions, and battery/background restrictions.
4. HTTP **401/403** from the push service: check that the three production secrets `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` match your existing key pair, and that the subject contains a valid contact address. Do not expose the private key in logs or GitHub.
5. HTTP **404/410**: the stored browser push endpoint expired; use **Enable notifications** again on the Android device to register a fresh subscription. Other statuses are shown in the admin toast.
6. For more detail, use `npx wrangler tail` during a test. Server logs include HTTP status codes but never expose the browser endpoint or private keys.

The **Menu** burger in the mobile dashboard is sticky. It remains at the top during scrolling, opens a vertical workspace list, and closes when you tap outside it, choose a section, or press Escape.
