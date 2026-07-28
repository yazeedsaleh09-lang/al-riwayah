# Decision Log

## ADR-001 — Phones only

- Date: 2026-07-24
- Status: Accepted
- Domain: Game Design / UX
- Decision: Every participant plays from a phone. No TV is required.
- Reason: Privacy and separation are core; user explicitly removed TV requirement.
- Alternatives: TV plus phones; one shared host screen.
- Impact: Every public reveal must render synchronously on all phones.
- Rollback: Add optional display client later without making it required.
- Re-evaluate: Only after core mode is validated.

## ADR-002 — Cooperative deception

- Status: Accepted
- Domain: Game Design
- Decision: All players cooperate against the investigator in the first mode.
- Reason: Differentiates from hidden-traitor games.
- Rejected: Informant/traitor in first build.
- Rollback: Add optional mode later.

## ADR-003 — Four score dimensions

- Status: Accepted
- Domain: Game Design
- Decision: Consistency, Plausibility, Stability, and Evasion.
- Reason: Agreement alone permits absurd safe stories.
- Risk: Opaque scoring.
- Mitigation: deterministic ledger and visible explanations.

## ADR-004 — Patches create commitments

- Status: Accepted
- Domain: Game Systems
- Decision: Every patch resolves a conflict and creates at least one follow-up obligation.
- Reason: Patching is the core strategic loop.
- Rejected: free answer edit.

## ADR-005 — No free text or generative AI in review build

- Status: Accepted
- Domain: Content / Architecture
- Reason: Fair and explainable adjudication is more important than language flexibility.
- Re-evaluate: after deterministic game proves fun.

## ADR-006 — Full website, one-case game review build

- Status: Accepted
- Domain: Product
- Decision: Public site is launch-quality and complete; playable content is one polished case.
- Reason: User explicitly wants a complete site and a reviewable first game build.
- Risk: Site polish could distract from loop; roadmap orders engine before polish.

## ADR-007 — Proposed TypeScript monorepo

- Status: Accepted (2026-07-24, Phase 0)
- Domain: Architecture
- Decision: Next.js web + Fastify/Socket.IO server + pure engine/content/protocol packages.
- Reason: SEO website plus authoritative realtime separation.
- Alternatives: single Vite SPA/server; Colyseus; serverless.
- Rollback: Claude may accept a real existing stack after repository inspection.
- Re-evaluate: Phase 0.
- Phase 0 note: Repository contained specs only (no source). Proposed monorepo accepted
  and scaffolded as `apps/{web,server}` + `packages/{protocol,game-engine,content,ui,config}`
  - `tests/`, pnpm workspace with `node-linker=hoisted` for Windows/OneDrive compatibility.

## ADR-011 — Toolchain versions (2026-07-24)

- Status: Accepted
- Domain: Architecture / Tooling
- Decision: Pin conservative, broadly-supported stable lines rather than the absolute
  newest majors, after querying npm at execution time:
  - TypeScript `~5.9` (not 7.0 native port — ecosystem type-checker/tooling support for
    TS7 is still maturing; typescript-eslint 8 and Next 16 target TS5 semantics).
  - ESLint `^9.39` + typescript-eslint `^8.65` (ESLint 10 is very new; 9.x is the
    widely-supported flat-config line).
  - Next `^16`, React `^19.2`, Zod `^4`, Vitest `^4`, Fastify `^5`, socket.io `^4.8`,
    Playwright `^1.61`, tsx `^4.23`, Prettier `^3.9`.
- Reason: START_HERE requires "currently supported stable releases … do not pin from
  memory." Versions verified via `npm view` on 2026-07-24. Chose stability of the
  broader ecosystem over bleeding-edge majors where a compatibility risk exists.
- Re-evaluate: Upgrade TypeScript to 7.x once vitest/Next/typescript-eslint declare
  first-class support.

## ADR-008 — No database in review build

- Status: Proposed
- Domain: Architecture/Privacy
- Reason: ephemeral rooms and no accounts.
- Risk: server restart ends rooms.
- Re-evaluate: production scaling or persistence requirements.

## ADR-009 — Original editorial design

- Status: Accepted
- Domain: UX
- Decision: Use reference quality attributes, not copied design/assets.
- Reason: Distinct identity and licensing.
- Prohibition: fake awards, testimonials, usage metrics.

## ADR-010 — Arabic-first RTL

- Status: Accepted
- Domain: Product/UX
- Decision: Arabic Saudi-friendly game copy; architecture prepared for English.

## ADR-012 — Review build is ephemeral and single-process

- Status: Accepted (2026-07-27)
- Domain: Architecture / Privacy
- Decision: Rooms and recovery sessions remain in memory for the friends-playtest build.
- Reason: It collects no accounts or durable private answers, keeps the trust boundary
  small, and meets one local group per process.
