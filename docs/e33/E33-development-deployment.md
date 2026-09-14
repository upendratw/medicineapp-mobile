# MED-1356 Development Deployment

Discovery date: 2026-09-14 (Asia/Kolkata)

Status: **TECHNICAL DEPLOYMENT READINESS: COMPLETE; ACTUAL DEVELOPMENT DEPLOYMENT: PENDING**.

| Item                      | Actual evidence                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| Environment/profile       | `development`; internal Android APK intent in `eas.json`                                        |
| Config source             | EAS profile plus validated `EXPO_PUBLIC_*` runtime configuration                                |
| API base URL              | Not configured in shell/repository; development defaults to loopback for local use only         |
| EAS CLI                   | Global 18.3.0 available and authenticated; repository not linked to an EAS project              |
| Build method              | Local Expo Android JavaScript export only; no native APK build                                  |
| Artifact/build ID         | None                                                                                            |
| Installation target       | None; ADB reported no connected device and no emulator/AVD tooling was found                    |
| Expo Go                   | Insufficient for the complete smoke because SDK 53+ Expo Go does not support push notifications |
| Custom development client | Not installed/configured; required for production-representative native/push validation         |
| Outcome                   | Configuration/static/export readiness validated; no deployment performed                        |

No `eas init`, login, EAS build, credential creation, native prebuild, APK installation, development server/device launch, AWS/EC2 change, or backend request occurred. A future deployment needs approved EAS project linkage or local Android tooling, a non-sensitive development API URL, and an authorized target device/emulator.
