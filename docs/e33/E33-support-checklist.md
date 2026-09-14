# E33 Support Checklist

## Intake and containment

- [ ] Record environment, app version, Android version, time, and reproducible steps without PHI/PII.
- [ ] Classify SEV-1 through SEV-4 using the operational runbook.
- [ ] Stop promotion or the affected workflow when safety, authorization, or exposure risk exists.
- [ ] Confirm whether the problem is mobile, backend, network, device permission, or a documented pending integration.
- [ ] Never request OTPs, passwords, tokens, push tokens, prescription images, symptom text, transcripts, or raw clinical payloads in support logs.

## Safe checks

- [ ] Confirm app environment and sanitized API host/configuration; do not display secrets.
- [ ] Confirm connectivity and backend availability using approved operational probes outside patient workflows.
- [ ] Check session state, permission state, offline/stale indicator, and sanitized error code.
- [ ] Reproduce with synthetic data and an authorized account/relationship.
- [ ] Verify deep-link/notification input uses the allowlist and executes no clinical action.
- [ ] Check whether the capability is listed as pending in `E33-final-api-integration-matrix.md`.

## Escalation and closure

- [ ] Escalate to the relevant Engineering, Product, Operations, Privacy/Security, or Clinical Safety Owner.
- [ ] Preserve only minimal content-free evidence and commit/build identifiers.
- [ ] Document containment, remediation, reviewer, and retest; never silently close a safety incident.
- [ ] Re-run automated validation and required device/environment tests before promotion.
- [ ] Obtain required human, legal/privacy, clinical/regulatory, and release approvals.
