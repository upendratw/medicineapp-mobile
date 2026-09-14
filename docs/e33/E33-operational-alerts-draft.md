# E33 Operational Alerts Draft

Status: **DESIGNED — NOT YET PRODUCTION ACTIVE**

| Alert                      | Proposed signal               | Draft trigger                           | Safety note                |
| -------------------------- | ----------------------------- | --------------------------------------- | -------------------------- |
| Auth failures elevated     | `auth_failure`                | sustained ratio above approved baseline | no phone/user label        |
| API availability degraded  | `api_request_failure`         | sustained failures or timeout increase  | no path/payload label      |
| Push registration degraded | `push_registration_failure`   | sustained failure ratio                 | no push/device token label |
| Secure storage failures    | `secure_storage_failure`      | any sustained nonzero occurrence        | no token/raw error         |
| Crash/error rate           | future approved crash counter | threshold set after baseline            | no health/session content  |

Thresholds, windows, paging policy, owners, runbooks, production metric backend, and clinical escalation are not configured. No alert is active.
