# E21 Step 12 Task C1 — Android direct-FCM client capability

MedicineApp Android now keeps two provider-scoped registrations for the same
installation: its existing Expo push token and the native FCM token returned by
the supported Expo Notifications `getDevicePushTokenAsync()` boundary. iOS
continues to register only with Expo.

Registration identifiers and tuple fingerprints are stored separately in
SecureStore. Token refresh updates the corresponding provider registration,
and logout attempts to revoke both provider records before clearing all local
registration metadata. Tokens are never logged or placed in navigation data.

The caregiver-only Android channel is
`medicineapp-caregiver-alerts-v1`. It uses high importance, default notification
sound, vibration, public lock-screen visibility, no action category, and
tap-only behavior. It is separate from the frozen E19
`medicineapp-reminders-v4` alarm channel and does not alter Taken, Snooze, or
Skip.

Direct FCM messages remain data-only. Expo Notifications' native Firebase
service constructs the notification and response intent. The native serializer
converts the JSON object carried in `data.body` into the existing bounded
JavaScript payload `{type: "caregiver_alert", schema_version: 1}`. Existing
cold-start response preservation, authentication restoration, RouteGuard,
diagnostics, Patient isolation, and Android Back behavior remain unchanged.

Task C1 automated validation does not install a build, acquire a real token,
submit to FCM/Expo, query receipts, or perform a human notification tap. Those
activities belong to separately authorized Task C2 physical validation.
