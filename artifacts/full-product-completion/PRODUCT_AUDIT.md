# AL RIWAYAH full-product audit

Audit date: 2026-07-30
Initial local SHA: `2832a492fef602ca27f605eba6a986329960acf3`
Initial `origin/main` SHA after fetch: `2832a492fef602ca27f605eba6a986329960acf3`
Branch: `main`
Safety backup: `C:\Users\yazed\OneDrive\Documents\AL_RIWAYAH_PRE_FULL_SITE_BACKUP_20260730_031157`

## Baseline decision

The current repository, the dirty Golden Master worktree, the existing GitHub repository,
the two existing Render services, and their current URLs are the only implementation
baseline. No replacement application, service, repository, or parallel frontend is
authorized.

The four locked reference images remain the visual authority for the homepage hero,
lobby, question, and result. The newer full-product completion authority permits the
same identity to be extended to missing production surfaces while preserving those
four compositions.

## Repository and architecture

| Surface | Current implementation | Audit result |
|---|---|---|
| Web | Next.js 16 / React 19 in `apps/web` | Existing app must be completed in place |
| Realtime server | Fastify / Socket.IO in `apps/server` | Existing authoritative server retained |
| Game engine | Deterministic 19-phase state machine in `packages/game-engine` | Existing model retained; one deadline defect requires correction |
| Content | One validated playable case in `packages/content` | Retained; no fictional cases added |
| Protocol | Zod intent schemas in `packages/protocol` | Phase revision contract must be tightened |
| Tests | Vitest + Playwright in `tests` | Strong base, but current worktree invalidates stale UI evidence |
| Deployment | `render.yaml`, branch `main` | Same `al-riwayah-web` and `al-riwayah-server` services retained |

## Critical and high findings

1. **Golden Master gameplay CSS is not loaded.** `RoomShell.tsx` emits `.gm-*` classes,
   but `apps/web/src/app/golden-master.css` is imported nowhere. A clean build cannot
   reproduce the locked lobby, question, or result layouts.
2. **Question confirmation is decorative.** Options submit immediately while the visible
   `ثبّت الإجابة` button is permanently disabled. The approved select → confirm → lock
   interaction is broken.
3. **A socket can restore into a second room without being unbound from the first.**
   One transport can remain associated with multiple private projections.
4. **WebSocket Origin is not rejected at the handshake.** HTTP CORS headers alone do not
   stop a forged production WebSocket connection.
5. **`phaseRevision` is optional.** An intent without a revision bypasses the stale/future
   phase guard and can mutate state.
6. **Disconnected players can avoid deadline fallback.** The phase can advance when only
   connected players finish, so a disconnected participant receives no fallback answer
   or no-response penalty.
7. **The homepage ends at the locked hero.** Required explanation, real gameplay/result
   previews, playable case, replay value, final CTA, and footer are absent.
8. **`/about` and route-level loading are missing.** `/play` and `/join` duplicate the
   same join form without a single canonical navigation policy.
9. **Public production copy is stale.** `نسخة المراجعة`, `review-build`, outdated
   `10–15` timing, and public `الشرخ` remain visible.
10. **Existing completion artifacts are stale.** They certify the removed Versioned
    Testimony homepage rather than the current Golden Master worktree.

## Medium findings

- Result attribution currently considers all detected contradictions, including
  unreleased candidates, which can make named blame inconsistent with the public recap.
- Cached/invalid intents can still trigger full-room broadcasts, allowing avoidable
  broadcast amplification.
- Early room recovery/no-session states omit `id="main"`, breaking the global skip link.
- Privacy copy claims anonymous metrics although no analytics are implemented, and
  overstates when the browser recovery token is cleared.
- `/create` and `/play` lack explicit canonical metadata; `/play` duplicates `/join` in
  the sitemap.
- The default navigation duplicates the create action and splits join links between
  `/play` and `/join`.
- The public test matrices omit `/about`, loading/error states, canonical rules, and
  direct room no-session accessibility.

## Baseline verification

- `pnpm.cmd typecheck`: pass on 2026-07-30.
- `pnpm.cmd lint`: pass on 2026-07-30.
- `pnpm.cmd test:integration`: 26/26 pass during the read-only audit.
- `pnpm.cmd test:security`: 11/11 pass during the read-only audit.
- Focused Golden Master lobby Playwright: failed before implementation because the host
  never reached the expected styled lobby state; the current dirty UI evidence is not
  release evidence.

## Source-of-truth exclusions

The educational-platform demo, rejected research HTML, Stitch brief, old Versioned
Testimony screenshots, generic UI UX Pro Max palette/ratings/download recommendations,
and stale readiness claims are not visual or release authorities.
