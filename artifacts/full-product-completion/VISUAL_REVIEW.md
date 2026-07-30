# AL RIWAYAH visual review

Date: 2026-07-30
Product commit: `dd00b8311654c8b175dc8f94b578318e5a8cfc3b`

The existing tracked release-evidence directories were reused instead of
duplicating the same binary captures under a second screenshots folder.

| Route or state | Viewport | Evidence | Console | Overflow / clipping | Accessibility / visual result |
|---|---:|---|---|---|---|
| Homepage hero + continuation | 1440×900 | `artifacts/final-playtest-pass/after/home-1440x900.png` | clean | none | approved Golden Master geometry preserved |
| Homepage mobile | 390×844 | `artifacts/final-playtest-pass/after/home-390x844.png` | clean | none | native mobile header/menu; desktop board not squeezed |
| How to play | 1440×900, 390×844 | `artifacts/final-playtest-pass/after/how-to-play-*.png` | clean | none | coherent terminology and keyboard-safe controls |
| Cases | 1440×900, 390×844 | `artifacts/final-playtest-pass/after/cases-*.png` | clean | none | only the playable case is presented as available |
| Privacy and terms | 1440×900, 390×844 | `artifacts/final-playtest-pass/after/` | clean | none | honest ephemeral-session language |
| Four-player lobby | 320×568 through 1920×1080 | `artifacts/final-playtest-pass/responsive-game/4-player-lobby-*.png` | clean | none | readable long-name-safe rows and 44px controls |
| Four-player question | 320×568 through 1920×1080 | `artifacts/final-playtest-pass/responsive-game/4-player-question-*.png` | clean | none | explicit select then confirm; fixed action clears safe area |
| Contradiction and patch | 390×844 | `artifacts/final-playtest-pass/full-match/4-player-contradiction.png`, `4-player-patch*.png` | clean | none | public-only reveal and focused repair flow |
| Results | 4, 5, and 6 players | `artifacts/final-playtest-pass/full-match/*-player-results*.png` | clean | none | approved paper/ink/red report with required labels |
| Reconnect | 390×844 | `artifacts/final-playtest-pass/full-match/6-player-reconnect.png` | clean | none | recovery state is explicit and private |

Motion captures under `artifacts/final-playtest-pass/motion/` were reviewed in
normal and reduced-motion modes. Motion explains state changes, does not delay
input, and the reduced-motion path removes nonessential movement.

The deployed production homepage was also inspected at 1440×900 and 390×844.
It reported build `dd00b83`, hydrated successfully, exposed the complete RTL
landmark structure, opened and closed the mobile menu by keyboard, and produced
no browser console warnings or errors.
