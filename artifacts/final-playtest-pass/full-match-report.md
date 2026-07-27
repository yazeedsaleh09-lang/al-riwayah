# Automated full-match report — 2026-07-27

| Players | Result | Adversarial/recovery coverage | Evidence |
|---:|---|---|---|
| 4 | PASS, all 19 phases to results | duplicate answer rejected; representative axe; same-room replay clean | `full-match/4-player-lobby.png`, `full-match/4-player-results.png` |
| 5 | PASS, all 19 phases to results | browser refresh restores player/locked state; host creates clean new group/code | `full-match/5-player-results.png` |
| 6 | PASS, all 19 phases to results | one browser disconnects; server deadline supplies missing response; reconnect-safe completion | `full-match/6-player-results.png` |

Additional engine/integration runs cover all 4/5/6 assignments, an absent player,
no phase skip, deadline rejection, stale revisions, host transfer, seventh-player
rejection, expired rooms, and five replay cycles.

These are independent Chromium browser contexts with separate storage and sockets,
not an in-memory UI mock.
