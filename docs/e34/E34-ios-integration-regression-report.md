# iOS integration/regression report

Typecheck and lint passed. Jest passed 39/39 suites and 201/201 tests with no skips. Formatting, Expo dependency/config checks, and release configuration validation passed. Android export bundled 1,437 modules and iOS export bundled 1,300 modules successfully into temporary directories. These are bundle checks, not runtime execution. Diff check and static safety scan are recorded by the final validation handoff.

`npm audit` reported 14 moderate transitive advisories in Expo Router/config tooling. Its available complete remediation requires `--force` and breaking dependency changes, so no forced update was applied. Simulator/device, authenticated live-backend flows, APNs delivery, and terminated-app behavior remain PENDING and must not be inferred from bundles.

## Session-recovery defect regression

E34-DEF-002/003 add automated coverage for valid restored sessions, one-time refresh and retry, token rotation, missing/rejected refresh fail-closed behavior, repeated-401 bounds, concurrent single-flight refresh, 403/network/5xx preservation, logout cleanup, Login routing, reachable accessible Logout, Hindi copy, secure-storage boundaries, and existing push cleanup. Final validation passed 39/39 Jest suites and 201/201 tests, typecheck, lint, formatting, Expo dependency/configuration checks, release checks, Personal-Team clean iOS prebuild with no `aps-environment`, iOS export (1,300 modules), Android export (1,437 modules), diff check, and static credential/logging scans. Physical post-fix execution is not inferred from automation or export validation.
