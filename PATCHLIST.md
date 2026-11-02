# LinkHub · Release Notes

## v0.5.2 — Today's analytics, mobile navigation actions and notification controls

- Set the default dashboard analytics period to **Today** when opening the admin panel.
- Added **View public page** (opens in a new browser tab) and **Sign out** to the sticky mobile burger menu, while preserving their desktop sidebar actions.
- Improved the mobile 14-day traffic chart with horizontal scrolling and angled, readable date labels.
- Replaced browser-native **Device**, **Traffic source**, and **Minimum interval** selects in Notifications with styled, accessible dropdowns that preserve existing values and save behavior.
- Added **DEVICE** to the Recent activity table, matching the detailed analytics view.
- Updated frontend asset version strings to avoid serving obsolete styles in the installed PWA.
- No database migration is required; previous push subscriptions and VAPID keys are retained.

**Commit:** `fix: polish mobile navigation and notification settings`  
**Tag:** `v0.5.2`

---

## v0.5.1 — Reliable Web Push requests and sticky mobile navigation

- Fixed Web Push submission on Cloudflare Workers by replacing the unsupported `redirect: "error"` setting with `redirect: "manual"`.
- Added actionable push-service HTTP status messages. Failed test requests no longer consume the 30-second test cooldown.
- Reset event-push throttles after unsuccessful sends to avoid silently dropping later alerts.
- Rebuilt mobile admin navigation as a full-width, sticky header with an accessible burger menu that remains available during scrolling.
- Added outside-tap and Escape dismissal, plus a clear menu-open indicator.
- No D1 migration or VAPID key rotation is required.

**Commit:** `fix: repair Cloudflare Web Push and sticky mobile menu`  
**Tag:** `v0.5.1`

---

## v0.5.0 — Installable admin PWA and push notifications

- Added a separately installable `/admn` PWA manifest with standalone admin start URL and a push-capable service worker.
- Added a Notifications workspace in the private dashboard for mobile and desktop.
- Implemented authenticated device subscriptions, individual settings, mute/remove/test controls and alerts for views, unique visitors and outbound clicks.
- Added source filtering and configurable minimum alert intervals; delivery failures do not interrupt analytics.
- Implemented encrypted Web Push (RFC 8291) and signed VAPID requests (RFC 8292) using WebCrypto without dependencies, with push-host allowlisting.
- Replaced the horizontal mobile navigation scroller with a collapsible section dropdown.
- Added D1 migration `0005_notifications.sql`, VAPID key generator, automated tests and setup instructions.

**Commit:** `feat: add admin PWA and configurable push notifications`  
**Tag:** `v0.5.0`

---

## v0.4.0 — Social profile header and unified destination list

- Changed the private login URL to `/admn`; the previous `/admin` URL now returns 404 and is not tracked.
- Kept the login page in English, independent of the dashboard language setting.
- Centered the login logo, introduction and primary button label.
- Removed destination categories from both the public landing page and My links; all links now follow one consistent order.
- Added sequential row numbers to recent activity and detailed event logs.
- Rebuilt the public profile as a social-style card with cover artwork, overlapping avatar and identity information.
- Added cover image URL/upload and avatar image upload, plus a live profile preview and removal controls.
- Added D1 migration `0004_profile_header.sql`; existing links, sources, and analytics events are preserved.
- Updated documentation, responsive styles, and automated tests.

**Commit:** `feat: redesign profile header and unify destination links`  
**Tag:** `v0.4.0`

---

## v0.3.2 — Appearance layout and grouped destination management

- Removed the duplicate public-page link from the Appearance page header; the existing sidebar link is retained.
- Expanded Appearance settings to use the full dashboard content width, with responsive form fields.
- Replaced the browser-native destination-icon mode select with a styled dropdown supporting keyboard navigation, focus, and selected-state indicators.
- Grouped destination buttons in the admin interface using the same categories and order as the public landing page, including hidden items marked with their status.
- Scoped the up/down controls to move destinations only within their category while preserving the public ordering.
- No database migration required.

**Commit:** `fix: refine appearance and group destinations in admin`  
**Tag:** `v0.3.2`

---

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
