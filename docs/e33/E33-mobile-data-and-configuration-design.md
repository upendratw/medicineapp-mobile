# E33 Mobile Data and Configuration Design

| Model/domain             | Source of truth                     | Mobile lifetime/persistence                  | Sensitive / validation                                    |
| ------------------------ | ----------------------------------- | -------------------------------------------- | --------------------------------------------------------- |
| Auth/session             | FastAPI auth                        | SecureStore until logout/invalid             | Secret; bounded token validation, fail closed             |
| User/profile             | Backend                             | memory                                       | Personal; backend authoritative                           |
| Medication               | Backend or explicit user input      | memory; minimal summary cache TTL            | Health; status/source labels and server validation        |
| Schedule                 | Backend                             | memory; minimal summary cache TTL            | Health; typed rule/date/time bounds                       |
| Reminder                 | Backend                             | memory                                       | Health; typed context and idempotent action keys          |
| Intake/history           | Backend                             | memory                                       | Health; factual outcomes only                             |
| Caregiver                | Backend relationship                | memory                                       | Sensitive; backend authorization                          |
| OCR candidate            | Pending backend/development fixture | transient memory                             | Health; mandatory confirmation                            |
| E22 result/citation      | Backend                             | memory                                       | Clinical evidence; backend authority/no local translation |
| Interaction result       | Future backend                      | memory                                       | Clinical; pending adapter/no local inference              |
| Prescription candidate   | Future backend                      | transient memory                             | Health image/text; no current upload                      |
| Inventory/refill         | Future backend                      | memory                                       | Health; pending adapter/no dose/refill claims             |
| Symptom request/result   | User/future backend                 | transient memory                             | Health free text; no local triage                         |
| Emergency contact        | Backend                             | memory                                       | Personal; confirmed OS call only                          |
| Voice command            | User/future STT                     | transient memory                             | Sensitive; deterministic allow/block/confirm              |
| Accessibility/language   | User                                | AsyncStorage                                 | Non-secret preference                                     |
| Offline cache entry      | Backend-derived approved summary    | AsyncStorage; ≤24h TTL, ≤48h stale window    | Limited; allowlist, 20 items, 8 KiB each, 64 KiB total    |
| Push/device registration | Device/backend                      | token transient; registration ID SecureStore | Identifier; backend registration/revocation               |
| Deep-link intent         | Untrusted external input            | memory only                                  | Allowlisted action-free destination                       |

## Configuration

`development`, `test`, `staging`, and `production` are explicit. `EXPO_PUBLIC_APP_ENV`, API base URL, 1–30 second timeout, and diagnostics flag are validated. Staging/production require HTTPS, non-loopback hosts, diagnostics off, and no secret-like public variable names. Scheme is `medicineapp`; Android package is `com.medicineapp.mobile`.

EAS profiles create internal APK intent for development/test/staging and AAB intent for production. Production API URL and signing material are provisioned outside Git. `npm run release:check` verifies release invariants. No secret values are documented here.
