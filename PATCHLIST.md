# LinkHub — Patch List

All release notes are maintained in English. Releases follow Semantic Versioning.

---

## v0.2.0 — International landing page and identity controls · 2026-10-30

### Added

- Public interface language selector with English as default and Japanese, German, Spanish and French available.
- Editable avatar tile text, background and shape, with optional external profile image.
- Custom site favicon upload (PNG, ICO, WebP) from Appearance, served via a first-party Worker route and stored in D1.
- Independent visibility controls for the public header mark and tagline.
- Neutral, active example destinations on the landing page with safe `example.com` placeholder URLs.
- Additional D1 migration for profile customization and preservation of existing deployments.
- Automated tests for public example visibility, avatar settings and favicon validation.

### Improved

- Fixed Worker-first asset routing for dynamic source paths and custom icon requests.
- Kept configured links, existing events, entry URLs and admin credentials intact during upgrade.
- Updated technical documentation and neutral examples for a reusable, brand-agnostic project.

**Commit:** `feat: add public localization and appearance controls`  
**Tag:** `v0.2.0`

---

## v0.1.0 — Initial MVP · 2026-10-30

- Cloudflare Worker and D1-backed public profile with editable destinations.
- Independent page-view and outbound-click analytics with entry-source attribution.
- Basic dashboard, private admin, content management and example records.
- Password-based sessions, bot filtering and first-party visitor identification.
- Included initial schema, tests and deployment instructions.

**Commit:** `feat: launch LinkHub MVP with source and outbound analytics`  
**Tag:** `v0.1.0`
