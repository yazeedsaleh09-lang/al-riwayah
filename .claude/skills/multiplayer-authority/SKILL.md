# Multiplayer Authority Skill

- Server owns membership, phase, deadline, allowed actions, score.
- Validate schema/session/phase/revision/deadline/option.
- Treat duplicate requests idempotently.
- Build explicit public/private DTOs.
- Use injectable clocks and seeded randomness.
- Test 4, 5, and 6 simultaneous clients.
