# E33 Test Evidence

Scope: MED-1304 through MED-1310 mobile foundation. Automated tests cover environment rejection, protected route decisions, logout routing, component accessibility/loading/error states, Indian phone and OTP bounds, backend auth payloads, secure token persistence, sanitized auth errors, onboarding progression, and safety language.

Required final commands are `npm run typecheck`, `npm run lint`, `npm test -- --runInBand`, and `npx expo config --type public`. Static scans verify no credential patterns, token logging, or auth-token AsyncStorage use. Device deployment, production readiness, and clinical validation are outside this batch.

The initial npm audit reports 14 moderate transitive advisories in Expo Router/Expo build tooling. npm's proposed forced fix downgrades SDK-critical packages and was not applied. These advisories require upstream-compatible Expo updates and remain a release-governance follow-up; no high or critical advisory was reported.
