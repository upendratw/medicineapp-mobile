# E33 Backend Integration Status

MED-1322 through MED-1324 have no current backend endpoints. Interaction checking, prescription OCR/upload, and inventory/refill therefore use explicit pending adapters. See `E33-clinical-feature-integration-status.md`.

MED-1318 through MED-1321 add real reminder acknowledgement, snooze, intake-history, and E22 drug-information integrations. Production notification delivery/context remains pending E19. See `E33-E18-E19-E20-integration-status.md` for the dependency matrix.

| Mobile capability                  | Backend status | Integration                                               |
| ---------------------------------- | -------------- | --------------------------------------------------------- |
| Medication catalog search/details  | Available      | Real `/api/v1/medications` contracts                      |
| Drug information                   | Available      | Real catalog entry point; detailed category UI deferred   |
| Medication schedules               | Available      | Real `/api/v1/medication-schedules` contracts             |
| Caregiver selector/dashboard       | Available      | Real E21 relationship-authorized contracts                |
| Patient-owned medicine list/create | Not available  | Explicit pending adapter; development memory only         |
| Patient dashboard aggregate        | Not available  | Composed typed service with truthful unavailable fields   |
| Medicine OCR/recognition           | Not available  | Explicit pending adapter; opt-in development fixture only |

The mobile application never calls AWS, S3, Gemini, OpenSearch, or MySQL. All production data and authorization remain backend responsibilities. Missing APIs are not represented by fabricated HTTP routes.
