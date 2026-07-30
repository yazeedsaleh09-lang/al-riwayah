# Implementation plan

This checklist is executed against the current dirty worktree. Existing approved files
are preserved and changed only for objective defects or missing production behavior.

## 1. Security and authoritative lifecycle

- [ ] Add failing WebSocket handshake Origin tests, then enforce the configured origin
      allowlist for production Socket.IO requests.
- [ ] Add failing restore-while-bound tests, then enforce one-socket/one-session binding
      with correct cleanup and private projection isolation.
- [ ] Add failing missing/stale/future revision tests, then require `phaseRevision` in
      gameplay intent schemas and manager calls.
- [ ] Add failing disconnected-player deadline test, then prevent early phase completion
      and apply deterministic no-response fallback/penalty at the deadline.
- [ ] Restrict result attribution to released contradictions.
- [ ] Avoid room-wide broadcasts for cached, invalid, or rate-limited intents.
- [ ] Strengthen recursive DTO forbidden-key assertions and the phase-skip assertion.

## 2. Golden Master gameplay integration

- [ ] Load or safely consolidate the required `.gm-*` lobby/question/result styles.
- [ ] Implement local answer selection followed by an enabled confirmation action.
- [ ] Keep the answer private, revision-bound, idempotent, and immutable after lock.
- [ ] Restore valid main landmarks for no-session/loading/recovery states.
- [ ] Update Playwright helpers to use the real select → confirm behavior.

## 3. Complete the public product surface

- [ ] Extend the locked homepage below the hero with real product explanation, three
      steps, contradiction example, current mobile gameplay/result previews, the one
      playable case, replay value, final CTA, and footer.
- [ ] Add accessible mobile homepage navigation without changing the locked 1440×900
      desktop geometry.
- [ ] Add `/about`.
- [ ] Add route loading UI and focused error/loading evidence.
- [ ] Canonicalize `/join`, preserve `/play` compatibility, and normalize links/sitemap.
- [ ] Remove stale review-build and deprecated terminology from public copy.
- [ ] Reconcile privacy/terms text with actual ephemeral in-memory behavior.
- [ ] Consolidate compatible tokens/components without introducing a competing theme.

## 4. Responsive, accessibility, and browser coverage

- [ ] Add failing route/copy/canonical/question-confirm tests before implementation.
- [ ] Reconcile obsolete homepage tests with the approved Golden Master baseline.
- [ ] Cover `/about`, loading/error, direct room/no-session, and canonical behavior.
- [ ] Validate 320×568 through 1920×1080, RTL, safe areas, 44px targets, focus, keyboard,
      screen-reader status, reduced motion, console output, and overflow.
- [ ] Run real 4/5/6-client create-to-results sessions including reconnect, host transfer,
      full-room rejection, replay, and new group.

## 5. Release evidence and existing deployment

- [ ] Save and inspect required screenshots in
      `artifacts/full-product-completion/screenshots/`.
- [ ] Write `VISUAL_REVIEW.md` and update the acceptance record with fresh commands.
- [ ] Run install, lint, typecheck, unit, content validation, integration, security,
      production build, full E2E, production performance, diff, and secrets gates.
- [ ] Classify and stage exact intended files; exclude `.codex/`, safety backup, raw
      temporary output, local profiles, and secrets.
- [ ] Commit and push normally to the existing `main` branch.
- [ ] Verify `HEAD == origin/main`, wait for the same Render services, then verify the
      existing web/server URLs and a production smoke game.
