# E33 Mobile Android Architecture

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
