# E33 Mobile Data Classification

| Class                        | Examples                                                                    | Permitted persistence                                           |
| ---------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------- |
| A — Secret                   | Access and refresh tokens                                                   | SecureStore only                                                |
| B — Sensitive health         | Symptom/OCR text, prescription images, history, caregiver data, voice/audio | Server-backed or transient memory; no default local persistence |
| C — Limited operational      | Minimal medication and schedule summaries                                   | Privacy-reviewed bounded cache with TTL and stale label only    |
| D — Non-sensitive preference | Language and accessibility settings                                         | AsyncStorage                                                    |

Cache convenience never makes stale data clinically authoritative. Adding a new persisted category requires explicit privacy and clinical-safety review.
