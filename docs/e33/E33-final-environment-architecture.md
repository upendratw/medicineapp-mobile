# E33 Final Environment Architecture

Configuration is validated by `src/config/environment.ts`; EAS profile intent is defined by `eas.json`. Neither constitutes deployment evidence.

| Environment | Configuration source                                       | API requirement                                        | Diagnostics    | Artifact intent | Actual state                                                              |
| ----------- | ---------------------------------------------------------- | ------------------------------------------------------ | -------------- | --------------- | ------------------------------------------------------------------------- |
| Development | local ignored environment or EAS `development` environment | Explicit reachable URL; loopback default is local-only | May be enabled | Internal APK    | Local config/export validated; deployment and device smoke pending        |
| Test        | EAS `preview` profile/environment provisioning             | Explicit test API URL                                  | Disabled       | Internal APK    | Config intent exists; deployment and live regression pending              |
| Staging     | EAS `staging` profile/environment provisioning             | HTTPS, non-loopback                                    | Disabled       | Internal APK    | Profile design only; not deployed                                         |
| Production  | EAS `production` environment provisioning                  | HTTPS, non-loopback                                    | Disabled       | Android AAB     | Not deployed; signing, validation, approvals, and Play submission pending |

All `EXPO_PUBLIC_*` values are bundled and therefore non-secret. Secret-like public variable names are rejected. Request timeout is bounded to 1–30 seconds. Protected environments reject HTTP, loopback URLs, and developer diagnostics.

Current blockers include absent EAS project linkage, environment API URLs, build/deployment targets, device/emulator evidence, signing credentials, signed artifact validation, and release approvals. No Development, Test, Staging, or Production promotion is claimed.
