# iOS logging and audit

The shared observability boundary records bounded event, category, outcome, sanitized code, and duration bucket only. Suitable iOS outcomes include permission denied, capability unavailable, rejected deep link, secure-storage failure, offline/reconnect, API/auth category failure, and configuration failure.

JWTs, refresh tokens, OTPs, phone/user/device identifiers, Apple/APNs/Expo tokens, medication or symptom content, prescriptions, OCR/audio/transcripts, and clinical answers are prohibited in logs/audit. No console logging of those values is introduced.
