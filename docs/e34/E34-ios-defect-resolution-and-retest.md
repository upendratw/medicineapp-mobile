# E34 defect resolution and retest

E34-DEF-001 root cause was an Android-only platform type, identifier lookup, and backend payload in the shared registration adapter. The fix introduces bounded `android | ios`, uses Expo Application's iOS vendor identifier for installed iOS runtimes, and sends the actual platform through the existing authenticated backend service. Expo Go still exits before permission/token/backend calls. Focused coordinator/config tests passed. Residual risk: APNs and physical installed-build execution remain PENDING.

## E34-DEF-002 — restored session recovery

The client restored a session based only on the presence of a complete access/refresh pair. It attached the restored access token, but `ApiClient` treated a protected HTTP 401 as an ordinary request failure. The backend already supports `POST /api/v1/auth/refresh`, rotates both tokens, and rejects expired/reused refresh credentials. The client now performs one single-flight refresh, atomically replaces the SecureStore pair, and retries the original request once. A rejected/missing refresh or a second 401 clears current and legacy auth keys and signals `AuthContext` to become unauthenticated. HTTP 403, ordinary network failure, and 5xx do not invalidate the session.

The observed device evidence proves that the restored access credential was rejected; it does not reveal whether expiry or another backend authentication rejection was the precise server-side reason. No token was decoded, logged, or copied during diagnosis.

## E34-DEF-003 — reachable Logout

The logout service already attempted backend revocation, tolerated remote failure, cleared push-registration metadata, and cleared local credentials. The authenticated UI had no route to invoke it. Home now links to a localized Account and session screen with an accessible, confirmation-gated Logout control. `AuthContext` transitions to unauthenticated and the existing route guard returns to Login.

Automated recovery, concurrency, failure-boundary, logout, localization, accessibility, push-cleanup, and navigation tests pass. Physical-iPhone retest remains **PENDING** and must cover force-close/reopen, successful refresh, rejected-refresh Login routing, and Logout.
