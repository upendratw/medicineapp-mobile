# E33 Mobile Android Architecture

MED-1334 through MED-1342 validate the existing Expo-managed Android boundary without adding hand-written native compatibility branches. Expo owns OS-specific permission and native component behavior; application code owns explicit permission initiation, safe denial, bounded offline state, transient sensitive state, scalable design primitives, and accessible semantics. The source does not assume a resident process or retain capture, symptom, or voice state across recreation. Device-specific runtime evidence is tracked separately and remains pending where no matching target was available.

MED-1332 adds an in-memory, allowlisted deep-link intent boundary ahead of the existing auth/onboarding route guard. MED-1333 adds Expo Notifications permission/token acquisition, a private generic notification channel, authenticated backend device registration, SecureStore registration metadata, logout revocation, and notification-tap routing through the same deep-link boundary. No notification action directly performs clinical or emergency work.

MED-1328 through MED-1331 add a preferences provider feeding reusable design primitives, typed en-IN/hi-IN UI resources, an injectable network-state boundary with offline/stale banner, a bounded allowlisted AsyncStorage cache, and versioned SecureStore session handling. UI preferences are separate from clinical evidence language, and no offline clinical-write architecture exists.

MED-1325 through MED-1327 preserve the protected UI → typed service boundary. Sensitive symptom/transcript state remains in memory. Only the real authenticated emergency-contact GET route is used. OS dialing is isolated behind a mockable device abstraction and always follows explicit confirmation.

Interaction, prescription, and inventory screens retain the protected UI → typed service → authenticated backend boundary. No device-side interaction engine exists. Prescription images remain transient and are never sent directly to AWS, S3, Gemini, or an OCR provider. Pending services contain no fabricated API paths.

Reminder, intake-history, and E22 evidence screens continue the existing protected UI → typed service → authenticated API client → FastAPI domain-service boundary. The mobile app never calls AWS, Gemini, OpenSearch, S3, or MySQL directly. Reminder responses and medical history stay in memory; E22 evidence is rendered faithfully without local AI augmentation. Backend authorization governs caregiver history.

MED-1304 establishes Expo SDK 57, React Native 0.86, TypeScript strict mode, and Expo Router. Routes live in `src/app`; reusable logic lives under `src`. Android uses `com.medicineapp.mobile`, portrait orientation, the `medicineapp` deep-link scheme, version code 1, and placeholder adaptive/splash assets. Future releases increment Android `versionCode` monotonically for every Play artifact.

The backend HTTP API is the only application backend. Mobile code never accesses MySQL, S3, OpenSearch, Gemini, or AWS credentials. Android is the first delivery target without intentionally breaking iOS.

The MED-1311–1317 flow is:

```text
Mobile UI
  -> typed service layer
  -> authenticated API client
  -> MedicineApp FastAPI
  -> backend domain services
```

OpenAPI-backed services cover medication catalog search, schedules, and E21 caregiver views. Patient-owned medication creation and OCR remain explicit pending adapters. Images and recognition candidates remain transient. OCR always requires user confirmation, caregiver access always requires backend authorization, and schedule entry never recommends timing or dosage.
