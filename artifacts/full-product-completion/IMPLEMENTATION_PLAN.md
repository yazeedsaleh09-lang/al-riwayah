# Implementation plan

This checklist is executed against the current dirty worktree. Existing approved files
are preserved and changed only for objective defects or missing production behavior.

## 1. Security and authoritative lifecycle

- [x] Add failing WebSocket handshake Origin tests, then enforce the configured origin
      allowlist for production Socket.IO requests.
- [x] Add failing restore-while-bound tests, then enforce one-socket/one-session binding
      with correct cleanup and private projection isolation.
- [x] Add failing missing/stale/future revision tests, then require `phaseRevision` in
      gameplay intent schemas and manager calls.
- [x] Add failing disconnected-player deadline test, then prevent early phase completion
      and apply deterministic no-response fallback/penalty at the deadline.
- [x] Restrict result attribution to released contradictions.
- [x] Avoid room-wide broadcasts for cached, invalid, or rate-limited intents.
- [x] Strengthen recursive DTO forbidden-key assertions and the phase-skip assertion.

## 2. Golden Master gameplay integration

- [x] Load or safely consolidate the required `.gm-*` lobby/question/result styles.
- [x] Implement local answer selection followed by an enabled confirmation action.
- [x] Keep the answer private, revision-bound, idempotent, and immutable after lock.
- [x] Restore valid main landmarks for no-session/loading/recovery states.
- [x] Update Playwright helpers to use the real select → confirm behavior.

## 3. Complete the public product surface

- [x] Extend the locked homepage below the hero with real product explanation, three
      steps, contradiction example, current mobile gameplay/result previews, the one
      playable case, replay value, final CTA, and footer.
- [x] Add accessible mobile homepage navigation without changing the locked 1440×900
      desktop geometry.
- [x] Add `/about`.
- [x] Add route loading UI and focused error/loading evidence.
- [x] Canonicalize `/join`, preserve `/play` compatibility, and normalize links/sitemap.
- [x] Remove stale review-build and deprecated terminology from public copy.
- [x] Reconcile privacy/terms text with actual ephemeral in-memory behavior.
- [x] Consolidate compatible tokens/components without introducing a competing theme.

## 4. Responsive, accessibility, and browser coverage

- [x] Add failing route/copy/canonical/question-confirm tests before implementation.
- [x] Reconcile obsolete homepage tests with the approved Golden Master baseline.
- [x] Cover `/about`, loading/error, direct room/no-session, and canonical behavior.
- [x] Validate 320×568 through 1920×1080, RTL, safe areas, 44px targets, focus, keyboard,
      screen-reader status, reduced motion, console output, and overflow.
- [x] Run real 4/5/6-client create-to-results sessions including reconnect, host transfer,
      full-room rejection, replay, and new group.

## 5. Release evidence and existing deployment

- [x] Save and inspect required screenshots in the established tracked release-evidence
      directories under `artifacts/final-playtest-pass/`.
- [x] Complete the visual review and update the acceptance record with fresh commands.
- [x] Run install, lint, typecheck, unit, content validation, integration, security,
      production build, full E2E, production performance, diff, and secrets gates.
- [x] Classify and stage exact intended files; exclude `.codex/`, safety backup, raw
      temporary output, local profiles, and secrets.
- [x] Commit and push normally to the existing `main` branch.
- [x] Verify `HEAD == origin/main`, wait for the same Render services, then verify the
      existing web/server URLs and a production smoke game.
