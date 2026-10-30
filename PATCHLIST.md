# LinkHub — Patch List

All release notes are maintained in English. Versions follow Semantic Versioning.

---

## v0.1.0 — Initial LinkHub MVP · 2026-10-30

### Added

- New independent LinkHub project (separate from TrackLink).
- Cloudflare Workers + Static Assets + D1 on the Free plan, deployable without a purchased domain.
- Responsive public page: editable brand, profile, avatar and curated buttons.
- Source-specific short entry paths (`/ig`, `/tg`, `/fb`, `/x`, `/reddit`) displaying the same public page.
- First-party page-view tracking with source attribution and an anonymous browser identifier.
- Outbound-button click tracking via `/out/ID` with source attribution when available.
- Country, device class, timestamp, and source/destination performance analytics.
- Private admin dashboard with four periods, 14-day charts, source/country/button breakdowns and recent activity.
- Management of sources, buttons, section/category, visibility, display order and public appearance.
- Password-based admin with server-side revocable sessions, origin checks, and basic login throttling.
- Bot/prefetch filtering, HEAD requests excluded from counts, no raw IP or referrer stored in analytics.
- README deployment guide and D1 migration.
- Automated smoke tests covering routing, tracking, bot filtering, URL validation and time boundaries.

### Notes

- Sample outbound buttons are disabled until real URLs are configured.
- The landing-page hostname uses `*.workers.dev` by default; custom domains are optional and not required.
- Future milestones include PWA push notifications, richer analytics and alternate LinkHub themes.

**Commit:** `feat: launch LinkHub MVP with source and outbound analytics`  
**Tag:** `v0.1.0`
