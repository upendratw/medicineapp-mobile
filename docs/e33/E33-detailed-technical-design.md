# E33 Detailed Technical Design

## Implemented architecture

```text
Expo / React Native -> Expo Router -> UI/design system -> Context/state
  -> typed service layer -> authenticated API client -> MedicineApp FastAPI
```

FastAPI—not mobile—is the authority that may integrate MySQL, S3, Gemini, OpenSearch, and notification infrastructure. Mobile contains no direct client or credentials for those systems.

SecureStore holds access/refresh tokens and the non-clinical backend push-registration ID. Sensitive health content is server-backed or transient by default. `BoundedOfflineCache` permits only minimal UI/medication/schedule summaries with TTL, stale labeling, item/count/total bounds. AsyncStorage holds non-secret onboarding, language, and accessibility preferences.

Implemented domains include auth, onboarding, patient/caregiver dashboards, medicines, camera and confirmation, schedules/reminders, intake/history, E22 evidence, pending interaction/prescription/inventory/symptom/voice adapters, emergency-contact calling with confirmation, accessibility/localization, offline state, deep links, and push registration.

## Safety and failure boundaries

- OCR candidates remain untrusted until explicit confirmation.
- Interaction and symptom outputs require backend validation; no local clinical inference exists.
- E22 answers retain backend evidence, citations, and `human_translation_required` behavior.
- SOS opens an OS call only after confirmation and never reports dispatch.
- Voice navigation is deterministic; medication/emergency actions require confirmation and prohibited clinical commands remain blocked.
- Offline clinical writes fail and are neither queued nor reported successful.
- Backend/unavailable/401/403/404/429/5xx failures surface sanitized states.
- Corrupt SecureStore fails closed; corrupt/expired cache is removed; denied permissions preserve manual or unavailable paths.
- Malformed deep links route safely to home; stale cached data is explicitly labeled.

Mobile observability is content-free, injected, no-op by default, and has no external exporter. Backend clinical/security audit remains authoritative.
