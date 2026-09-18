# E33 Side-effects View

MED-1321 uses the real `POST /api/v1/drug-information/query` E22 endpoint for side-effects/adverse-reactions and warnings. It preserves evidence status, freshness, citations, source authority, source record/version/reference, timestamps, and safety fields.

Human-translation-required responses never silently substitute English evidence. Unavailable evidence remains unavailable. The app does not augment evidence with local AI or convert it into diagnosis, patient-specific risk, medication stop/start advice, or treatment recommendations.

Physical E34 testing observed HTTP 404 from the query. Backend SHA `21b1bd6b360fd7eecefb5863c1069b8d70c02b53` contains and registers this exact path, and its domain contract returns `MEDICATION_NOT_FOUND`/404 when no unique active approved medication resolves. Because the deployed response error code/OpenAPI path was not captured, the observation does not prove either successful deployment or a missing route. The mobile path remains unchanged and no local fallback or fabricated evidence was introduced.
