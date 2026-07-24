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

- Status: Proposed
- Domain: Architecture
- Decision: Next.js web + Fastify/Socket.IO server + pure engine/content/protocol packages.
- Reason: SEO website plus authoritative realtime separation.
- Alternatives: single Vite SPA/server; Colyseus; serverless.
- Rollback: Claude may accept a real existing stack after repository inspection.
- Re-evaluate: Phase 0.

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
