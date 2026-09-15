# APNs and notification entitlements

APNs configuration readiness is COMPLETE: the SDK 57 `expo-notifications` config plugin is present, which is Expo's supported CNG mechanism for the APNs entitlement. A manual `aps-environment` value is intentionally not fabricated. Background remote notifications are not enabled because MedicineApp performs no justified background clinical action.

APNs credential configuration and real APNs delivery validation are PENDING owner-authenticated Apple/EAS configuration and an installed build. Expo Go remains `unsupported_runtime`; installed development/preview builds lazily load the native module, request permission only after explicit action, acquire a token without logging it, and register through the authenticated backend.
