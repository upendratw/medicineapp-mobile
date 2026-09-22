# E16/E17 mobile OCR integration

**Status: PHYSICAL REVIEW-READY AND CONFIRMATION FLOW PASSED — clinical,
privacy/legal, peer-review, and owner acceptance remain pending.**

## Purpose

The scan workflow now uses the authenticated backend capture lifecycle instead
of the Development fixture. OCR output remains unconfirmed evidence. The user
must review and may correct every extracted field before explicitly confirming,
retrying, or continuing with manual entry.

## User flow

1. Take a photo or choose a JPEG/PNG from the system photo library.
2. Review the local preview. Nothing is uploaded before **Continue**.
3. Continue initiates an authenticated owner-bound capture.
4. The app uploads to the short-lived server-issued URL with the exact required
   headers; it has no AWS credential and cannot choose a bucket or object key.
5. The app completes the upload and polls the bounded capture state.
6. Review-ready, no-match, retake-required, and failed-safe are distinct
   bounded outcomes.
7. Review-ready displays five editable medicine fields. Other outcomes provide
   explicit retake, replacement-photo, manual-entry, and cancel choices.
8. Confirmation sends user-reviewed values before navigation continues.

The app never treats OCR text as an active medication, schedule, prescription,
or dose. The camera workflow does not query E15, a medicine master, or an
external catalog and does not verify catalog existence.

## Failure and privacy behavior

- Unsupported type, unreadable/low-quality image, no match, timeout, and safe
  provider failure do not fabricate missing medicine fields.
- Local preparation uses Expo FileSystem `File.bytes()` under a deadline and
  retains the exact bounded `Uint8Array`. Expo's installed fetch implementation
  accepts the binary view directly; React Native's unsupported
  `new Blob([Uint8Array])` path is not used.
- Capture initiation, presigned PUT, completion, and total polling each have
  bounded deadlines and abort propagation.
- Upload/completion/API failures do not silently rewrite the capture as
  cancelled. Explicit cancellation or abandonment may request bounded
  best-effort server cancellation and cleanup.
- `NO_MATCH`, `RETAKE_REQUIRED`, and `FAILED_SAFE` never trigger generic
  automatic cancellation. Explicit Retake/Cancel can cancel and schedule
  cleanup. Manual entry records `none_of_these` for decidable outcomes and does
  not prepopulate OCR text as authoritative input.
- Camera denial still permits gallery selection and manual entry.
- Photo-library selection uses the Expo SDK 57 ImagePicker system UI with a
  bounded privacy permission string.
- Tokens, presigned URLs, OCR text, images, and medication content are not
  logged by the service.
- When explicitly enabled in Development, diagnostics emit only closed stage
  identifiers and sanitized failure codes. They never emit a URI, image data,
  URL, key, token, user identity, or clinical content.
- Capture state is transient in React context; logout/global application data
  clearing continues to remove local capture metadata through existing flows.

## Validation boundary

Unit tests use synthetic URIs, byte arrays, OCR fields, and mocked HTTP. They prove
explicit upload timing, required headers, backend-mediated decisions, safe
failed upload behavior, camera/gallery preview, and no fake recognition success.

Physical iPhone evidence confirms camera capture, local binary read,
authenticated initiation, private S3 upload, normalization, Textract OCR, E16
parsing, E17 deterministic structured extraction, editable `REVIEW_READY`,
explicit confirmation, `CONFIRMED`, and reviewed-field population of Add
Medicine for the tested packaging sample. This single successful sample does
not establish broad real-world extraction accuracy or clinical validation.
Privacy/legal approval, peer review, and owner acceptance remain pending.

`NO_MATCH` is retained server-side until an explicit decision/cancellation or
expiry policy acts. Logout clears local metadata without silently cancelling the
server result. No automatic TTL object-cleanup worker is claimed. With S3
versioning, deletion can create a delete marker rather than immediate permanent
erasure.
