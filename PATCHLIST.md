# LinkHub · Release Notes

## v0.3.1 — Language controls, country display and event management

- Replaced font-dependent globe and dropdown characters with consistent SVG icons, with centered chevron rotation.
- Redesigned the admin-language picker to match the public language menu, with keyboard navigation.
- Improved country presentation using human-readable country names alongside ISO codes; mark localhost traffic as unknown instead of using a proxy's country.
- Added global Escape handling and focus restoration for analytics dialogs.
- Kept CTR as a non-interactive calculation, while Page views, Unique visitors and Outbound clicks retain detail dialogs.
- Fixed KPI-card layouts so the localized “View details” link no longer overlaps card descriptions.
- Added per-event permanent deletion with confirmation and refreshed analytics, for both page views and outbound clicks.
- Replaced default file inputs with a styled, accessible picker for favicon and destination icon uploads.
- No database migration required.

**Commit:** `fix: polish language controls and add event deletion`  
**Tag:** `v0.3.1`

---

## v0.3.0 — Interface refinements, link icon controls and detailed analytics

- Applied the profile accent color consistently across public-page highlights, link interactions and focus states.
- Introduced a custom, keyboard-accessible public language dropdown.
- Simplified the public header, group headings, decorative elements and document title.
- Added per-destination icon configuration: automatic site favicon, image URL, uploaded image or fallback arrow.
- Added validated icon storage and delivery via D1-backed Worker routes.
- Made dashboard KPI cards interactive, opening authenticated event-detail dialogs for the selected period.
- Added D1 migration `0003_button_icons.sql` without altering existing analytics records.
- Improved responsiveness, event-detail table layout and keyboard focus behavior.
- Expanded automated test coverage for destination icons and analytics details.

**Commit:** `feat: add link icons and detailed dashboard metrics`  
**Tag:** `v0.3.0`

---

## v0.2.0 — Profile identity and public localization

- Added public translations for English, Japanese, German, Spanish and French.
- Added configurable avatar appearance and an uploadable site favicon.
- Added neutral, visible sample destinations.
- Added migration `0002_public_identity.sql`.

**Tag:** `v0.2.0`

---

## v0.1.0 — Initial LinkHub release

- Introduced a single-profile, hosted link landing page.
- Implemented entry-source analytics and independent outbound click tracking.
- Added protected administration, configurable sources and destination buttons.
- Added Cloudflare Worker + D1 deployment and migration support.

**Tag:** `v0.1.0`
