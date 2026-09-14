# MED-1336 — Android 12 Validation

Static and automated checks cover startup configuration, exact `medicineapp` scheme, camera and SecureStore abstractions, accessibility semantics, and Expo-managed notification/deep-link behavior. No hand-written exported-component or PendingIntent workaround was introduced; these native requirements remain owned by the current Expo toolchain.

**Not executed on a matching Android 12 emulator/device.**

Status: **TECHNICAL PREPARATION: COMPLETE; EXECUTION VALIDATION: PENDING**. Generated-native and runtime deep-link smoke remain pending.
