# AL RIWAYAH — The Statement

Arabic title: **الرواية**  
Internal identifier: `al-riwayah`  
Product type: mobile-first local multiplayer party game + complete marketing website  
Gameplay devices: **players' phones only; no television required**  
Supported players: **4–6**  
Target session: **10–15 minutes**  
Primary language: **Arabic, RTL, Saudi-friendly conversational copy**  
Secondary language readiness: English architecture, optional later localization


## Evidence standard

A requirement is not complete because it “looks fine.” Each automated test records command and result; visual claims include screenshot; real-device claims include device/browser/version.

## Test matrix

### Room lifecycle

| ID | Scenario | Expected | Type |
|---|---|---|---|
| ROOM-001 | Create room | unique valid code, creator joined as host/player | integration/E2E |
| ROOM-002 | Create burst above limit | safe rate-limit response | security |
| ROOM-003 | Unused room TTL | state deleted | integration |
| JOIN-001 | Join by valid code | roster updates, private session issued | E2E |
| JOIN-002 | Invalid/expired/full/started | distinct safe UI state | E2E |
| JOIN-003 | Blank/long/script/name duplicate | rejected and escaped | security/E2E |
| JOIN-004 | Seventh player | rejected | integration |
| READY-001 | Start with 3 | rejected | integration |
| READY-002 | Start with 4–6 all ready | starts once | integration |
| READY-003 | Double start | idempotent/no duplicate match | integration |

### Gameplay phases

Create one test per canonical phase:

- correct public view;
- correct private view;
- deadline;
- valid action;
- invalid option;
- stale revision;
- duplicate request;
- late request;
- no response fallback;
- legal next transition;
- no phase skip;
- no premature result.

Core IDs:

- `GAME-CASE-001`
- `GAME-EVIDENCE-001`
- `GAME-PLAN-REASON-001`
- `GAME-PLAN-LOCATIONS-001`
- `GAME-PLAN-ROLES-001`
- `GAME-FOUNDATION-001`
- `GAME-GAPS-001`
- `GAME-NOGO-001`
- `GAME-CONTRADICTION-001`
- `GAME-PATCH-001`
- `GAME-SURPRISE-001`
- `GAME-FOLLOWUP-001`
- `GAME-FINAL-001`
- `GAME-VERDICT-001`
- `GAME-REPLAY-001`

### Engine correctness

| ID | Scenario | Expected |
|---|---|---|
| ENG-001 | mutually exclusive drivers | direct contradiction with exact explanation |
| ENG-002 | denied witness | witness contradiction |
| ENG-003 | timeline impossibility | time contradiction |
| ENG-004 | answer hits Wi-Fi evidence | evidence collision |
| ENG-005 | majority anomaly only | suspicion, not hard contradiction |
| ENG-006 | apply time-shift patch | original resolved, transition commitment created |
| ENG-007 | follow-up conflicts with commitment | new contradiction |
| ENG-008 | identical seed/input | identical selection/result |
| ENG-009 | score ledger | axis totals equal entries |
| ENG-010 | verdict boundary | every score maps to one band |

### Reconnection

| ID | Scenario | Expected |
|---|---|---|
| RECON-001 | refresh in lobby | same player restored, no duplicate |
| RECON-002 | refresh during private question | same own question/locked answer |
| RECON-003 | old socket remains | old socket replaced |
| RECON-004 | stolen/invalid token | denied without leak |
| RECON-005 | player never returns | match continues on timeout |
| RECON-006 | host disconnects | next eligible connected player gains host permission |

### Secrecy/security

| ID | Assertion |
|---|---|
| SEC-001 | public DTO has no private keys recursively |
| SEC-002 | A view cannot contain B question/evidence/answer |
| SEC-003 | candidate contradictions unreleased |
| SEC-004 | result unavailable before verdict |
| SEC-005 | invalid payload cannot mutate state |
| SEC-006 | replayed answer does not change lock |
| SEC-007 | room-code brute-force limited |
| SEC-008 | script name renders as text |
| SEC-009 | logs redact token/evidence/answers |
| SEC-010 | production debug routes unavailable |

## Multi-client E2E

Automate browser contexts for:

- 4 players: coherent story → A/B verdict.
- 5 players: one timeout and reconnect.
- 6 players: two contradictions and both patches.
- 6 players: attempted invalid option and duplicate answer.
- Replay: same room, new seed/state, no prior private data.
- New group: new code and clean roster.

## Website acceptance

### Content

- All required routes.
- No placeholder copy.
- No fake awards, testimonials, usage counts, pricing, or reviews.
- Available/in-development cases honestly labeled.
- Legal placeholders clearly visible for owner completion where unavoidable.

### Responsive

Visual regression at:

- 320×568
- 360×800
- 390×844
- 768×1024
- 1440×900
- 1920×1080
- 3840×2160 smoke

No horizontal overflow. Key actions visible and reachable.

### Accessibility

- automated axe smoke on public routes and representative game phases;
- keyboard navigation;
- visible focus;
- accessible names;
- no color-only contradiction;
- reduced motion;
- mute;
- screen-reader phase announcement;
- 44px touch targets.

### Performance budgets

Measured on production build, representative mid-tier mobile profile:

- public home LCP target ≤ 2.5s at p75 lab approximation;
- CLS ≤ 0.1;
- INP-friendly interactions; no long main-thread tasks caused by decorative motion;
- initial marketing JS target ≤ 220 KiB gzip excluding framework where measurable, document exceptions;
- game action acknowledgment target local/LAN median < 150ms, p95 < 400ms;
- view propagation target median < 200ms LAN;
- server memory returns near baseline after room cleanup;
- no listener growth after five replays.

### SEO/quality

- metadata/canonical/OpenGraph;
- sitemap/robots;
- meaningful headings;
- no broken links;
- no console errors;
- no hydration warnings;
- valid structured data if used.

## Release gate

Automatable release requires:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:security
pnpm test:e2e
pnpm test:visual
pnpm build
```

Plus:

- real-device 4-player session;
- human playtest criteria in `PLAYTEST_PLAN.md`;
- production smoke after deploy.
