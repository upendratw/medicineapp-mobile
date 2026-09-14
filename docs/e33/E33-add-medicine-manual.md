# E33 Manual Medicine Entry

MED-1314 collects a bounded medicine name, optional strength/form, and optional notes. Values are trimmed, duplicate presses are blocked while submitting, and errors are sanitized. The form repeatedly labels the result as user-entered and not clinically reviewed.

The existing `/clinical-data/medications` create API is restricted to clinical administrators and is intentionally not used for patients. Patient creation remains an explicit pending adapter outside development; no production endpoint is invented.
