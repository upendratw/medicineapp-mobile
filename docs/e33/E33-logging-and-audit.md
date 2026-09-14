# E33 Logging and Audit

`Logger`, `AuditSink`, and `MobileObservability` define content-free mobile operational records. Allowed fields are event, category, outcome, and an uppercase bounded sanitized error code. There is no arbitrary metadata field. Tokens, OTPs, phone numbers, medication/patient/caregiver identifiers or names, symptoms, prescriptions/images, OCR text, transcripts/audio, contacts, E22 content/citation text, paths, response bodies, and raw errors cannot enter the contract.

Defaults are `NoopLogger` and `NoopAuditSink`: no console, file, analytics, or network output. API failure codes and bounded duration metrics are wired without URL paths or payloads. A future production sink requires privacy/security review and explicit approval.

Mobile operational audit is diagnostic evidence only. FastAPI/backend audit remains authoritative for clinical and security actions.
