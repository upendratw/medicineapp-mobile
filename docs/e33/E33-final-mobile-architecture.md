# E33 Final Mobile Architecture

Status: **MED-1361 TECHNICALLY COMPLETE — external validation and release work remain pending**.

## System boundary

```text
Expo / React Native
        |
        v
Expo Router
        |
        +--> authentication and onboarding
        +--> patient and caregiver UI
        +--> medication, schedule, reminder, and history workflows
        +--> drug information and high-risk safety boundaries
        +--> accessibility, en-IN/hi-IN UI, offline state
        +--> allowlisted deep links and push registration
        |
        v
Typed service layer -> authenticated ApiClient -> MedicineApp FastAPI backend
```

FastAPI is the only application backend. Behind that boundary, approved backend services may use MySQL and E22/AWS integrations such as Gemini, OpenSearch, and S3. Mobile never directly accesses any of them or their credentials.

## Bootstrap and application layers

The root Expo Router layout loads fonts and composes authentication, onboarding, preferences, network, capture, push-registration, and deep-link state. Route groups select authentication, onboarding, or protected application UI. Reusable theme/design components provide elderly-first controls, while typed services isolate domain mapping from the authenticated API client.

Medication capabilities include catalog search, non-authoritative development manual-entry state, camera capture, mandatory OCR candidate confirmation, and real schedule APIs. Reminder acknowledgement/snooze and intake history use real backend contracts; production E19 delivery/context remains pending. E22 drug information renders only backend answers, status, freshness, and citations. Bounded offline summaries never replace backend authority.

Operational observability uses closed, content-free event and metric contracts, sanitized error codes, low-cardinality labels, duration buckets, and no-op default sinks. It is not the authoritative clinical/security audit record and has no third-party analytics exporter.

## Authentication and session

The patient requests an OTP with `POST /api/v1/auth/request-otp` and verifies it with `POST /api/v1/auth/verify-otp`. The returned access and refresh tokens are atomically stored in Expo SecureStore. Startup restores a session only when both bounded values are present; missing, malformed, or unreadable values fail closed. The current client does **not** implement automatic access-token refresh even though it stores the refresh token. Logout attempts `POST /api/v1/auth/logout`, unregisters the stored backend device association, and clears local tokens even if either remote call fails.

Push permission is user initiated. A physical device and EAS project ID are required to acquire an Expo push token. The token is transient and sent through the authenticated API client to `POST /api/v1/devices`; only the opaque backend registration ID is retained in SecureStore. Logout calls `DELETE /api/v1/devices/{device_id}` when possible and always removes the local association.

## Navigation

Routes are divided into `(auth)`, `(onboarding)`, and protected `(app)` groups. Route guards use local session/onboarding state for navigation, while backend authorization remains authoritative. Deep links accept only the `medicineapp:` scheme and a fixed action-free destination allowlist. Query strings, fragments, credentials, identifiers, secrets, and clinical/action payloads are rejected. Notification taps use the same allowlist and can navigate only; they cannot record medication actions or initiate emergency activity.

## Accessibility and localization

Reusable components support scalable text, text-plus-color status, accessible labels/roles, larger controls, high contrast, and reduced motion preferences. UI resources cover `en-IN` and `hi-IN`. E22 clinical evidence is never locally translated; the backend's evidence language and `human_translation_required` boundary are preserved. Android system-font, TalkBack traversal, low-memory, and Android 10–15 runtime evidence remain pending.

## High-risk safety boundaries

- OCR candidates require explicit human confirmation before becoming authoritative.
- Interaction results require a validated backend; the device performs no interaction inference.
- Symptoms receive no local diagnosis or triage.
- SOS only opens a confirmed OS dialer path and never claims dispatch.
- Voice navigation is bounded; medication and emergency actions require visual confirmation, and diagnosis, prescribing, stopping medicine, or dose changes are blocked.
- E22 answers retain evidence, citation, freshness, and personalized-advice boundaries.

## Push and release

```text
Mobile -> Expo Notifications -> transient push token
       -> POST /api/v1/devices -> backend registration
       -> E19 delivery [PENDING] -> generic notification
       -> validated protected navigation only
```

EAS profiles express internal APK intent for development, test/preview, and staging, and AAB intent for production. This is configuration, not deployment. EAS project linkage, environment API URLs, signing credentials, Play App Signing, signed AAB validation, and Play submission remain pending.

Canonical companions: `E33-final-api-integration-matrix.md`, `E33-final-data-architecture.md`, and `E33-final-environment-architecture.md`.
