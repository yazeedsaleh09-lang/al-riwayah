# Risk Register

| ID | Risk | Probability | Impact | Level | Early indicator | Prevention / response | Owner | Phase | Status |
|---|---|---:|---:|---:|---|---|---|---|---|
| GD-01 | Feels like a memory test | High | High | Critical | players build tables and stop improvising | gap/no-good questions, patch commitments, playtest | Game Design | 2/9 | Open |
| GD-02 | Contradiction feels arbitrary | Medium | High | High | players ask why it counted | deterministic explanations and taxonomy tests | Engine/UX | 2/4 | Open |
| GD-03 | Dominant planner controls group | High at 6 | High | Critical | one player supplies most facts | staged planning, distributed evidence, confirmation | UX | 4/9 | Open |
| GD-04 | Patches have obvious best choice | Medium | High | High | same patch always selected | simulate paths, authored tradeoffs | Content | 2/9 | Open |
| GD-05 | Result feels punitive | Medium | Medium | Medium | players dislike named suspect | tone test and shared verdict | Content | 9 | Open |
| CT-01 | First case authoring too expensive | High | High | Critical | rules multiply manually | schema, validator, inspector, reusable rules | Content | 2 | Open |
| CT-02 | Case has impossible evidence assignment | Medium | High | High | no valid 4/5/6 setup | combinational validation | Content | 2 | Open |
| TECH-01 | Public/private state leak | Medium | Critical | Critical | private key in socket payload | DTO allowlists and leakage tests | Security | 3 | Open |
| TECH-02 | Timer drift/race | Medium | High | High | late answers accepted inconsistently | server deadline/injectable clock/revision | Server | 3 | Open |
| TECH-03 | Reconnect duplicates player | Medium | High | High | roster grows on refresh | recovery token and socket replacement | Server | 3 | Open |
| TECH-04 | Memory leak across rooms/replays | Medium | High | High | heap/listeners grow | cleanup, bounded caches, soak tests | Server | 7 | Open |
| TECH-05 | Website motion hurts performance | Medium | Medium | Medium | poor LCP/long tasks | progressive motion, budgets, reduced motion | Web | 5/6 | Open |
| SEC-01 | Room code enumeration | Medium | Medium | Medium | high invalid join attempts | entropy/rate limits/TTL | Security | 3 | Open |
| SEC-02 | XSS via name | Low | High | Medium | raw HTML path | escaping/CSP/tests | Web/Security | 3/4 | Open |
| SEC-03 | Logs contain private answers | Medium | Critical | Critical | debug payload logging | structured redacted logger/tests | Server | 3/8 | Open |
| UX-01 | 320px action obstruction | Medium | High | High | bottom action behind browser chrome | safe areas and device testing | UX | 4/7 | Open |
| UX-02 | Early answer causes waiting | Medium | Medium | Medium | long idle screen | simultaneous deadlines/optional prediction | UX | 4/9 | Open |
| WEB-01 | Site imitates agency template | Medium | High | High | irrelevant agency sections/fake proof | product-specific IA and original art | Web Design | 5 | Open |
| WEB-02 | Full-site polish eclipses game quality | High | High | Critical | motion work before loop tests | roadmap gate ordering | Product | all | Open |
| DEP-01 | WebSocket hosting limitation | Medium | High | High | upgrade failures/sleep | staging smoke and compatible provider | DevOps | 8 | Open |
| DEP-02 | Free hosting cold starts | Medium | Medium | Medium | first join timeout | honest provider choice/health UX | DevOps | 8 | Open |
| LEG-01 | Legal details unavailable | High | Medium | Medium | privacy contact placeholder | owner checklist; does not block engineering | Owner | 9 | Open |
| ASSET-01 | Unlicensed visual/audio asset | Medium | High | High | copied template/stock | original SVG/CSS and license ledger | Design | 5/6 | Open |

## 2026-07-27 readiness review

### Mitigated by implementation and automation

- `GD-02`: every released contradiction now shows two concrete statements and the
  matching rule; engine taxonomy and browser reveal tests pass.
- `CT-01`, `CT-02`: schema validation and 4/5/6 evidence assignment are automated.
- `TECH-01`–`TECH-03`: allowlisted DTOs, token rotation, socket replacement, authoritative
  deadlines/revisions, and recovery scenarios have security/integration/browser coverage.
- `TECH-04`: rooms expire, idempotency caches are bounded, and five consecutive replay
  cycles retain one clean room without prior private state.
- `TECH-05`, `UX-01`, `WEB-01`, `WEB-02`, `SEC-01`–`SEC-03`, `ASSET-01`: production
  budgets, reduced motion, 64 responsive combinations, original-asset provenance,
  schema/XSS/CSP/CORS/rate-limit/log-redaction checks all pass.

### Still requires human or hosted evidence

- `GD-01`, `GD-03`–`GD-05`, and `UX-02` are subjective playtest risks; use
  `PLAYTEST_PLAN.md` with two groups and do not infer fun/fairness from automation.
- `DEP-01`, `DEP-02` require the selected public host. LAN play is verified separately
  and does not depend on hosting credentials.
- `LEG-01` remains owner input and is visibly disclosed; it does not block a private
  friends playtest.

## 2026-07-28 prior hosted baseline

- `DEP-01`: mitigated for the review deployment. Socket.IO create/join and roster
  propagation passed against the actual Render web and realtime origins.
- `DEP-02`: mitigated by the explicit server-readiness gate and bounded 90-second
  E2E allowance. A cold service displayed the honest wake state; the subsequent
  create/join/refresh/reconnect flow passed without weakening room assertions.

This baseline predates ADR-019. The exact light-editorial release SHA must repeat
the hosted smoke and production Nudge comparison before the current release is
approved.

## 2026-07-28 ADR-019 production verification

- Render served the final light-editorial CSS fingerprint and both public origins
  returned healthy responses.
- The live 58-test route/accessibility/identity/responsive matrix and two-browser
  create/join lobby passed.
- Production performance and security headers passed.
- The four-viewport Nudge comparison and strict reviewer challenge passed with all
  12 categories at 9.0 or above.
- `DEP-01`, `DEP-02`, `TECH-05`, `UX-01`, `WEB-01`, and `WEB-02` are mitigated for
  this release; subjective game-design risks remain for real-group playtesting.
