# E21 Step 11 Gate B1.2 — Caregiver authentication enablement

Gate B1.2 removes the narrow mobile authentication blocker that previously
sent `role: patient` for every OTP request.

- Patient remains the default login role.
- Caregiver authentication requires explicit caregiver selection.
- Both roles reuse the existing E14 request-OTP and verify-OTP endpoints.
- The selected role is retained with the pending OTP challenge so resend uses
  the same role.
- OTP verification relies on the server-side challenge, and the backend token
  remains the authorization authority.
- Invalid runtime role values fail safely to patient and cannot elevate to
  caregiver, admin, or another role.

This gate does not add caregiver onboarding, relationship management, a new
caregiver dashboard, caregiver alert handling, or client-side authorization.
It does not register a device, request a real OTP, obtain an Expo token, send a
push, or perform physical-device validation. Full caregiver product UX remains
deferred to E21 Step 12.

## Logout and device-registration isolation

Logout is an authentication-session operation, not a device-revocation
operation. Normal Patient and Caregiver logout revokes the authentication
session, clears local authentication credentials, and returns the application
to its unauthenticated flow without deleting the backend `DeviceRegistration`.

Local push-registration bookkeeping is cleared on logout so that a later
authenticated user must run the normal backend-authoritative registration
flow. The client does not transfer or infer device ownership. Same-user
registration can be resolved idempotently by the backend, while a different
user remains subject to the existing token-ownership conflict protections.

Explicit unregister remains the operation that revokes a device registration.
Provider `DeviceNotRegistered` handling also continues to revoke only the
affected device. Preserving a registration across logout does not guarantee
future notification delivery: active device, permission, token, environment,
relationship, sharing, and alert-authorization checks still apply.

This correction does not change E19 reminder behavior, the Step 11
at-least-once/external-deduplication boundary, or any Step 12 user experience.
Physical verification remains pending until the correction is reviewed,
committed, and supplied to the development client from its new authoritative
commit.
