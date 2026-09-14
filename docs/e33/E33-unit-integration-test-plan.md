# E33 Unit and Integration Test Plan

This catalog was reconstructed after implementation during MED-1350. It was **not historically created before implementation**; the roadmap chronology requirement is therefore **NOT HISTORICALLY SATISFIED — reconstructed retrospectively**.

All automated cases use synthetic data and no live backend/cloud/database.

| Test ID | Requirement/scenario and precondition | Steps / expected result                                         | Mode / implementation                    | Status  |
| ------- | ------------------------------------- | --------------------------------------------------------------- | ---------------------------------------- | ------- |
| E33-T01 | Auth phone/OTP bounds                 | submit invalid/valid values; invalid rejected                   | Auto `auth.test.ts`                      | PASS    |
| E33-T02 | Auth backend failure/session          | return 401/network/corrupt secure values; sanitized/fail closed | Auto auth/secure-store/governance tests  | PASS    |
| E33-T03 | Navigation/onboarding guard           | vary auth/completion; only correct route group                  | Auto navigation/onboarding tests         | PASS    |
| E33-T04 | Patient dashboard states              | loading/empty/error/data                                        | Auto patient-dashboard tests             | PASS    |
| E33-T05 | Caregiver authorization               | select only backend-authorized relationship                     | Auto caregiver-dashboard/backend tests   | PASS    |
| E33-T06 | Medicine list/manual entry            | missing data, refresh, duplicate press, unavailable adapter     | Auto medicine/manual tests               | PASS    |
| E33-T07 | Camera permission                     | grant/deny/cancel/retake; no auto-upload                        | Auto camera/prescription tests           | PASS    |
| E33-T08 | OCR trust                             | unavailable/invalid/reject/no confirmation                      | Auto OCR tests                           | PASS    |
| E33-T09 | Schedule validation                   | invalid date/time/duplicate rules/unconfirmed medicine          | Auto schedule tests                      | PASS    |
| E33-T10 | Reminder actions                      | taken/snooze/skip, duplicate and failure states                 | Auto reminder tests                      | PASS    |
| E33-T11 | Intake/history                        | loading/empty/failure/factual outcome                           | Auto history tests                       | PASS    |
| E33-T12 | E22 evidence                          | unavailable/no citations/translation flag/no advice             | Auto drug-information tests              | PASS    |
| E33-T13 | Interactions                          | pending/unvalidated result rejected/no local inference          | Auto interaction/clinical-contract tests | PASS    |
| E33-T14 | Prescription                          | backend absent/image discard/no auto-upload                     | Auto prescription tests                  | PASS    |
| E33-T15 | Inventory                             | pending/incomplete quantity/no dose/refill advice               | Auto inventory tests                     | PASS    |
| E33-T16 | Symptoms                              | pending/no local diagnosis or triage                            | Auto high-risk tests                     | PASS    |
| E33-T17 | SOS                                   | cancel/device failure/no auto-dispatch                          | Auto high-risk tests                     | PASS    |
| E33-T18 | Voice                                 | unknown/prohibited/unconfirmed command does not execute         | Auto high-risk tests                     | PASS    |
| E33-T19 | Accessibility                         | extra-large text/labels/non-color status                        | Auto component/accessibility tests       | PASS    |
| E33-T20 | Localization                          | en-IN/hi-IN fallback and clinical translation boundary          | Auto preference/localization tests       | PASS    |
| E33-T21 | Offline/cache                         | offline write, corruption, stale, expiry, bounds                | Auto offline/governance tests            | PASS    |
| E33-T22 | Deep links                            | malformed/oversized/secret/action/unknown routes                | Auto deep-link/governance tests          | PASS    |
| E33-T23 | Push                                  | deny/unavailable/register/unregister/malicious route/privacy    | Auto push/deep-link tests                | PASS    |
| E33-T24 | API failures                          | timeout/malformed/401/403/404/429/5xx                           | Auto auth/governance tests               | PASS    |
| E33-T25 | Release config                        | HTTP/loopback/diagnostics/public secret/profile                 | Auto environment/release tests           | PASS    |
| E33-T26 | Observability privacy                 | reject raw code; omit path/body/token; bounded labels           | Auto `observability.test.ts`             | PASS    |
| E33-T27 | Android/device matrix                 | execute Android 10–15, memory, font, TalkBack                   | Manual, device matrix                    | PENDING |

Detailed individual steps and assertions reside in the named automated files. New missing consolidated API status, malicious notification-route, offline-write, and telemetry-leakage cases were added in MED-1354.
