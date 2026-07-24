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
  + `tests/`, pnpm workspace with `node-linker=hoisted` for Windows/OneDrive compatibility.

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
