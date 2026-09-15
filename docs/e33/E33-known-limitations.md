# E33 Known Limitations

These items remain open and must not be represented as completed:

- Android 10–15 device/emulator execution, low-memory execution, system-font scaling, and manual TalkBack traversal.
- Actual Development and Test deployment, deployed runtime smoke, and live Test integration regression.
- EAS project linkage, environment API URLs, native build targets, signing credentials, signed AAB, Play App Signing, and Play upload/submission.
- Play graphics, synthetic-data screenshots, production privacy-policy URL, and approved store declarations.
- Independent human peer review, epic-owner decision, privacy/legal/India regulatory review, clinical/regulatory validation, and production release approval.
- E19 production push/reminder delivery and context.
- Expo Go supports bounded non-push development only; Android remote-notification registration and tap validation require an installed EAS development/preview build.
- Patient-owned medication list/create backend contract and production OCR/recognition.
- Validated interaction engine, prescription OCR/upload, inventory/refill, symptom assessment, and production voice/STT backends.
- Automatic access-token refresh is not implemented; the refresh token is stored but no refresh service flow exists.
- E22 clinical translation remains backend/human controlled; `human_translation_required` is not bypassed.
- Fourteen moderate transitive npm advisories remain an open release-governance item; forced breaking fixes were not applied.
- Offline support is limited to bounded, read-only approved summaries; no clinical write is queued and stale data is labeled.
- Development-only medication/reminder fixtures are non-authoritative and do not establish backend integration.

E33 engineering implementation and automated repository validation do not establish production, clinical, legal, deployment, device, or owner acceptance.
