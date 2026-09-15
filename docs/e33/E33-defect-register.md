# MED-1360 Defect Register

The earlier MED-1360 local scope found no defect. Subsequent real Expo Go execution identified the following runtime defect:

| Defect ID      | Source/severity | Description/root cause/fix/test                                                                                                         | Retest/residual risk/status                                            |
| -------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| E33-RUNTIME-01 | Expo Go / High  | Static `expo-notifications` imports caused module initialization failure, secondary Router default-export warnings, and startup failure | Lazy runtime capability adapter; automated and runtime retest required |

Deployment/device prerequisites remain distinct from code defects. Fourteen moderate dependency advisories remain a governance risk.
