# E33 Side-effects View

MED-1321 uses the real `POST /api/v1/drug-information/query` E22 endpoint for side-effects/adverse-reactions and warnings. It preserves evidence status, freshness, citations, source authority, source record/version/reference, timestamps, and safety fields.

Human-translation-required responses never silently substitute English evidence. Unavailable evidence remains unavailable. The app does not augment evidence with local AI or convert it into diagnosis, patient-specific risk, medication stop/start advice, or treatment recommendations.
