# E34 physical-iPhone test report

## Environment

- Device: iPhone 16
- Runtime: native MedicineApp development build
- Toolchain reported: Xcode 27
- Signing mode: Personal-Team local build
- Bundle identifier: `com.medicineapp.mobile`
- Backend: `https://api-medicine.ankala.ai`

## Observed pre-fix evidence

| Scenario                                                  | Result                   |
| --------------------------------------------------------- | ------------------------ |
| Native application launch                                 | PASS                     |
| Previously authenticated state restored after force-close | PASS                     |
| Protected schedule request after restore                  | FAIL — HTTP 401          |
| Earlier caregiver protected request                       | FAIL — HTTP 401          |
| Backend health/readiness                                  | PASS — HTTP 200 reported |
| Dashboard retry recovery                                  | FAIL                     |
| Reachable Logout control                                  | FAIL                     |

The evidence supports a client recovery gap after backend rejection of the restored access token. It does not by itself prove the precise JWT rejection reason. Tokens, OTPs, phone numbers, authorization headers, and health data were not captured in this report.

## Required post-fix physical retest

1. Install the Personal-Team native development build and authenticate normally.
2. Confirm a protected dashboard request succeeds, force-close, wait long enough to exercise expiry if practical, and reopen.
3. Confirm a protected 401 causes at most one refresh and the original request then succeeds without displaying the generic dashboard failure.
4. Revoke or otherwise use a controlled invalid test session and confirm the application clears local authentication and returns to Login without a retry loop.
5. From Home, open **Account and session**, invoke **Log out**, confirm the deliberate alert, and verify return to Login.
6. Reopen the application and confirm the logged-out session does not restore.
7. Repeat the Logout control with VoiceOver and Hindi enabled.
8. Confirm Personal-Team push remains explicitly unavailable and that no push token request occurs.

Post-fix physical result: **PENDING**. Do not mark this report passed until the steps above are executed and recorded by a human tester.

## Batch 2 physical evidence

Confirmed PASS on the iPhone 16 Personal-Team build:

- native launch;
- OTP request and verification;
- access-token 401 followed by refresh 200 and successful protected-request retry;
- authenticated medication-schedule retrieval;
- backend logout;
- manual medicine creation through the current Development adapter;
- camera permission and preview opening;
- medication history;
- emergency-contact retrieval.

Confirmed FAIL before Batch 2 implementation:

- manual form retained all values after confirmed creation (`E34-DEF-004`);
- camera preview exposed no visible/usable capture control (`E34-DEF-005`).

OCR confirmation was blocked by E34-DEF-005. The caregiver patient-list endpoint returned 403 for the authenticated account, which is consistent with its caregiver-role contract but was presented with incorrect temporary-outage copy (`E34-DEF-006`). The E22 query returned 404; source investigation is recorded as E34-DEF-007.

Batch 2 post-fix physical retest remains **PENDING**. Automated success is not physical-device evidence.

### Batch 2 physical retest

1. Reload the Batch 2 JavaScript bundle in the existing Personal-Team development build.
2. Manually enter all medicine fields and save successfully; confirm every field resets, success is announced, and another tap cannot duplicate the prior record.
3. Trigger validation, offline/network, and controlled backend failure paths where available; confirm entered fields remain.
4. Open Scan Medicine Packaging; confirm the text-labelled **Take photo** control remains above the home indicator and is usable with VoiceOver.
5. Double-tap capture rapidly; confirm only one photo is produced and the control is disabled during capture.
6. Confirm capture failure reveals only sanitized retry copy.
7. Capture, inspect Preview, Retake, capture again, and explicitly Continue to OCR review. Confirm no automatic upload or automatic medicine confirmation.
8. Open caregiver dashboard from a patient account; confirm neutral access-unavailable copy and return to patient Home. Confirm a caregiver account with no relationships receives the legitimate empty state.
9. Query E22 with a known active approved backend medication. Record only the sanitized API error code/status and whether deployed OpenAPI contains `/api/v1/drug-information/query`; do not record medication content or credentials.
10. Reconfirm the previously passing 401 → refresh 200 → retry 200 and Logout flows.
