# E33 Signing and Credentials Boundary

No keystore, upload key, signing certificate, Play App Signing key, Google service-account credential, EAS token, or Play credential belongs in this repository. None was created in this task.

An authorized release owner must later select and document the EAS/Google Play credential workflow, provision access using least privilege, verify certificate fingerprints through a separate secure channel, establish backup/recovery and personnel controls, and build without exposing credentials in logs or `EXPO_PUBLIC_*` variables. Play App Signing enrollment and upload-key recovery require explicit owner approval.
