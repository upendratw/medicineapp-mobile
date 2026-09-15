# iOS integration/regression report

Typecheck and lint passed. Jest passed 35/35 suites and 179/179 tests with no skips. Formatting, Expo dependency/config checks, and release configuration validation passed. Android export bundled 1,435 modules and iOS export bundled 1,298 modules successfully into temporary directories. These are bundle checks, not runtime execution. Diff check and static safety scan are recorded by the final validation handoff.

`npm audit` reported 14 moderate transitive advisories in Expo Router/config tooling. Its available complete remediation requires `--force` and breaking dependency changes, so no forced update was applied. Simulator/device, authenticated live-backend flows, APNs delivery, and terminated-app behavior remain PENDING and must not be inferred from bundles.
