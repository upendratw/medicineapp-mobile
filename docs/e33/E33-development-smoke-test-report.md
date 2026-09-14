# MED-1357 Development Smoke Test Report

Status: **AUTOMATED/LOCAL SMOKE: COMPLETE; DEPLOYED DEVELOPMENT SMOKE: PENDING**.

No deployed runtime existed. “Actual” below records automated/static execution only and does not represent UI operation on a device.

| ID/range  | Area                                             | Precondition/method                      | Expected / actual                                   | Result                                         |
| --------- | ------------------------------------------------ | ---------------------------------------- | --------------------------------------------------- | ---------------------------------------------- |
| DEV-01–03 | startup/config/auth screen                       | Jest, Expo config/export                 | bundles and guarded routes validate locally         | PASS — local only                              |
| DEV-04–06 | OTP/session/logout                               | mocked FastAPI contracts and SecureStore | sanitized auth, restore, clear                      | PASS — automated; live backend pending         |
| DEV-07–10 | onboarding/dashboards/medicine list              | component/service tests                  | safe loading/empty/error/data states                | PASS — automated; deployed UI pending          |
| DEV-11–17 | manual add/camera/OCR/schedule/reminders/actions | component/contract tests                 | confirmation, bounds, pending adapters, idempotency | PASS — automated; device/backend scope pending |
| DEV-18–20 | history/E22/interactions                         | contract/rendering tests                 | evidence retained; pending interaction fails safely | PASS — automated; live backend pending         |
| DEV-21–24 | prescription/inventory/symptom/SOS/voice         | high-risk tests                          | unavailable safely; no diagnosis/dispatch/action    | PASS — automated; device/backends pending      |
| DEV-25–27 | accessibility/language/offline                   | component/state tests                    | scalable/semantic/localized/bounded                 | PASS — automated; manual execution pending     |
| DEV-28–30 | secure session/deep links/push UI                | store/link/push tests                    | fail closed, allowlist, generic push                | PASS — automated; native push pending          |

Failures: none in executed local scope. Defect IDs: none. No OTP, device registration, emergency call, SMS, notification delivery, or real API integration was executed.
