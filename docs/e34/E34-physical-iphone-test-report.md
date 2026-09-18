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
