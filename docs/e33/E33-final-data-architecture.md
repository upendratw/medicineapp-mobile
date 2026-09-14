# E33 Final Data Architecture

| Class                      | Examples                                                                               | Permitted location                                                      | Rules                                                                                                        |
| -------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Secret                     | access token, refresh token                                                            | Expo SecureStore                                                        | Atomic pair, device-only accessibility, bounded values, clear on corruption/logout                           |
| Security/session metadata  | opaque backend push registration ID                                                    | Expo SecureStore                                                        | Bounded opaque identifier; no push token persistence                                                         |
| Non-secret preference      | onboarding, language, accessibility                                                    | AsyncStorage                                                            | Versioned/bounded application preferences only                                                               |
| Approved operational cache | UI config, medication summary, schedule summary                                        | AsyncStorage through `BoundedOfflineCache`                              | Read-only; maximum 20 entries, 8 KiB/item, 64 KiB total; TTL 1 s–24 h; optional stale window up to twice TTL |
| Sensitive health data      | medication, schedule, reminder, intake/history, caregiver context, E22 evidence        | Server-backed and runtime memory; only approved summaries may be cached | Backend authoritative; no fabricated fallback                                                                |
| Transient high-risk input  | prescription image, OCR candidate/content, symptom text/result, voice audio/transcript | Memory only                                                             | Never placed in offline cache or observability                                                               |

## Offline behavior

Cache categories are allowlisted. Tokens, secrets, prescriptions, OCR, symptoms, voice/audio, emergency, caregiver, history, clinical, and interaction data are rejected. Expired entries are removed; malformed envelopes fail closed and are deleted. Approved stale reads are labeled stale. Reconnection returns authority to the backend.

There is no offline clinical-write queue. `requireOnline` rejects disconnected writes and states that the action was not queued; the UI must never report fake success.

## Privacy and observability

The content-free observability schema accepts fixed event/category/outcome values, bounded uppercase error codes, low-cardinality metric labels, and duration buckets. It prohibits API bodies, tokens, push tokens, patient identifiers, medication names, symptoms, OCR content, prescriptions, transcripts, clinical evidence, and arbitrary metadata. Sinks default to no-op; any future exporter requires privacy/security approval.

Mobile contains no AWS, MySQL, S3, OpenSearch, or Gemini credentials or direct clients.
