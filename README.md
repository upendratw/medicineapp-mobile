# MedicineApp Mobile

The E33 mobile foundation includes protected reminder actions, factual medication history, and approved-source side-effect/warning information. Production notification delivery remains pending.

Android-first React Native application for MedicineApp, built with Expo SDK 57, TypeScript, and Expo Router. iOS compatibility is retained.

## Prerequisites

- Node.js 22 LTS and npm
- Android Studio with an Android emulator, or Expo Go where the SDK is supported
- The MedicineApp backend running at a reachable URL

## Setup

```bash
npm install
cp .env.example .env
npm start
```

For the Android emulator, set `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000`. A physical device must use the Mac's LAN address and be on a trusted local network. Staging and production URLs must use HTTPS.

Launch with `npm run android`, `npm run ios`, or scan the development QR code with Expo Go when compatible. No mobile environment variable may contain a secret; all `EXPO_PUBLIC_*` values are embedded in the client bundle.

## Validation

```bash
npm run typecheck
npm run lint
npm test -- --runInBand
npx expo config --type public
```

Authentication tokens are stored only through `expo-secure-store`. AsyncStorage is limited to non-sensitive onboarding/preferences state. The app never connects directly to MySQL, AWS, S3, OpenSearch, or Gemini.

Protected mobile foundations now include patient and caregiver dashboards, medicine-list and manual-entry flows, explicit camera capture, mandatory OCR-candidate confirmation, and backend-aligned daily schedule creation. Patient medicine creation and OCR remain visibly pending where the backend has no corresponding patient API.

MedicineApp supports medication management workflows. It does not diagnose, prescribe, recommend medication changes, alter dosage, or replace a doctor or pharmacist.
