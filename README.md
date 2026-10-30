# LinkHub

**Release:** `v0.2.0`  
**Runtime:** Cloudflare Workers + Static Assets  
**Database:** Cloudflare D1 (SQLite)  
**Client:** Vanilla JavaScript, HTML, CSS  
**Deployment domain:** Cloudflare `*.workers.dev` or a configured custom domain

LinkHub is a single-profile landing page with editable external destination buttons and **two independent event types**:

- **Page view** — a request to the root page or a configured entry path (for example, `/source-one`), including anonymous browser ID, source label, approximate country, device class, and timestamp.
- **Outbound click** — a click through `/out/:id`, including the destination identifier and the most recently attributed entry source where available.

Entry URLs display the landing page. They do **not** redirect visitors automatically. The visitor chooses a destination. The entry path identifies the shared link that was used; it is not proof of the actual referrer. The application does not store raw visitor IPs or HTTP referrers in analytics.

## Features

- One public profile with display name, headline, description, editable avatar and accent color.
- Avatar settings: hosted image URL or custom tile letters, background color, shape and live preview.
- Site favicon upload from admin (PNG, ICO or WebP, max 60 KiB), backed by D1; revert to the default icon at any time.
- Optional top-left logo and top tagline, independently enabled or disabled in Appearance.
- Public interface languages: English (default), Japanese, German, Spanish and French. The choice is stored in the visitor's browser. System labels and the default headline/description are localized; administrator-authored content is displayed as entered, rather than automatically translated.
- Multiple destination buttons, categories, visibility switches, color presets and ordering controls.
- Neutral example buttons and traffic sources are visible on first installation. Initial destinations use reserved `example.com` sample URLs and should be replaced before promotion.
- Source-specific entry paths configurable in admin; links from every source display the same public page.
- Dashboard: page views, unique visitors (browser-ID estimate), outbound clicks, approximate click-through rate, source/destination/country summaries, 14-day chart and recent activity.
- Period filters: Today, 7 days, This month and All time. Dates in analytics use UTC.
- Password-protected admin session with server-side revocation, origin checks and basic login throttling.
- No client framework build required. Tests use Node.js and SQLite.

## Repository layout

```text
LinkHub/
├── public/
│   ├── index.html                 # Shared public and admin document
│   ├── app.js                     # Public page and admin UI
│   ├── locales.js                 # Public interface translations
│   ├── admin-uk.js                # Admin UI translation helpers
│   ├── styles.css                 # Responsive styles
│   ├── icon.svg, favicon.ico      # Default brand icons
│   └── icons/                    # PWA icon files
├── src/worker.js                  # Worker routing, D1 queries, auth, tracking
├── migrations/
│   ├── 0001_init.sql             # Initial tables and neutral samples
│   └── 0002_public_identity.sql  # Upgrade: avatar, favicon, top bar, samples
├── tests/
│   ├── worker.test.js
│   └── integration.test.js
├── wrangler.jsonc                 # Worker + database binding
├── package.json
└── PATCHLIST.md
```

## Upgrade an existing v0.1.0 deployment (recommended order)

> **Preserve your `wrangler.jsonc` and its current `database_id`.** This is an upgrade of the same repository and the same D1 database, **not a new installation**. Do not create a new database, change the Worker name, or reinitialize existing production data.

1. Save a backup of the project and, where appropriate, export D1 before modifying production. Copy the new `v0.2.0` files into your existing repository. Keep `.dev.vars` and configured secrets out of Git.
2. In the project folder, install dependencies and run tests:

   ```powershell
   npm install
   npm test
   ```

3. Apply pending migrations to your **local** database (if using local development):

   ```powershell
   npm run db:local
   ```

4. Apply pending migrations to your **existing remote** database:

   ```powershell
   npm run db:remote
   ```

   Wrangler records previously executed migration filenames, so on an existing v0.1.0 database it should run **only `0002_public_identity.sql`**. This adds the new settings fields without deleting events or user links. Existing example rows are updated only when their original title and example URL were never customized; already customized destinations remain unchanged.

5. Deploy the updated Worker and assets:

   ```powershell
   npm run deploy
   ```

6. Reload the public page and `/admin` (use a hard refresh if a previous JS asset was cached). In **Appearance**, configure the favicon, avatar, and top-bar visibility. In **My links**, confirm the visible sample buttons and replace their `example.com` destinations with real URLs.

7. Push the updated code to the existing LinkHub repository if you deploy from Git:

   ```powershell
   git add .
   git commit -m "feat: add public localization and appearance controls"
   git push
   ```

**Do not change the `0001_init.sql` migration filename**, since it is already tracked by Wrangler in production. The additional settings are introduced by `0002_public_identity.sql`. When deploying from source that already ran `0001_init.sql` as v0.1.0, its original contents are not re-executed.

### Why do the example buttons appear now?

The previous release stored example buttons with `active=0`, so the public API deliberately excluded them. v0.2.0 ships neutral sample names and safe placeholder URLs, and makes the **untouched** example records active after migration. This changes demo visibility without changing your custom destinations or deleting analytics events. If you intentionally hid a default example and did not otherwise edit it, the upgrade may make that sample visible again: review **My links** after upgrading.

