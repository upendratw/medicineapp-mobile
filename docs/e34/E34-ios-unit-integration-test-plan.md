# E34 iOS unit/integration test plan

E34 canonical iOS test plan: COMPLETE. Historical before-implementation sequencing for reused E33 functionality: NOT APPLICABLE / PRE-EXISTING SHARED IMPLEMENTATION.

Shared suites cover auth/OTP failures and duplicate submission, onboarding/route guards, SecureStore corruption/logout, camera denial/no auto-upload, notification runtime/denial/token/backend failure, deep links and notification taps, accessibility/Dynamic Type/Reduce Motion, responsive screens, offline/reconnect, malformed environment/API/cache, clinical translation/voice/SOS prohibitions, and privacy-safe observability. `ios-delivery-validation.test.ts` adds bundle identity, permissions minimization, iOS EAS environment, installed-build push registration, and direct-infrastructure exclusions. Simulator, physical iPhone, APNs, terminated-app, VoiceOver, and OS-version execution remain PENDING.