- Impact: A server restart closes active rooms; horizontal scaling requires sticky
  sessions plus an audited shared room store.

## ADR-013 — Production server executes TypeScript through pinned `tsx`

- Status: Accepted (2026-07-27)
- Domain: Operations
- Decision: `@al-riwayah/server start` runs `tsx src/main.ts`.
- Reason: emitted ESM imports are workspace-relative and were not directly runnable by
  Node without a package rewrite; the pinned runtime is already used for development
  and preserves the tested workspace graph.
- Re-evaluate: when packages publish compiled ESM with explicit runtime exports.

## ADR-014 — Isolated browser test ports and authoritative multi-client matrix

- Status: Accepted (2026-07-27)
- Domain: QA
- Decision: Playwright owns web port 3100 and server port 4100 by default and creates
  independent browser contexts for 4/5/6 players.
- Reason: avoids accidentally reusing unrelated port-3000 processes and exercises the
  actual socket/recovery/browser storage boundaries.

## ADR-015 — Origin-derived invite links

- Status: Accepted (2026-07-27)
- Domain: UX / LAN
- Decision: Lobby invite URLs use `window.location.origin` plus `/join?code=…`.
- Reason: a phone must receive the reachable LAN or hosted origin, never the host's
  loopback address. Native share is preferred; clipboard is the fallback.

## ADR-016 — Security-patched transitive image/CSS processors

- Status: Accepted (2026-07-27)
- Domain: Supply chain
- Decision: update Next to `^16.2.12` and pin workspace overrides for PostCSS
  `8.5.23` and sharp `0.35.3`.
- Reason: the production audit found disclosed file-read/XSS issues in the transitive
  versions selected by Next. Both overrides are backward-compatible patch lines and
  remove the advisories without adding a new runtime capability.
- Re-evaluate: remove overrides when Next's own dependency ranges resolve to patched
  versions; keep `pnpm audit --prod` in the release gate.

## ADR-017 — Final visual authority and cold-start entry contract

- Date: 2026-07-27
- Status: Accepted
- Domain: Brand / UX / Deployment
- Decision: Replace the beige/red dossier presentation with a true monochrome system
  and one forensic-cobalt signal. Use Alexandria for display and Noto Sans Arabic for
  body/UI. Translate Fabrica's scale, pacing, responsive composition, and motion
  discipline without copying its brand, assets, layouts, content, or agency structure.
- Signature: a shared statement that fractures into two testimony tracks.
- Product boundary: marketing may use rare 640ms reveals; game controls remain
  120–280ms and state-driven.
- Connection decision: room entry must warm the health endpoint, wait for a confirmed
  Socket.IO connection, retry through a bounded 75-second provider wake window, and
  expose explicit wake/retry/failure stages instead of a six-second hard error.
- Evidence: `design/FINAL_VISUAL_AUDIT.md` and `design-system/al-riwayah/MASTER.md`.

## ADR-018 — Void-black fracture identity supersedes ADR-017 typography and cobalt

- Date: 2026-07-28
- Status: Accepted
- Domain: Brand / UX
- Decision: Keep ADR-017’s cold-start entry contract, but supersede its visual
  direction. Use void black, carbon, statement ivory, and state-only red/amber/green.
  Use IBM Plex Sans Arabic across display, body, and UI. The recurring mechanism is
  one shared statement separating into incompatible testimonies.
- Rejected: forensic cobalt, Alexandria/Noto pairing, beige dossier surfaces,
  gradients, glass, decorative grids, and equal-card marketing layouts.
- Motion boundary: one scroll-progress source controls the six-stage desktop rail;
  mobile and reduced-motion modes expose the stages as ordered static content.
  Entrance animation must never make readable content transparent at rest.
- Evidence: `design/FINAL_VISUAL_AUDIT.md`,
  `artifacts/final-playtest-pass/visual-review.md`, and the production Axe matrix.

## ADR-019 — Light Versioned Testimony identity supersedes ADR-018

- Date: 2026-07-28
- Status: Accepted
- Domain: Brand / UX
- Decision: Keep all authoritative multiplayer, privacy, recovery, and cold-start
  behavior, but supersede the void-black identity and reject the Alibi Table,
  circular player-seat geometry, orbit, and circular mark. Use warm paper, dark
  ink, restrained verdict red, state-only warning/success colors, and the non-circular Versioned Testimony
  mechanism: one authored phrase becomes a different version with an explicit
  written reason.
- Truthfulness: the marketing comparison uses synthetic authored data and does
  not imply free-text collaboration or public synchronization of private answers.
- Motion boundary: panel settle → old phrase retires → new phrase inserts →
  written reason appears, then rests. Reduced motion renders the final state
  immediately. Game state changes stay at or below 280ms.
- Evidence: `design/research-v3/selection-decision.md`,
  `design/research-v3/latest-implementation-principles.md`, and fresh four-viewport
  local release-candidate captures.
