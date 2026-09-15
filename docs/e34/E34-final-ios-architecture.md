# Final iOS architecture

MedicineApp remains one Expo/React Native application shared by Android and iOS. iOS native boundaries are Expo Camera, SecureStore/Keychain, Linking, and lazily loaded Notifications/APNs. They feed shared components, state, safety guards, and services, which communicate only through the authenticated HTTPS API at `api-medicine.ankala.ai` for current development/test.

The iOS app NEVER directly accesses MySQL, Gemini, OpenSearch, S3, or AWS credentials. Those are backend-only. No parallel iOS auth, dashboard, medication, E22, cache, localization, or accessibility implementation exists.
