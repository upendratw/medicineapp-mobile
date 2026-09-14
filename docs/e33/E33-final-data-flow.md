# E33 Final Data Flow

## Authentication

```text
Phone -> POST /api/v1/auth/request-otp -> FastAPI
OTP + challenge -> POST /api/v1/auth/verify-otp -> access/refresh tokens
tokens -> Expo SecureStore
```

Both tokens are required for restoration and stored atomically. Invalid/partial storage fails closed. The current app stores the refresh token but has no automatic refresh service flow.

## Medication and schedules

```text
Mobile -> authenticated ApiClient -> FastAPI medication/schedule domain -> MySQL
```

MySQL is backend-only. Catalog search and schedule list/create/update use real APIs. Patient-owned medication list/create has no current backend contract; the development memory adapter is explicitly non-authoritative.

## E22 drug information

```text
Mobile query -> FastAPI E22
             -> backend embedding/retrieval services
             -> backend approval/evidence checks
             -> evidence-bound response and citations -> mobile
```

The backend may use Gemini, OpenSearch, S3, and MySQL under its own approved architecture. Mobile calls none of them, performs no clinical inference, and does not locally translate evidence marked `human_translation_required`.

## Push registration

```text
User permission -> physical-device Expo push token (transient)
                -> POST /api/v1/devices
                -> opaque registration ID in SecureStore
                -> E19 production delivery [PENDING]
```

Notification taps pass through the action-free deep-link allowlist. Logout attempts device unregister and always clears the local registration ID.

## Camera and OCR

```text
Camera permission -> transient image -> explicit continuation
                  -> approved backend OCR/recognition when available [PENDING]
                  -> candidate review -> mandatory user confirmation -> save
```

The current production OCR backend is absent. Images/candidates remain transient; no direct S3, Gemini, or provider upload exists. Manual entry is the safe fallback.

## Pending flows

Validated interactions, prescription OCR/upload, inventory/refill, symptom assessment, production voice/STT, automatic token refresh, patient medication list/create, and E19 delivery/context remain pending. Pending adapters fail explicitly and do not fabricate success or medical guidance.
