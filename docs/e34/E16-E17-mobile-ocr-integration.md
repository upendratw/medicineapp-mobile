# E16/E17 mobile OCR integration

**Status: LOCAL IMPLEMENTATION COMPLETE — live infrastructure, physical-device,
clinical, privacy/legal, peer-review, and owner-acceptance evidence remains pending.**

## Purpose

The scan workflow now uses the authenticated backend capture lifecycle instead
of the Development fixture. OCR and recognition remain suggestions. The user
must review and explicitly confirm, reject, choose none-of-these, retry, or
continue with manual entry.

## User flow

1. Take a photo or choose a JPEG/PNG from the system photo library.
2. Review the local preview. Nothing is uploaded before **Continue**.
3. Continue initiates an authenticated owner-bound capture.
4. The app uploads to the short-lived server-issued URL with the exact required
   headers; it has no AWS credential and cannot choose a bucket or object key.
5. The app completes the upload and polls the bounded capture state.
6. A backend E15 candidate is displayed with uncertainty guidance.
7. An explicit decision is sent to the backend before navigation continues.

The app never treats OCR text as an active medication, schedule, prescription,
or dose. Edited fields are user-reviewed manual input and never mutate the E15
canonical catalog.

## Failure and privacy behavior

- Unsupported type, unreadable/low-quality image, no match, timeout, and safe
  provider failure do not fabricate a candidate.
- A failed PUT requests best-effort backend cancellation/cleanup.
- Camera denial still permits gallery selection and manual entry.
- Photo-library selection uses the Expo SDK 57 ImagePicker system UI with a
  bounded privacy permission string.
- Tokens, presigned URLs, OCR text, images, and medication content are not
  logged by the service.
- Capture state is transient in React context; logout/global application data
  clearing continues to remove local capture metadata through existing flows.

## Validation boundary

Unit tests use synthetic URIs, blobs, candidates, and mocked HTTP. They prove
explicit upload timing, required headers, backend-mediated decisions, safe
failed upload behavior, camera/gallery preview, and no fake recognition success.

Physical-device end-to-end execution against deployed S3/Textract remains
pending. Automated validation does not establish live AWS, OCR accuracy,
clinical validation, privacy/legal approval, peer review, EC2 deployment, or
owner acceptance. The dedicated E16 S3 bucket and IAM permissions are not yet
provisioned, and no EC2 migration has been executed.
