# E33 Mobile Data Classification

| Class                        | Examples                                                                    | Permitted persistence                                           |
| ---------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------- |
| A — Secret                   | Access and refresh tokens                                                   | SecureStore only                                                |
| B — Sensitive health         | Symptom/OCR text, prescription images, history, caregiver data, voice/audio | Server-backed or transient memory; no default local persistence |
| C — Limited operational      | Minimal medication and schedule summaries                                   | Privacy-reviewed bounded cache with TTL and stale label only    |
| D — Non-sensitive preference | Language and accessibility settings                                         | AsyncStorage                                                    |

Cache convenience never makes stale data clinically authoritative. Adding a new persisted category requires explicit privacy and clinical-safety review.

MED-1344 inventory adds phone/OTP authentication data, medication and adherence records, caregiver relationships, emergency contacts, optional notification identifiers, and device/app metadata to the declaration review scope. Pending package/prescription, symptom, and voice adapters do not currently transmit their transient inputs. Server retention, deletion, processors, third-party sharing, and India DPDP/regulatory conclusions remain privacy/legal-review gaps.
