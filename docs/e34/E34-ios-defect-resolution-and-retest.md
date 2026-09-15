# E34 defect resolution and retest

E34-DEF-001 root cause was an Android-only platform type, identifier lookup, and backend payload in the shared registration adapter. The fix introduces bounded `android | ios`, uses Expo Application's iOS vendor identifier for installed iOS runtimes, and sends the actual platform through the existing authenticated backend service. Expo Go still exits before permission/token/backend calls. Focused coordinator/config tests passed. Residual risk: APNs and physical installed-build execution remain PENDING.
