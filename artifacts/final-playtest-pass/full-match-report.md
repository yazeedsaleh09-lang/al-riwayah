# Automated full-match report — 2026-07-28

| Players | Result | Adversarial/recovery coverage | Primary evidence |
|---:|---|---|---|
| 4 | PASS, all 19 phases and replay | duplicate answer rejection; private selection/lock receipt; real contradiction and patch; representative Axe | `full-match/4-player-question.png`, `4-player-contradiction.png`, `4-player-patch-selection.png`, `4-player-results-full.png` |
| 5 | PASS, all 19 phases | browser refresh restores the player; host creates a clean room and code | `full-match/5-player-lobby.png`, `5-player-results-full.png` |
| 6 | PASS, all 19 phases | browser disconnect; immediate offline overlay; server-timed missing answer; reconnect-safe completion | `full-match/6-player-reconnect.png`, `6-player-results-full.png` |

The captures come from independent Chromium contexts with separate browser storage
and sockets. They are not an in-memory UI mock.

The latest question and patch evidence shows active controls only while calibrated
time remains. At zero, the client presents an expired waiting receipt and disables
late controls; it does not advance the phase or accept the action locally. Deadline,
identity, revision, and allowed-option enforcement remain on the server.
