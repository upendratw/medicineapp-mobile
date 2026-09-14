# E33 Prescription Scan

MED-1323 adds protected prescription camera permission, capture, preview, retake, discard, explicit Continue, processing, pending, and candidate-review UI. The current backend has no prescription upload/OCR contract, so the production service is explicitly pending and performs no upload.

Images remain transient component state, are never logged or stored in AsyncStorage, and are discarded on cancel, retake, or completed review. Future extracted text remains untrusted until the user edits/reviews and explicitly confirms it; it never auto-creates medication data.
