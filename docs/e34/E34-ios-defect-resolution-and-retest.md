# E34 defect resolution and retest

E34-DEF-001 root cause was an Android-only platform type, identifier lookup, and backend payload in the shared registration adapter. The fix introduces bounded `android | ios`, uses Expo Application's iOS vendor identifier for installed iOS runtimes, and sends the actual platform through the existing authenticated backend service. Expo Go still exits before permission/token/backend calls. Focused coordinator/config tests passed. Residual risk: APNs and physical installed-build execution remain PENDING.

## E34-DEF-002 — restored session recovery

The client restored a session based only on the presence of a complete access/refresh pair. It attached the restored access token, but `ApiClient` treated a protected HTTP 401 as an ordinary request failure. The backend already supports `POST /api/v1/auth/refresh`, rotates both tokens, and rejects expired/reused refresh credentials. The client now performs one single-flight refresh, atomically replaces the SecureStore pair, and retries the original request once. A rejected/missing refresh or a second 401 clears current and legacy auth keys and signals `AuthContext` to become unauthenticated. HTTP 403, ordinary network failure, and 5xx do not invalidate the session.

The observed device evidence proves that the restored access credential was rejected; it does not reveal whether expiry or another backend authentication rejection was the precise server-side reason. No token was decoded, logged, or copied during diagnosis.

## E34-DEF-003 — reachable Logout

The logout service already attempted backend revocation, tolerated remote failure, cleared push-registration metadata, and cleared local credentials. The authenticated UI had no route to invoke it. Home now links to a localized Account and session screen with an accessible, confirmation-gated Logout control. `AuthContext` transitions to unauthenticated and the existing route guard returns to Login.

Automated recovery, concurrency, failure-boundary, logout, localization, accessibility, push-cleanup, and navigation tests pass. Physical-iPhone retest remains **PENDING** and must cover force-close/reopen, successful refresh, rejected-refresh Login routing, and Logout.

## E34-DEF-004 — manual form reset

The form used controlled field state but its confirmed-success branch only displayed a success alert and invoked capture cleanup. It never reset `name`, `strength`, `dosageForm`, `notes`, validation errors, or the visible form state. Confirmed success now clears every editable field and validation error, retains a localized announced success state, and leaves the form unable to resubmit the prior medicine. Validation or service failure retains all entered values. The current Development contract remains the existing non-authoritative in-memory adapter; no backend creation success is fabricated.

## E34-DEF-005 — iOS capture control

Controls were children of the native `CameraView`, bottom-aligned without a safe-area boundary. That composition was not reliable on the physical iPhone and could place or composite controls below the native preview/home-indicator area. The preview and controls are now siblings: the preview fills the container and a safe-area overlay owns the visible text-labelled shutter and Cancel controls. Capture waits for `onCameraReady`, uses a single-flight gate, disables while active, sanitizes failure, and keeps the image only in transient capture context. Preview, Retake, and explicit Continue remain mandatory; capture does not upload or trust OCR automatically.

## E34-DEF-006 — caregiver 403

Backend `GET /api/v1/e21/caregiver/patients` requires `CAREGIVER`. An authenticated patient account therefore correctly receives `FORBIDDEN`/403. The client now distinguishes authentication failure, role-forbidden access, temporary network/server failure, and a legitimate 200 empty list. A 403 shows neutral localized access-unavailable copy and a return to patient Home; it does not refresh credentials, log out, retry as an outage, weaken authorization, or fabricate an empty relationship.

## E34-DEF-007 — E22 404 investigation

At backend SHA `21b1bd6b360fd7eecefb5863c1069b8d70c02b53`, `app/api/v1/rag.py` defines `POST /drug-information/query`, `app/api/v1/router.py` registers that router, and the application mounts it under `/api/v1`. The mobile path is therefore source-correct. The same endpoint intentionally returns `MEDICATION_NOT_FOUND`/404 when the query does not uniquely identify an active `APPROVED` medication. Manual mobile entries are development-only local records and are not automatically approved backend catalog identities. The observed HTTP status alone cannot distinguish that domain response from a deployed route gap because the response error code and deployed OpenAPI were not captured. No endpoint change, local AI fallback, or fabricated drug result was added. Follow-up must capture the sanitized error code and deployed OpenAPI path.
