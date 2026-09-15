# iOS risk register

| Risk                                           | Rating | Mitigation/status                                    |
| ---------------------------------------------- | ------ | ---------------------------------------------------- |
| Apple signing/APNs not verified                | High   | Owner-authenticated EAS workflow pending             |
| No simulator/physical execution                | High   | Exact smoke/device/version matrices pending          |
| Health data/token disclosure                   | High   | Keychain, HTTPS, sanitized telemetry/static scans    |
| Notification action causes medication mutation | High   | Route whitelist; actions require in-app confirmation |
| App Store claims/privacy mismatch              | High   | Draft only; legal/clinical/owner review pending      |
| Dependency advisories                          | Medium | Record `npm audit`; no forced unrelated upgrade      |
