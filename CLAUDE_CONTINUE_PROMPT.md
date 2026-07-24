# Claude Code Continue Prompt

Resume AL RIWAYAH from the repository's actual state. Do not restart or recreate completed work.

1. Read `CLAUDE.md`.
2. Read `PROGRESS.md`, latest `DECISIONS.md`, open `RISK_REGISTER.md`, and `ROADMAP.md`.
3. Run:
   - `git status --short --branch`
   - `git diff`
   - `git log -5 --oneline`
4. Inspect running dev/test processes and stale temporary locks. Stop only obsolete processes; do not delete uncommitted work.
5. Identify the last incomplete requirement and its evidence.
6. Re-run tests affected by the latest changes.
7. Fix failures before moving on.
8. Continue the current roadmap phase, then automatically continue all later phases.
9. Update progress, decisions, risks, protocol, and evidence continuously.
10. Do not stop to provide a summary unless a permitted external blocker exists.

The final target remains:
- production-complete premium website;
- polished one-case 4–6 player mobile game;
- authoritative secrecy/reconnect;
- all automated acceptance gates;
- human playtest handoff only after automatable work is complete.
