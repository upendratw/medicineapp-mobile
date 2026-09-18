# iOS development smoke-test report

## Physical-iPhone evidence received

An iPhone 16 running a native Personal-Team development build was tested against `https://api-medicine.ankala.ai` with Xcode 27. Native launch passed and a previously authenticated session was restored after force-close. The restored access token was rejected by protected endpoints with HTTP 401, dashboard recovery failed, and no Logout control was reachable. Backend `/health` and `/ready` remained HTTP 200. No credential or health-data value is recorded here.

| Check                                         | Before fix | After implementation                    |
| --------------------------------------------- | ---------- | --------------------------------------- |
| Native launch                                 | PASS       | Physical retest PENDING                 |
| Session restored after force-close            | PASS       | Physical retest PENDING                 |
| Restored session accepted or safely refreshed | FAIL       | Automated PASS; physical retest PENDING |
| Dashboard recovery after access-token 401     | FAIL       | Automated PASS; physical retest PENDING |
| Reachable Logout                              | FAIL       | Automated PASS; physical retest PENDING |

Login/OTP, onboarding, camera, reminder/history, E22, accessibility, Hindi, offline/reconnect, deep-link, and wider device-matrix execution remain pending unless separately evidenced. Expo Go remote push is not applicable by its supported-runtime boundary. The Personal-Team build intentionally excludes push capability.
