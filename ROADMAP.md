# AL RIWAYAH — The Statement

Arabic title: **الرواية**  
Internal identifier: `al-riwayah`  
Product type: mobile-first local multiplayer party game + complete marketing website  
Gameplay devices: **players' phones only; no television required**  
Supported players: **4–6**  
Target session: **10–15 minutes**  
Primary language: **Arabic, RTL, Saudi-friendly conversational copy**  
Secondary language readiness: English architecture, optional later localization


## Execution rule

Claude continues automatically through phases. A phase closes only with evidence. A passing build alone is not sufficient.

## Phase 0 — Inspect and baseline

Goal: establish repository truth.

Tasks:

- Git status/diff/log.
- inventory source, scripts, routes, dependencies, CI, deploy config;
- run existing checks;
- identify unrelated/legacy code;
- secret scan;
- record baseline in `PROGRESS.md`;
- accept or replace proposed architecture.

Evidence: commands/logs, route inventory, current screenshots if UI exists.

Blocker to next phase: unknown failing baseline without classification.

## Phase 1 — Workspace and quality foundation

When starting from zero:

- pnpm monorepo;
- strict TypeScript;
- lint/format;
- environment schema;
- web/server/packages/tests;
- CI;
- basic health endpoint;
- safe error model.

Acceptance: lint/typecheck/unit/build pass.

## Phase 2 — Pure game engine and content

- canonical phase model;
- seeded RNG;
- first case schema/content;
- planning facts;
- answer normalization;
- contradiction detection/ranking;
- patch commitments/follow-ups;
- score ledger/verdict;
- content validator and simulations.

Tests: `ENG-*`, content validation.

## Phase 3 — Authoritative multiplayer server

- room manager;
- code generation;
- join/ready/start;
- server deadlines/injectable clock;
- protocol schemas;
- DTO redaction;
- sessions/reconnect/host transfer;
- rate limiting;
- cleanup.

Tests: `ROOM-*`, `JOIN-*`, `READY-*`, `RECON-*`, `SEC-*`.

## Phase 4 — Mobile game shell

- create/join;
- lobby;
- every canonical phase;
- offline/reconnect;
- safe-area/responsive;
- RTL/accessibility;
- sound/motion controls;
- result/replay/new group.

Tests: phase E2E at 320/360/390.

## Phase 5 — Production-complete marketing website

- implement every route in `WEB_EXPERIENCE_SPEC.md`;
- original editorial identity;
- final copy;
- scroll story and interactive contradiction demo;
- SEO/legal/error;
- responsive desktop/tablet/mobile;
- no fake social proof.

Tests: visual/accessibility/performance/public route checks.

## Phase 6 — Motion, sound, cinematic polish

- motion tokens;
- hero and scroll choreography;
- contradiction sequence;
- patch commitment animation;
- verdict;
- original/licensed sound;
- haptics;
- reduced motion and mute.

Evidence: normal/reduced screenshots/video where available; tests remain stable.

## Phase 7 — Comprehensive QA

- unit/integration/protocol/security/E2E;
- 4/5/6 clients;
- invalid/replayed/late actions;
- reconnect;
- five replays memory/listener check;
- responsive/accessibility;
- performance;
- production build.

All `ACCEPTANCE_TESTS.md` automated gates pass.

## Phase 8 — Deployment

- staging;
- HTTPS/WSS;
- public origin;
- health/readiness;
- monitoring/log redaction;
- production env;
- no demo/debug;
- smoke from real phone;
- rollback documented.

## Phase 9 — Human playtest and final review

- two groups;
- collect playtest metrics;
- fix severe comprehension/fairness issues;
- rerun regression;
- verify public site content;
- legal placeholders highlighted;
- production readiness report.

## Parallel work

- Copy/content can proceed with UI foundation after IDs freeze.
- Marketing sections can build while server work proceeds, but shared tokens must remain centralized.
- Visual assets may proceed only as original SVG/CSS and must not block core loop.
- Human playtest preparation can begin before final motion.

## Completion evidence table

Claude updates this table in `PROGRESS.md` rather than marking tasks informally.
