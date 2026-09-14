# E33 Operational Support Runbook

Status: **MED-1362 TECHNICALLY COMPLETE — operational validation remains environment dependent**.

## Application identity and setup

- App: MedicineApp
- Android package: `com.medicineapp.mobile`
- Repository: `/Users/upendra/Downloads/MedicalApp/medicineapp-mobile`
- Runtime: Expo SDK 57, React Native 0.86.3, React 19.2.3
- Environments: development, test, staging, production

Use a Node release meeting the Expo SDK 57 requirement and the repository lockfile's npm. From the repository root:

```text
npm install
cp .env.example .env              # ignored local file; insert no secrets
npm start
npm run android
npm run typecheck
npm run lint
npm test -- --runInBand
npm run format:check
npx expo install --check
npm run release:check
npx expo config --type public
npx expo export --platform android --output-dir /tmp/medicineapp-android-export --clear
```

Set a reachable `EXPO_PUBLIC_API_BASE_URL`. Android Emulator commonly uses `http://10.0.2.2:8000` for a backend on the host; physical devices require an explicitly reachable address. Never put credentials in `EXPO_PUBLIC_*` variables.

## Environment operations

| Environment | Source                                        | API URL                                | Diagnostics | Deployment / gaps                                                 |
| ----------- | --------------------------------------------- | -------------------------------------- | ----------- | ----------------------------------------------------------------- |
| Development | ignored `.env` or EAS development environment | Required for remote/device integration | Allowed     | Deployment, device smoke, and EAS linkage pending                 |
| Test        | EAS preview/test environment                  | Required                               | Off         | Deployment and live regression pending                            |
| Staging     | EAS preview environment                       | HTTPS, non-loopback                    | Off         | Profile only; approvals and validation pending                    |
| Production  | EAS production environment                    | HTTPS, non-loopback                    | Off         | Signing, AAB, Play, legal, clinical, and release approval pending |

## Failure handling

| Problem                    | Safe expected behavior / first check                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Backend unavailable        | Show a sanitized unavailable/retry state; never fake success; verify configured URL and backend health outside the app |
| OTP failure                | Keep unauthenticated, show bounded error, permit retry; never expose OTP/token details                                 |
| Expired/invalid session    | Fail closed and return to authentication; current automatic token refresh is not implemented                           |
| SecureStore failure        | Do not authenticate; clear invalid partial values and report a content-free storage failure                            |
| Offline or stale cache     | Approved cached summaries are read-only and labeled stale; clinical writes are rejected and never queued               |
| Push permission denied     | App remains usable; explain how the user can revisit settings without repeated coercive prompts                        |
| Push registration failure  | Show unavailable/retry state; never log or persist the push token; E19 delivery remains pending                        |
| Deep link rejected         | Navigate safely to home or remain guarded; execute no action                                                           |
| Camera permission denied   | Explain permission and retain manual entry fallback                                                                    |
| OCR unavailable            | Keep image/candidate transient and offer manual entry; never silently confirm recognition                              |
| Interaction unavailable    | Display explicit unavailable state; perform no local interaction inference                                             |
| Prescription unavailable   | Display pending/unavailable state; do not upload directly to a provider                                                |
| Inventory unavailable      | Display unavailable state; do not claim quantity/refill changes                                                        |
| Symptom unavailable        | Provide no local diagnosis/triage; direct the user to appropriate professional or emergency help wording               |
| Voice/STT unavailable      | Retain manual controls; do not fabricate transcript or action                                                          |
| E22 evidence unavailable   | Show evidence unavailable; provide no generated substitute                                                             |
| Human translation required | Preserve the backend flag and source language; do not locally translate clinical evidence                              |
| SOS path                   | Never claim dispatch; show options and require confirmation before opening the dialer                                  |

## Logging and telemetry

Allowed records contain only predefined event, category, outcome, bounded error code, counter name, and duration bucket. Never record PHI/PII, identifiers, tokens, push tokens, API bodies, medication or caregiver content, symptoms, OCR/prescription content, transcripts/audio, or clinical evidence. No third-party analytics exporter is configured.

## Incident response

| Severity | Examples                                                                                                       | Initial action and escalation                                                                                                                                                                                                                  |
| -------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEV-1    | Patient-safety risk, auth bypass, sensitive exposure, unsafe medication action, false SOS-dispatch indication  | Halt promotion/use of affected path; preserve minimal privacy-safe evidence; notify Engineering, Product, Privacy/Security, Clinical Safety, and Operations Owners as relevant; consider rollback/disable only through real supported controls |
| SEV-2    | Core medication/reminder unavailable, widespread auth failure, incorrect/unexpectedly unavailable E22 evidence | Contain impact, verify environment/backend status, preserve sanitized evidence, escalate to Engineering/Product/Operations and Clinical Safety when evidence is affected; halt promotion                                                       |
| SEV-3    | Degraded non-critical feature, localization/accessibility regression, push registration degradation            | Record reproducible non-sensitive facts, provide safe fallback, prioritize owner review before promotion                                                                                                                                       |
| SEV-4    | Cosmetic/non-functional issue                                                                                  | Record and schedule normally unless accessibility or safety impact raises severity                                                                                                                                                             |

Evidence must use synthetic accounts/content where possible and exclude secrets and health content. Do not silently correct safety incidents: preserve traceability and document remediation/retest.

Security incidents include token exposure, unauthorized access, push-token misassociation, malicious deep links, sensitive logging, and lost/stolen devices. Revoke/clear affected sessions where supported, stop exposure, preserve minimal evidence, and escalate to Privacy/Security Owner. Never print credentials during diagnosis.

Clinical-safety incidents include unsafe recommendations, wrong medication context/citation, OCR misidentification, interaction misinformation, reminder misrecording, and misleading SOS status. Disable or halt the unsafe path where a real control exists, preserve evidence safely, and escalate to Clinical Safety, Product, Engineering, and Security owners. Do not make unreviewed clinical corrections.

## Rollback and promotion

Halt promotion first. Revert the affected mobile release/configuration through the authorized release process, or disable the capability only when an actual supported control exists. A backend feature flag may be used only if that flag genuinely exists and its owner approves it; none is invented here. Revalidate the prior artifact and backend compatibility before resuming promotion.

Use `E33-support-checklist.md` for triage and `E33-known-limitations.md` before communicating status.
