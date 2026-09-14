# E33 Android Release Build Preparation

Status: **RELEASE CONFIGURATION READY; SIGNED AAB BUILD: PENDING**

MedicineApp remains version `1.0.0`, package `com.medicineapp.mobile`, and version code `1`. The version code must be incremented for every Play artifact and verified against Play Console before building; the version name changes only through an approved release decision. EAS uses local app-version source so changes remain reviewable in Git.

The production profile selects `EXPO_PUBLIC_APP_ENV=production`, disables diagnostics, and requests an Android App Bundle. The production API URL is intentionally absent from Git and must be supplied through the approved EAS production environment as HTTPS with a non-loopback hostname. Public Expo variables must never contain credentials.

No EAS login, remote build, local native release build, credential provisioning, AAB creation, upload, or submission occurred. The local Expo Android export validates JavaScript bundling only and is not a signed release artifact.
