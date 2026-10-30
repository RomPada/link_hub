# LinkHub

A self-hosted, single-profile link landing page with independent analytics for incoming visits and outbound destination clicks. Built on **Cloudflare Workers**, **Cloudflare D1**, and lightweight browser-native HTML/CSS/JavaScript.

**Version:** 0.3.1 · **Runtime:** Cloudflare Workers · **Database:** D1 (SQLite) · **Default public language:** English

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

- Responsive personal profile: display name, headline, bio, and avatar image or customizable monogram tile.
- Grouped destination buttons with editable descriptions, colors, order, and visibility.
- Destination icons: automatic `/favicon.ico` from the destination origin, custom image URL, upload (PNG/WebP/ICO, up to 60 KiB), or the default arrow. A missing auto icon falls back to the arrow.
- Editable browser favicon (PNG/WebP/ICO), stored in D1.
- Live accent color applied to highlights, link arrows, and interactive states.
- SVG-based language selector with a centered globe/chevron for English (default), Japanese, German, Spanish, and French. Interface copy is localized; user-authored names and descriptions are not translated automatically.

**Administration and analytics**

- Password-based admin login and revocable sessions; same-origin checks for data-changing requests and login rate limiting.
- Create, edit, pause, and delete entry sources and destination buttons; reorder buttons.
- Analytics periods: Today, 7 days, This month, All time (UTC boundaries).
- Interactive dashboard cards for Page views, Unique visitors and Outbound clicks: open detailed event logs for the selected period (up to 250 records). CTR is a read-only calculated metric with no detail dialog.
- Individual event deletion with confirmation (permanent, authenticated, reflected immediately in analytics).
- Human-readable country names next to ISO country codes and keyboard-accessible admin language selector.
- Source, destination, and country rankings, a 14-day chart (today first), and recent events.
- English / Ukrainian admin interface; default English.

**Operational design**

- No runtime dependency on third-party analytics products.
- No React/Next.js build step; assets are deployed with one Worker.
- D1 migration files are additive and applied using Wrangler. v0.3.1 does not require a new migration.
- Runs on Cloudflare Free plans within the platform's request and database limits. A `*.workers.dev` deployment doesn't require a purchased domain.

## Requirements

- Node.js 22 or newer (LTS recommended).
- npm, a Cloudflare account, and Wrangler (installed through `npm install`).
- An existing D1 database for upgrades, or a new database for first installation.

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

Then run:

```bash
npm run db:local
npm run dev
```

Open the localhost address printed by Wrangler (normally `http://localhost:8787`). Visit `/admin` to sign in. **The local D1 database and remote D1 database are separate**; local changes do not automatically appear in production.

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

Wrangler prints the `*.workers.dev` address after deployment. Configure the profile, destination URLs, button icons and entry sources from `/admin`. For an existing installation, verify a sample visit and an outbound click after the migration.

### Migrations

| File | Scope |
| --- | --- |
| `migrations/0001_init.sql` | Settings, sources, buttons, events, sessions; neutral sample entries |
| `migrations/0002_public_identity.sql` | Public identity and custom site favicon fields |
| `migrations/0003_button_icons.sql` | Destination button icon mode, URL, and uploaded image |

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
