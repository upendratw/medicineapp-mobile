# E33 Android Release Readiness Checklist

## Technical preparation

- [x] Package ID and current version recorded
- [x] Development, preview, staging, and production profiles defined without secrets
- [x] Production selects AAB, HTTPS/non-loopback backend, and diagnostics off
- [x] Static release configuration, tests, lint, formatting, and Android export validated
- [x] Generic notification wording and backend-only service boundary retained

## Required before any Play submission

- [ ] Final graphics and synthetic-data device screenshots
- [ ] Public privacy-policy URL and approved support contact
- [ ] Privacy/legal approval of Data Safety and Health apps declarations
- [ ] IARC content rating, target audience, app access, and policy review
- [ ] Production backend URL provisioned securely and validated
- [ ] Signing credentials and Play App Signing approved/provisioned
- [ ] Signed AAB built, scanned, installed through an authorized test track, and tested
- [ ] Android 10–15, memory-pressure, system-font, and TalkBack execution gaps closed
- [ ] E19 production push delivery and notification behavior validated
- [ ] Clinical/regulatory validation and release approval

Production readiness is not established. Google Play upload/submission remains pending.