### Notes on routing and free usage

`wrangler.jsonc` uses `assets.run_worker_first: true`, which ensures dynamic entry routes and `/site-icon` reach the Worker before assets are served. This also means static requests invoke the Worker before being forwarded to the asset binding and may count toward Worker request quotas. For small personal sites this is usually fine; review your Cloudflare usage if traffic grows.

## Fresh installation

1. Install a current Node.js LTS release. Create a Cloudflare account and use an existing/new code repository as desired.
2. Unzip the application into a project directory and run:

   ```powershell
   npm install
   npm test
   npx wrangler login
   npx wrangler d1 create linkhub-db
   ```

3. Paste the returned D1 `database_id` into `wrangler.jsonc`, preserving binding name `DB` and `database_name: "linkhub-db"`. **For upgrades, retain your existing database ID instead.**
4. Copy `.dev.vars.example` to `.dev.vars`, and set a long `ADMIN_PASSWORD` and unique `SESSION_SECRET` of at least 32 characters. Generate a random value with:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

5. Initialize local D1 and run locally:

   ```powershell
   npm run db:local
   npm run dev
   ```

   Open `http://localhost:8787/` for the public page and `http://localhost:8787/admin` for the admin panel.
6. For production, initialize remote D1 and deploy:

   ```powershell
   npm run db:remote
   npm run deploy
   npx wrangler secret put ADMIN_PASSWORD
   npx wrangler secret put SESSION_SECRET
   ```

   The secret commands prompt for values and configure production secrets; `.dev.vars` is local only.
7. Visit the Worker URL shown by Wrangler. The initial source paths are `/source-one`, `/source-two`, etc. Copy them from **Traffic sources**. The page loads the same content for every configured source.

## Appearance / favicon settings

- **Display name, headline, bio:** public content supplied by the administrator.
- **Avatar image URL:** optional external HTTPS image. If blank, the app renders the avatar text; if that is blank, the initials of the display name.
- **Avatar text/background/shape:** custom text, background color, and rounded / square / circular outline.
- **Site favicon:** upload PNG, ICO or WebP up to 60 KiB. The admin writes the data to D1; the Worker serves it from `/site-icon` and `/favicon.ico` with the appropriate content type. An empty custom icon uses the default SVG.
- **Top-of-page elements:** independent visibility controls for the small LinkHub mark and its accompanying tagline. The public language selector remains available even if both are hidden.

## Analytics and privacy

| Field | Meaning |
| --- | --- |
| Views | Count of tracked landing page requests. |
| Unique visitors | Count of distinct anonymous browser cookies (not verified people). |
| Outbound clicks | Clicks through the first-party `/out/:id` route. |
| CTR | Outbound clicks divided by page views (can exceed 100%). |
| Source | The entry path used; may differ from the actual referring site. |
| Country | Approximate country code supplied by Cloudflare; may be empty locally. |
| Event time | UTC Unix timestamp. |

The system filters known bot/prefetch user agents, but it cannot identify all automated traffic. It stores an anonymous browser UUID in a first-party cookie and tracks the last entry source in another cookie. Administrator login throttling uses a keyed hash of the requester address, not the raw address.

## Localized content limits

The public language switcher translates system text, instructions, category labels for the built-in sample categories, and unchanged default headline/description text. **Custom display names, headlines, descriptions, destination titles, subtitles and category names are shown exactly as the administrator entered them.** Translation of custom editorial content would require storing separate language variants, which this release does not implement.

## Troubleshooting

- **New fields missing / API returns 500:** run `npm run db:remote` against the correct D1 database *before* deploying. Check the `database_id` and applied migration list.
- **Sample buttons do not appear:** open **My links** and confirm each entry is marked **Live**. The public API returns only active entries. Custom entries that were hidden intentionally remain hidden.
- **Favicon does not change:** verify the uploaded file is PNG, WebP or ICO and <= 60 KiB. Reload the public page; browsers may briefly cache favicons.
- **Login fails in production:** configure `ADMIN_PASSWORD` and `SESSION_SECRET` as Worker secrets (not just in `.dev.vars`).
- **Source path returns 404:** verify the entry exists and is active; check `run_worker_first: true` in `wrangler.jsonc`.
- **Local country unknown:** Cloudflare location metadata is generally unavailable in local mode.
- **Cost:** free tiers have request, query and storage limits. They are not guarantees of unlimited capacity.

## Reference documentation

- Workers static assets: https://developers.cloudflare.com/workers/static-assets/
- Static asset routing: https://developers.cloudflare.com/workers/static-assets/binding/
- D1 migrations: https://developers.cloudflare.com/d1/reference/migrations/
- Worker secrets: https://developers.cloudflare.com/workers/configuration/secrets/
- Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- D1 pricing: https://developers.cloudflare.com/d1/platform/pricing/

**Suggested commit:** `feat: add public localization and appearance controls`  
**Tag:** `v0.2.0`
