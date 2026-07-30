# Route matrix

| Route/surface | Classification before implementation | Concrete gap / decision |
|---|---|---|
| `/` | Functionally incomplete | Locked hero exists; below-hero product explanation, steps, real gameplay/result previews, playable case, replay value, final CTA, mobile navigation, and footer are missing |
| `/how-to-play` | Content inconsistent | Uses deprecated `الشرخ`; claims 10–15 minutes and six stages without clearly mapping the real lifecycle |
| `/cases` | Content inconsistent | Real case is present, but public `نسخة المراجعة` wording remains |
| `/about` | Missing | Required product, private-phone, player-count, duration, privacy, no-account, and no-download explanation absent |
| `/create` | Complete with metadata gap | Real server flow and validation exist; add explicit canonical and verify unavailable/submitting states |
| `/join` | Complete / canonical target | Real join, query prefill, normalization, and mapped errors exist |
| `/play` | Duplicated legacy compatibility route | Preserve compatibility, canonicalize to `/join`, and normalize product links to `/join` |
| `/room/[code]` | Functionally incomplete in edge states | Main lifecycle exists; early no-session/loading states lack the skip-link target; verify room closed/unrecoverable handling |
| `/privacy` | Content inconsistent | Remove review-build copy and unsupported analytics/token-lifetime claims |
| `/terms` | Content inconsistent | Remove review-build language while honestly retaining ephemeral-room/server-restart limitations |
| `not-found` | Complete | Preserve shared navigation/footer; re-run accessibility and link checks |
| `error.tsx` | Complete but unverified | Root error boundary exists; add focused browser evidence |
| `loading.tsx` | Missing | Add coherent route loading state using the approved system |
| `robots.txt` | Complete | `/room/` remains disallowed |
| `sitemap.xml` | Inconsistent | Add `/about`; remove duplicate indexable `/play` entry |
| `manifest.webmanifest` | Complete | Preserve |
| `icon.svg` | Complete | Preserve |

## Navigation and canonical policy

- `/join` is the canonical join route.
- `/play` remains functional for old links and direct visits, but declares `/join` as
  canonical and is not duplicated in the sitemap.
- Shared navigation exposes one create action and one join action.
- The locked desktop homepage navigation geometry is preserved; missing mobile access is
  added without changing the approved 1440×900 composition.
