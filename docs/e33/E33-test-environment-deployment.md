# MED-1358 Test Environment Deployment

Status: **TEST DEPLOYMENT CONFIGURATION: READY SUBJECT TO API/TARGET PROVISIONING; ACTUAL TEST DEPLOYMENT: PENDING**.

The `preview` EAS profile selects `EXPO_PUBLIC_APP_ENV=test`, disables diagnostics, requests an internal APK, and contains no secret or production credential. No test API URL is configured, so live integration cannot start. The repository is not linked to an EAS project and no local Android target exists.

| Difference          | Development                                   | Test                                                  |
| ------------------- | --------------------------------------------- | ----------------------------------------------------- |
| Environment         | `development`                                 | `test`                                                |
| Diagnostics         | explicitly enabled for controlled development | disabled                                              |
| Dev fixtures        | possible only with development + diagnostics  | not available                                         |
| Distribution intent | internal APK                                  | internal APK                                          |
| API URL             | absent; local loopback default                | absent; must be explicitly provisioned for deployment |
| Actual deployment   | pending                                       | pending                                               |

Package identity remains `com.medicineapp.mobile`, version `1.0.0`, version code `1`. No build ID, native artifact, installation, remote environment, credentials, or deployment evidence exists.
