# LinkHub

**Version:** `v0.1.0`  
**Language:** English-only UI and documentation  
**Architecture:** Cloudflare Workers + Static Assets + Cloudflare D1 (SQLite)  
**Repository:** a **new GitHub repository**, separate from TrackLink

LinkHub is a personal landing page with editable external buttons (Patreon, SubscribeStar, X, GitHub, etc.) and **two separate, built-in analytics channels**:

1. **Page visits by entry source:** `/ig`, `/tg`, `/reddit`, `/x`, `/fb` all display the same public page. LinkHub records which short entry URL was used, plus anonymized browser ID, approximate country, device class, and timestamp.
2. **Outbound button clicks:** clicking a button uses a first-party `/out/ID` redirect. LinkHub records the destination button and, when available, the **entry source that brought the visitor to the hub**.

The user chooses the next destination — **there is no automatic redirect from the entry URLs**.

## What you get in v0.1.0

- A responsive landing page for **one** personal brand or profile.
- Brand display name, headline, bio, optional avatar URL, and accent color editable from the admin panel.
- Curated external buttons with optional subtitles, categories, pastel colors, visibility, and display order.
- Five pre-created traffic-source URLs: `ig`, `tg`, `fb`, `x`, and `reddit`; add or edit more.
- Dashboard with **Today / Last 7 days / This month / All time**.
- Separate **Page views**, **Unique visitors**, **Outbound clicks**, and approximate **Click-through rate**.
- Source breakdown, destination-button breakdown, countries, and recent events.
- 14-day chart ordered **Today → Yesterday → older days**, including zero-activity days.
- Password-protected private admin dashboard (server-side session cookie, login attempt throttling).
- Anonymous browser UUID cookie. The Worker **does not store IP addresses or HTTP referrers** in analytics.
- No external analytics provider or separate redirect SaaS.
- No React / Next.js / frontend build step: static HTML, CSS and JS are served directly. Wrangler deploys both the Worker and static assets.

### What is NOT part of v0.1.0

- Multiple user accounts, multiple LinkHub sites, automatic referrer attribution, verified unique humans, conversions or sales tracking, or Web Push notifications.
- Push notifications on Android and custom domains are possible next milestones, **not included yet**.

## What it looks like

```text
Instagram  ──> https://linkhub.<your-subdomain>.workers.dev/ig ───┐
Telegram   ──> https://linkhub.<your-subdomain>.workers.dev/tg ───┤
Reddit     ──> https://linkhub.<your-subdomain>.workers.dev/reddit ┤
Direct     ──> https://linkhub.<your-subdomain>.workers.dev/ ─────┤
                                                                │
                                                       PUBLIC LINKHUB
                                                      /      |       \
                                                 Patreon   X   SubscribeStar
                                                      \      |       /
                                                outbound clicks measured
```

`/ig` means that the **Instagram-designated link** was used. It does not prove the user actually came from Instagram: people can forward links between platforms. This is more dependable than relying on HTTP `Referer`, which is often removed by social apps.

## Cost: $0 on the free tiers (within platform limits)

| Service | Usage |
| --- | --- |
| GitHub | Free repository for your code. |
| Cloudflare Workers Free | Cloud-hosted Worker and free `*.workers.dev` subdomain; currently 100,000 Worker requests/day. |
| Cloudflare Static Assets | Included with the Worker, no separate hosting bill. Static file requests are served asset-first wherever possible. |
| Cloudflare D1 Free | Free tier currently includes 5 million rows read/day, 100,000 rows written/day, and up to 5 GB stored. |
| Custom domain | Not required; you can add one later for a separate registration cost. |

**Important:** Free limits are quotas, not a promise of unlimited availability. When Free limits are reached, requests or database operations may fail until the quota resets. Event inserts also update indexes and can consume multiple D1 written-row units. Check the official Cloudflare usage dashboard periodically.

## Setup — step-by-step (Windows-friendly)

### 1. Requirements

