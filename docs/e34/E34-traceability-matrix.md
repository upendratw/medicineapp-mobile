# E34 traceability matrix

| Tasks         | Evidence                                                               | Status                                                            |
| ------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
| MED-1364–1367 | app config, EAS profiles, identity/signing/APNs/environment docs/tests | Configuration complete; Apple/APNs pending                        |
| MED-1368–1378 | shared auth/onboarding/dashboard/camera/push/storage/deep-link suites  | Automated readiness complete; iOS device pending                  |
| MED-1379–1391 | accessibility/resilience/permission/safety suites and matrices         | Static/automated complete; runtime/APNs pending                   |
| MED-1392–1397 | App Store drafts, signing/release configuration                        | Draft/configuration complete; builds/submission/approvals pending |
| MED-1398–1407 | requirements/design/security/test/review documents and regression      | Technical documentation/review complete; human review pending     |
| MED-1408–1412 | deployment/smoke/regression/defect evidence                            | Config/automation complete; physical execution pending            |
| MED-1413–1415 | final architecture/runbooks/acceptance package                         | Package complete; owner acceptance pending                        |

-

+## Per-task acceptance record +
+| Task | Description | Technical status | Automated evidence | Simulator evidence | Physical-iPhone evidence | External dependency | Acceptance state |
+|---|---|---|---|---|---|---|---|
+| MED-1364 | Bundle identifier | Technically complete | Tests/docs | PENDING | PENDING | None for technical scope | Engineering evidence ready |
| MED-1365 | Apple certificates | Technically complete | Document/config evidence | PENDING | PENDING | Apple/device/owner | Engineering evidence ready |
| MED-1366 | APNs entitlement | Technically complete | Tests/docs | PENDING | PENDING | Apple/device/owner | Engineering evidence ready |
| MED-1367 | Environment management | Technically complete | Tests/docs | PENDING | PENDING | None for technical scope | Engineering evidence ready |
| MED-1368 | Authentication | Technically complete | Tests/docs | PENDING | PENDING | None for technical scope | Engineering evidence ready |
| MED-1369 | Onboarding | Technically complete | Tests/docs | PENDING | PENDING | None for technical scope | Engineering evidence ready |
| MED-1370 | Patient dashboard | Technically complete | Tests/docs | PENDING | PENDING | None for technical scope | Engineering evidence ready |
| MED-1371 | Caregiver dashboard | Technically complete | Tests/docs | PENDING | PENDING | None for technical scope | Engineering evidence ready |
| MED-1372 | Camera permission | Technically complete | Tests/docs | PENDING | PENDING | None for technical scope | Engineering evidence ready |
| MED-1373 | Photo-library minimization | Technically complete | Tests/docs | PENDING | PENDING | None for technical scope | Engineering evidence ready |
| MED-1374 | Notification permission UX | Technically complete | Tests/docs | PENDING | PENDING | None for technical scope | Engineering evidence ready |
| MED-1375 | Medication alert UX | Technically complete | Tests/docs | PENDING | PENDING | None for technical scope | Engineering evidence ready |
| MED-1376 | Background notification safety | Technically complete | Tests/docs | PENDING | PENDING | None for technical scope | Engineering evidence ready |
| MED-1377 | Keychain storage | Technically complete | Tests/docs | PENDING | PENDING | None for technical scope | Engineering evidence ready |
| MED-1378 | Deep links | Technically complete | Tests/docs | PENDING | PENDING | None for technical scope | Engineering evidence ready |
| MED-1379 | VoiceOver | Static/config complete | Tests/docs | PENDING | PENDING | Xcode/device | Engineering evidence ready |
| MED-1380 | Dynamic Type | Static/config complete | Tests/docs | PENDING | PENDING | Xcode/device | Engineering evidence ready |
| MED-1381 | Reduce Motion | Static/config complete | Tests/docs | PENDING | PENDING | Xcode/device | Engineering evidence ready |
| MED-1382 | Small iPhone | Static/config complete | Tests/docs | PENDING | PENDING | Xcode/device | Engineering evidence ready |
| MED-1383 | Standard iPhone | Static/config complete | Tests/docs | PENDING | PENDING | Xcode/device | Engineering evidence ready |
| MED-1384 | Large iPhone | Static/config complete | Tests/docs | PENDING | PENDING | Xcode/device | Engineering evidence ready |
| MED-1385 | iOS 17 | Static/config complete | Tests/docs | PENDING | PENDING | Xcode/device | Engineering evidence ready |
| MED-1386 | iOS 18 | Static/config complete | Tests/docs | PENDING | PENDING | Xcode/device | Engineering evidence ready |
| MED-1387 | iOS 19+ | Static/config complete | Tests/docs | PENDING | PENDING | Xcode/device | Engineering evidence ready |
| MED-1388 | Low Power Mode | Static/config complete | Tests/docs | PENDING | PENDING | Xcode/device | Engineering evidence ready |
| MED-1389 | Denied camera | Technically complete | Tests/docs | PENDING | PENDING | None for technical scope | Engineering evidence ready |
| MED-1390 | Denied notifications | Technically complete | Tests/docs | PENDING | PENDING | None for technical scope | Engineering evidence ready |
| MED-1391 | Terminated-app reminders | Static/config complete | Tests/docs | PENDING | PENDING | Apple/device/owner | Engineering evidence ready |
| MED-1392 | App Store screenshots | Technically complete | Document/config evidence | PENDING | PENDING | Apple/device/owner | Engineering evidence ready |
| MED-1393 | App Privacy details | Technically complete | Document/config evidence | PENDING | PENDING | Apple/device/owner | Engineering evidence ready |
| MED-1394 | Age rating | Technically complete | Document/config evidence | PENDING | PENDING | Apple/device/owner | Engineering evidence ready |
| MED-1395 | Medical disclaimer | Technically complete | Tests/docs | PENDING | PENDING | None for technical scope | Engineering evidence ready |
| MED-1396 | TestFlight build | Technically complete | Document/config evidence | PENDING | PENDING | Apple/device/owner | Engineering evidence ready |
| MED-1397 | Release build | Technically complete | Document/config evidence | PENDING | PENDING | Apple/device/owner | Engineering evidence ready |
| MED-1398 | Requirements review | Technically complete | Tests/docs | PENDING | PENDING | None for technical scope | Engineering evidence ready |
| MED-1399 | Technical design | Technically complete | Tests/docs | PENDING | PENDING | None for technical scope | Engineering evidence ready |
| MED-1400 | Data/config design | Technically complete | Tests/docs | PENDING | PENDING | None for technical scope | Engineering evidence ready |
| MED-1401 | Security/privacy review | Technically complete | Tests/docs | PENDING | PENDING | None for technical scope | Engineering evidence ready |
| MED-1402 | Unit/integration plan | Technically complete | Tests/docs | PENDING | PENDING | None for technical scope | Engineering evidence ready |
| MED-1403 | Feature/config changes | Technically complete | Tests/docs | PENDING | PENDING | None for technical scope | Engineering evidence ready |
| MED-1404 | Logging/audit | Technically complete | Tests/docs | PENDING | PENDING | None for technical scope | Engineering evidence ready |
| MED-1405 | Metrics/alerts | Technically complete | Tests/docs | PENDING | PENDING | None for technical scope | Engineering evidence ready |
| MED-1406 | Failure tests | Technically complete | Tests/docs | PENDING | PENDING | None for technical scope | Engineering evidence ready |
| MED-1407 | Engineering review | Technically complete | Tests/docs | PENDING | PENDING | None for technical scope | Engineering evidence ready |
| MED-1408 | Development deployment | Static/config complete | Tests/docs | PENDING | PENDING | Apple/device/owner | Engineering evidence ready |
| MED-1409 | Development smoke | Static/config complete | Tests/docs | PENDING | PENDING | Apple/device/owner | Engineering evidence ready |
| MED-1410 | Test deployment | Static/config complete | Tests/docs | PENDING | PENDING | Apple/device/owner | Engineering evidence ready |
| MED-1411 | Regression | Technically complete | Tests/docs | PENDING | PENDING | None for technical scope | Engineering evidence ready |
| MED-1412 | Defect/retest | Technically complete | Tests/docs | PENDING | PENDING | None for technical scope | Engineering evidence ready |
| MED-1413 | Final architecture docs | Technically complete | Tests/docs | PENDING | PENDING | None for technical scope | Engineering evidence ready |
| MED-1414 | Operations/support | Technically complete | Tests/docs | PENDING | PENDING | None for technical scope | Engineering evidence ready |
| MED-1415 | Owner acceptance package | Package complete | Tests/docs | PENDING | PENDING | None for technical scope | OWNER PENDING |
