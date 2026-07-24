# Claude Skills and Workflow

The repository includes project-specific Claude skills under `.claude/skills/`. Claude should invoke or follow them when the task matches.

## Required skill sequence

1. `repository-audit`
2. `game-design-guardian`
3. `multiplayer-authority`
4. `content-case-authoring`
5. `premium-web-experience`
6. `motion-direction`
7. `mobile-game-ux`
8. `security-redaction`
9. `qa-multiclient`
10. `accessibility-review`
11. `deployment-readiness`
12. `continuation-discipline`

## External/MCP tooling

Use available browser automation, Playwright, screenshots, network inspection, and accessibility tools. Do not claim visual verification without actual rendered evidence.

If Claude Code supports specialized agents/subagents, split only independent work:

- game engine/content validation;
- server/protocol;
- marketing UI;
- game UI;
- QA/security.

A lead agent must reconcile shared types, design tokens, and evidence. Parallel agents must not independently redefine rules.