Install Node.js (current LTS is recommended), and sign up for a Cloudflare account. Use your **existing GitHub account**, but create a **new repository named `LinkHub`** (do not overwrite TrackLink).

Extract this ZIP into a separate folder, for example `C:\\Projects\\LinkHub`.

Open PowerShell in that folder and run:

```powershell
npm install
npm test
```

> `npm test` runs the included Node.js tests without connecting to Cloudflare.

### 2. Log in to Cloudflare and create a database

```powershell
npx wrangler login
npx wrangler d1 create linkhub-db
```

Cloudflare prints a `database_id` (UUID), for example:

```text
database_id = "11111111-2222-3333-4444-555555555555"
```

Open **`wrangler.jsonc`** and replace this placeholder:

```json
"database_id": "00000000-0000-0000-0000-000000000000"
```

with the **actual database ID** printed by Cloudflare. Keep `binding: "DB"` and `database_name: "linkhub-db"` unchanged.

> You must create **your own** D1 database. The ZIP cannot contain an account-specific database ID.

### 3. Create local admin secrets

Copy `.dev.vars.example` to `.dev.vars`:

```powershell
Copy-Item .dev.vars.example .dev.vars
```

Open `.dev.vars` in a text editor and set:

- `ADMIN_PASSWORD`: your unique, strong admin password (at least 12 characters).
- `SESSION_SECRET`: a random secret (at least 32 characters).

Generate a strong secret in PowerShell:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the 64-character hex string as `SESSION_SECRET`.

**Never commit `.dev.vars` to GitHub**. It is already listed in `.gitignore`.

### 4. Create your local database tables

```powershell
npm run db:local
```

This applies `migrations/0001_init.sql` to Wrangler's local D1 database. It creates sample sources and **disabled** example destination buttons.

### 5. Start the website locally

```powershell
npm run dev
```

Wrangler usually prints a URL like:

- Public page: `http://localhost:8787/`
- Instagram source link: `http://localhost:8787/ig`
- Admin: `http://localhost:8787/admin`

Sign in using `ADMIN_PASSWORD` from your `.dev.vars` file.

### 6. Configure your public profile and buttons

In **Appearance**, change the display name, headline, bio and color.

In **My links**, edit the existing **inactive examples**:

- Replace `https://www.patreon.com/` with your real Patreon profile URL, then select **Visible on public page**.
- Do the same for SubscribeStar, X, GitHub, or create your own buttons.
- Categories create separate sections on the public page.
- Use the ↑ / ↓ controls to change display order.

In **Traffic sources**, copy the short entry links and place them on the matching platforms.

### 7. Initialize the production D1 database

The local database from step 4 is **separate** from your production database. Run:

```powershell
npm run db:remote
```

You only need to run migrations once for the production database. Later migrations will be versioned.

### 8. Deploy to Cloudflare Workers

```powershell
npm run deploy
```

Wrangler will print a URL such as:

```text
https://linkhub.<your-workers-subdomain>.workers.dev
```

This is **`workers.dev`**, not `pages.dev`, because this build uses a **single Cloudflare Worker with Static Assets** rather than a standalone Cloudflare Pages project. Both provide free technical domains, but the combined Worker makes source tracking and D1 easier to deploy together.

### 9. Set production secrets

Run these commands **after your first deploy**:

```powershell
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET
```

Wrangler asks you to enter each secret privately. Use the same values as local development if you want the same admin password. Do **not** put these secrets into `wrangler.jsonc` or GitHub.

Open your production `/admin` and sign in. If the page reports secrets are missing, check both secrets in your Cloudflare Worker settings.

### 10. Push to a NEW GitHub repository

Create an empty repository called `LinkHub` in GitHub. In the LinkHub folder run:

