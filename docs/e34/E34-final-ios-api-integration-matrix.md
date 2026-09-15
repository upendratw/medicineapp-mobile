# Final iOS API integration matrix

| Area                                                        | State                                                                 |
| ----------------------------------------------------------- | --------------------------------------------------------------------- |
| Auth, identity, medications, schedules, dashboards, history | REAL shared HTTPS client contracts                                    |
| Device push registration/unregistration                     | REAL backend contract; iOS runtime/APNs validation PENDING APPLE/APNs |
| E22 clinical services                                       | REAL backend-mediated contracts; no local translation/inference       |
| OCR/storage/AI capabilities not exposed by current backend  | PENDING BACKEND or UI FOUNDATION ONLY as documented in E33            |
| Messaging/reminder delivery infrastructure                  | PENDING E19                                                           |

No endpoint is invented by E34. The mobile has no direct MySQL, Gemini, OpenSearch, S3, or AWS integration.
