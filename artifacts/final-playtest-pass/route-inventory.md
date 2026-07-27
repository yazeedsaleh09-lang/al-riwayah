# Route inventory — 2026-07-27

Production build: Next.js 16.2.12, 14 routes generated.

| Route | Purpose | Verification |
|---|---|---|
| `/` | premium Arabic product story | axe, responsive, SEO, motion, production performance |
| `/how-to-play` | rules/onboarding | axe, responsive, keyboard links |
| `/cases` | honest case availability | axe, responsive |
| `/create` | host creation | axe, responsive, realtime browser flow |
| `/join` | canonical invite entry | axe, responsive, query-code flow |
| `/play` | preserved legacy join entry | axe, responsive, realtime browser flow |
| `/room/[code]` | all 19 authoritative phases | 4/5/6 multi-context matches + representative axe |
| `/privacy` | review-build privacy disclosure | axe, responsive |
| `/terms` | review-build terms disclosure | axe, responsive |
| `/_not-found` | safe 404 | status + content browser check |
| `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, `/icon.svg` | discovery/install assets | production build |

No public route produced console errors or horizontal overflow in the tested matrix.
