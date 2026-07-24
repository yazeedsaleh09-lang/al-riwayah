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
