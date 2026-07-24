# Security Redaction Skill

Assume a player modifies the client.

- explicit DTO allowlists;
- no raw state serialization/logging;
- tokens scoped/opaque/expiring;
- CSP/origin/rate limits;
- replay and stale revision tests;
- recursive private-key leakage tests;
- incident runbook for any private leak.