```powershell
git init
git add .
git commit -m "feat: launch LinkHub MVP with source and outbound analytics"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/LinkHub.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your own GitHub username. **Do not** reuse the TrackLink repository. If the existing repository has a README or initial commit, reconcile it before pushing.

**Optional automatic deployment:** In Cloudflare **Workers & Pages**, open the Worker named `linkhub`, choose its **Builds / Git integration** settings and connect the new GitHub repository. The project name must match the `name` field in `wrangler.jsonc`; configure build/deploy commands as shown by Cloudflare (with no frontend build step, deployment uses `npx wrangler deploy`). Afterwards Cloudflare can redeploy on each push.

## Dashboard analytics explained

| Metric | Definition |
| --- | --- |
| Page views | Counted human-like `GET` visits to `/`, `/ig`, `/tg`, etc. |
| Unique visitors | Distinct anonymous `lh_visitor` cookie UUIDs in the selected period. **Approximation**, not verified unique people. |
| Outbound clicks | Counted human-like clicks on visible buttons via `/out/ID`. |
| Click-through rate | Outbound clicks divided by page views (can exceed 100% if users click multiple buttons). |
| Traffic sources | Entry paths like `/ig`. Clicking a button carries forward the last entry source through a first-party cookie. |
| Countries | Cloudflare's approximate IP-country field, stored as a 2-letter country code; **raw IP is not stored**. |
| Dates | UTC in v0.1.0; the 14-day chart shows Today first. |

Events are stored in the `events` D1 table. It has `kind`, `source_name`, `button_name`, a random browser UUID, country code, device class and timestamp. **No raw IP or HTTP `Referer` is stored in analytics.** Social previews and common crawlers are filtered, but bot detection is approximate.

The `login_attempts` table keeps a temporary **HMAC-hashed** requester IP identifier to slow password guessing; it does not contain raw IP addresses. Session tokens are stored as SHA-256 hashes and are invalidated server-side on logout. Passwords and secrets belong only in Cloudflare secrets, not in the database.

## Project structure

```text
LinkHub/
├── public/
│   ├── index.html              # One public landing document + admin shell
│   ├── app.js                  # Public and admin frontend logic
│   ├── styles.css              # Responsive design
│   ├── favicon.ico, icon.svg   # Branding assets derived from TrackLink
│   └── icons/                  # App icons
├── src/worker.js               # Tracking, API, auth, redirect, D1
├── migrations/0001_init.sql    # Initial D1 schema and example records
├── tests/worker.test.js        # Node integration/smoke tests
├── wrangler.jsonc              # Worker + D1 + asset bindings
├── package.json
├── PATCHLIST.md
└── README.md
```

## Frequently asked questions

**Why aren't my Patreon and SubscribeStar buttons showing yet?**  
Sample buttons start disabled. Enter real destination URLs and enable them from the admin dashboard.

**Why are there zero visits after I open `/admin`?**  
The admin page does not count as a landing-page visit. Open `/` or an active source path to generate visits.

**Why do local visitors show an unknown country?**  
Country detection comes from Cloudflare's production request metadata. It is usually unavailable in local tests.

**Why are page views and outbound clicks different?**  
Some visitors leave without clicking, while others may click several buttons. They are separate events by design.

**Is this completely free forever?**  
It can run at **$0 while you stay within the relevant free-plan limits**. Those limits and terms may change. No monthly paid tool is hardwired into the project.

**Can I add Android push notifications later?**  
Yes. The current architecture has discrete visit and outbound events, which can later trigger notifications. Push subscriptions, service-worker handling and notification preferences are not in the first release.

## Docs

- Cloudflare Workers with Static Assets: https://developers.cloudflare.com/workers/static-assets/
- Wrangler D1 migrations: https://developers.cloudflare.com/d1/reference/migrations/
- Workers secrets: https://developers.cloudflare.com/workers/configuration/secrets/
- GitHub auto-deployment: https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/
- Workers Free pricing: https://developers.cloudflare.com/workers/platform/pricing/
- D1 pricing: https://developers.cloudflare.com/d1/platform/pricing/

**Suggested Conventional Commit:** `feat: launch LinkHub MVP with source and outbound analytics`  
**Release tag:** `v0.1.0`
