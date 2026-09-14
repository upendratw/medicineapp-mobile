# E33 OCR Confirmation

MED-1316 treats recognition as an untrusted candidate. Users can edit the medicine name, strength, and form; inspect bounded confidence/alternatives when provided; reject; retry; use manual entry; or explicitly confirm. No candidate is automatically saved.

The backend currently exposes no patient OCR endpoint. Production uses an explicit pending adapter. A development candidate exists only when both the development environment and diagnostics flag are enabled, and is visibly labeled as a development-only example. Mobile never calls Gemini directly.
