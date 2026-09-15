# APNs and notification entitlements

APNs configuration readiness is COMPLETE: the SDK 57 `expo-notifications` config plugin is present, which is Expo's supported CNG mechanism for the APNs entitlement. A manual `aps-environment` value is intentionally not fabricated. Background remote notifications are not enabled because MedicineApp performs no justified background clinical action.

APNs credential configuration and real APNs delivery validation are PENDING owner-authenticated Apple/EAS configuration and an installed build. Expo Go remains `unsupported_runtime`; installed development/preview builds lazily load the native module, request permission only after explicit action, acquire a token without logging it, and register through the authenticated backend.

For a local free Personal Team build only, set `MEDICINEAPP_IOS_PERSONAL_TEAM_BUILD=true` during clean iOS prebuild. This adds a canonical config modifier that removes the generated APNs entitlement and exposes an `unsupported_personal_team` runtime capability. Normal/EAS configuration is unchanged. This local mode is not APNs validation evidence; see `E34-personal-team-local-iphone-build.md`.
