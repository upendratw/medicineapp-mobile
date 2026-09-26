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
