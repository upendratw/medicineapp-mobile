# Final iOS environment configuration

Development and preview/test use HTTPS `api-medicine.ankala.ai`; staging and production require deployment-supplied HTTPS non-loopback URLs. Diagnostics are development-only. EAS owner/project and bundle identifier are explicit. Public environment values contain no secrets. Development is an installed development client, preview/staging are internal distributions, and production is store distribution. Signing and APNs credentials remain external to Git and PENDING verification.
