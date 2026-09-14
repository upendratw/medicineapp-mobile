# E33 Google Play Data Safety Draft

**DRAFT — REQUIRES PRIVACY/LEGAL REVIEW BEFORE SUBMISSION**

Provisional Play data-type mapping based on current mobile code and backend contracts:

- Personal info: phone number for account authentication.
- Health and fitness: medication details, schedules, reminder/intake history, user-entered notes, and caregiver/dependent health context.
- App activity: medication/reminder actions needed to provide core functionality.
- Device or other identifiers: Android device identifier, app version/platform, Expo push token, and backend registration identifier for optional notifications.
- Photos/files: current package and prescription images remain local/transient and are not collected by the pending adapters; this must change if an upload contract is introduced.
- Health symptom and voice inputs: current adapters are pending and do not transmit them; reassess before enabling production integrations.

Likely purposes are app functionality, account management, and optional notification delivery—not advertising. Required/optional status varies by feature and must follow the global Play definition. “Shared with third parties,” retention/deletion, processor roles, encryption in transit/end-to-end claims, account-deletion commitments, and SDK collection require backend, infrastructure, contract, and privacy review.

Before submission, reconcile the released AAB, permissions, every included SDK, backend telemetry, privacy policy, Health apps declaration, and all regions/versions. Google Play treats off-device transmission as collection and requires accurate declarations even for third-party SDK behavior. No form was entered or submitted.
