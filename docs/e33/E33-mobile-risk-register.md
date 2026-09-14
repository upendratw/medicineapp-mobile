# E33 Mobile Risk Register

| Risk                                      | Severity | Current control                                                        | Residual action/status                              |
| ----------------------------------------- | -------- | ---------------------------------------------------------------------- | --------------------------------------------------- |
| Mobile token disclosure/device compromise | High     | device-only SecureStore, sanitized errors, no token logging            | Device security assessment pending                  |
| Cross-patient caregiver access            | Critical | relationship selection plus backend authorization                      | Backend/security validation remains mandatory       |
| Unsafe clinical output or translation     | Critical | pending adapters, E22 evidence binding, no local inference/translation | Clinical/regulatory validation pending              |
| Accidental emergency/medication action    | Critical | confirmation boundaries and no automatic dispatch                      | Manual device validation pending                    |
| Sensitive image/text/audio persistence    | High     | transient memory, prohibited offline-cache categories                  | Reassess every future backend/provider integration  |
| Malicious deep link/push route            | High     | bounded action-free allowlist plus auth guard                          | Re-review when resource links are added             |
| Stale/fabricated offline result           | High     | TTL/stale labels and no write queue                                    | Encryption-at-rest/product policy review pending    |
| PHI/PII telemetry leakage                 | High     | closed content-free schema, no-op sinks, privacy tests                 | Any production exporter requires approval           |
| Production configuration/signing error    | High     | release validator, HTTPS/non-loopback/diagnostics guards               | Signed AAB and environment validation pending       |
| Dependency vulnerabilities                | Medium   | lockfile/audit/Expo compatibility                                      | 14 moderate advisories OPEN; recheck before release |
| Notification privacy/delivery             | High     | generic private copy, transient token                                  | E19 production delivery validation pending          |
| Shoulder surfing/screenshots              | Medium   | minimized screens and generic notifications                            | OS screenshot policy/product UX decision pending    |

No risk acceptance by an owner, legal counsel, clinician, or independent reviewer is implied.
