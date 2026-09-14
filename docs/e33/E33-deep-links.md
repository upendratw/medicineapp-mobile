# E33 Deep Links

MED-1332 supports the existing `medicineapp` custom scheme only. The allowlist maps `home`, `medicines`, `schedule`, `history`, `drug-information`, `accessibility`, `language`, `inventory`, and `interactions` to protected Expo Router screens. Universal/HTTPS app links and resource-ID routes are deferred because no production domain or current detail route contract exists.

External links are untrusted. The parser rejects other schemes, credentials, query strings, fragments, extra path segments, oversized input, unknown routes, and sensitive/action terms including tokens, OTPs, clinical text, Taken/Skip/Snooze, dose, caregiver, emergency, and SOS. Rejected input falls back to home without exposing input. A valid intended destination remains only in memory while authentication and onboarding guards complete. Backend and screen authorization remain authoritative.

Links navigate only. They cannot execute medication actions, contact caregivers, initiate SOS, or bypass confirmation.
