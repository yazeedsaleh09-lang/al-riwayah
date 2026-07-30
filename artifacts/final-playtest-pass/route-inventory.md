# Route inventory — 2026-07-30

Production build: Next.js 16.2.12, 15 routes generated.

| Route | Purpose | Verification |
|---|---|---|
| `/` | approved hero plus complete Arabic product story | Golden Master geometry, axe, responsive, SEO, motion, production performance |
| `/about` | grounded product facts | axe, responsive, copy contract |
| `/how-to-play` | rules and onboarding | axe, responsive, keyboard links |
| `/cases` | honest single-case availability | axe, responsive, authored content |
| `/create` | room creation | validation, axe, responsive, realtime browser flow |
| `/join` | canonical invite entry | canonical, validation, axe, query-code flow |
| `/play` | preserved compatibility entry | canonical points to `/join`; realtime browser flow |
| `/room/[code]` | authoritative 19-phase game | 4/5/6-client matches, recovery, representative axe |
| `/privacy` | accurate transient-storage disclosure | axe, responsive, copy contract |
| `/terms` | current service terms | axe, responsive, copy contract |
| `/_not-found` | safe 404 | status and content browser check |
| `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, `/icon.svg` | discovery assets | production build |

No public route produced serious/critical axe violations, console errors, or
horizontal overflow in the tested matrix. `/play` remains functional for existing
links but is excluded from the sitemap in favor of canonical `/join`.
