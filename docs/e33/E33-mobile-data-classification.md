# E33 Mobile Data Classification

MED-1361 reconciliation confirms four storage classes:

- **Class A — Secrets:** access and refresh tokens use SecureStore only. Logout clears tokens and the opaque push registration ID; malformed/partial values fail closed.
- **Class B — Sensitive health data:** symptoms, prescription images, OCR text, history, caregiver data, voice/audio/transcripts, and clinical evidence are server-backed or transient in memory by default. Capture state is cleared on retake/continuation and is not placed in offline storage.
- **Class C — Limited operational cache:** only approved UI, medication-summary, and schedule-summary categories use the bounded TTL cache. Expired/corrupt data is removed; stale reads require an explicit stale path.
- **Class D — Non-sensitive preferences:** language, accessibility, and onboarding preferences may use AsyncStorage.

The push token is transient; only a bounded opaque backend registration ID uses SecureStore. See `E33-final-data-architecture.md` for the canonical limits and prohibitions.

| Class                        | Examples                                                                    | Permitted persistence                                           |
| ---------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------- |
| A — Secret                   | Access and refresh tokens                                                   | SecureStore only                                                |
| B — Sensitive health         | Symptom/OCR text, prescription images, history, caregiver data, voice/audio | Server-backed or transient memory; no default local persistence |
| C — Limited operational      | Minimal medication and schedule summaries                                   | Privacy-reviewed bounded cache with TTL and stale label only    |
| D — Non-sensitive preference | Language and accessibility settings                                         | AsyncStorage                                                    |

Cache convenience never makes stale data clinically authoritative. Adding a new persisted category requires explicit privacy and clinical-safety review.

MED-1344 inventory adds phone/OTP authentication data, medication and adherence records, caregiver relationships, emergency contacts, optional notification identifiers, and device/app metadata to the declaration review scope. Pending package/prescription, symptom, and voice adapters do not currently transmit their transient inputs. Server retention, deletion, processors, third-party sharing, and India DPDP/regulatory conclusions remain privacy/legal-review gaps.
