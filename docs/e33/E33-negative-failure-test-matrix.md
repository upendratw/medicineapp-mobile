# E33 Negative and Failure Test Matrix

| Area                               | Covered failure paths                                                       | Evidence                                 | Status/gap                                                 |
| ---------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------- |
| Auth/session                       | invalid phone/OTP, missing/corrupt storage, 401, logout offline             | auth, secure-store, governance tests     | Automated pass; real expiry integration pending            |
| Navigation/deep link               | unauthorized route, malformed/oversized/secret/action/unknown link          | navigation, deep-link, governance tests  | Automated pass; stale resource IDs not supported by design |
| Network/API                        | offline, timeout, malformed response, 401/403/404/429/5xx                   | auth and governance tests                | Automated pass                                             |
| Offline/cache                      | write offline, corruption, expiry, stale, bounds                            | offline/governance tests                 | Automated pass                                             |
| Medication/schedule                | missing/invalid/duplicate submit, invalid date/time, backend failure        | medicine/manual/schedule tests           | Automated pass; create backend pending                     |
| Camera/OCR                         | denied/failure/missing image/malformed candidate/no confirmation            | camera/OCR/prescription/resilience tests | Automated pass; backend pending                            |
| Reminder/history                   | duplicate, failed action/snooze, timeout, empty/bad response                | reminder/history/API tests               | Automated pass; E19 pending                                |
| E22                                | unavailable, translation required, no citation, invalid response, no advice | drug-information/clinical tests          | Automated pass; clinical validation pending                |
| Interaction/prescription/inventory | pending/unavailable/fail-safe                                               | respective feature tests                 | Automated pass; backends pending                           |
| Symptom/SOS/voice                  | pending, no diagnosis, cancel/call failure, unknown/prohibited/unconfirmed  | high-risk tests                          | Automated pass; device/backends pending                    |
| Push                               | deny/no token/register/unregister failure/malicious route/account cleanup   | push/deep-link/governance tests          | Automated pass; E19 pending                                |
| Localization/accessibility         | fallback, unsupported locale, large text, labels/alerts                     | preference/component/accessibility tests | Automated pass; manual device validation pending           |
| Release                            | HTTP/loopback/diagnostics/public secret                                     | environment/release tests                | Automated pass                                             |
| Observability                      | malicious error content/path/token cannot emit                              | observability tests                      | Automated pass; exporter absent by design                  |
