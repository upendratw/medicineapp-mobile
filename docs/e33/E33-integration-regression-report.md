# MED-1359 Integration and Regression Report

Local automated regression on 2026-09-14 passed: 33 suites and 167 tests, with zero failures or skips. TypeScript, ESLint, Prettier, Expo dependency compatibility, public Expo configuration, release validation, Android JavaScript export, diff validation, and static security/privacy/clinical checks passed.

Coverage includes environment guards; auth/SecureStore/logout; route/onboarding/deep-link/push-tap guards; accessibility/localization; medication/camera/OCR/schedule/reminder/intake/history; E22 evidence; pending interaction/prescription/inventory/symptom/STT behavior; bounded offline cache; generic notifications; privacy-safe observability; and prohibited clinical actions.

**LIVE DEVELOPMENT/TEST INTEGRATION REGRESSION: PENDING.** No configured API URL, EAS project, deployment artifact, device, or emulator existed. Backend `/health`, `/live`, `/ready`, auth, caregiver, schedule/reminder, intake/history, E22, and device registration were not contacted. Passing mocked/contract tests and Expo export are not live integration evidence.

Dependency audit remains non-green by design: 14 moderate transitive advisories are open; forced breaking fixes were not applied.
