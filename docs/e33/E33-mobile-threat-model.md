# E33 Mobile Threat Model

| Threat / severity                                | Component                         | Mitigation and test                                                      | Residual risk / disposition                                  |
| ------------------------------------------------ | --------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Token theft — High                               | Auth/SecureStore                  | device-only SecureStore, no AsyncStorage/logs; secure-store/auth tests   | Compromised device risk; accepted pending platform hardening |
| Account residue — High                           | logout/switch                     | backend logout/revoke attempt plus unconditional local clear; tests      | Backend revocation availability; monitor                     |
| Link auth bypass/action injection — High         | deep links/push taps              | bounded allowlist, no parameters/actions, RouteGuard; tests              | Future links require review                                  |
| Push disclosure/token leakage — High             | notifications                     | generic private content; token transient/not logged; tests               | E19 delivery/privacy validation pending                      |
| Stale/fabricated offline state — High            | OfflineCache                      | allowlist/TTL/stale/bounds; writes require online; tests                 | Device cache confidentiality review pending                  |
| Image/free-text persistence — High               | camera/prescription/symptom/voice | transient state, no automatic upload/logging; tests                      | Future backend/provider designs require review               |
| OCR trust — High                                 | recognition                       | candidate labeling and mandatory confirmation; tests                     | Clinical OCR validation pending                              |
| Accidental/fake emergency action — Critical      | SOS                               | explicit confirmation, OS dial only, no dispatch claim; tests            | Manual device validation pending                             |
| Cross-patient exposure — Critical                | caregiver                         | relationship-selected stable ID plus backend authorization               | Backend authorization remains critical dependency            |
| Unsafe clinical translation/inference — Critical | E22/interactions/symptoms         | backend evidence and translation flag; pending adapters                  | Clinical validation pending                                  |
| PHI/secret telemetry — High                      | observability                     | closed event/label schema, sanitized code, no raw errors/path/IDs; tests | Production exporter requires separate review                 |
| Dependency exploitation — Medium                 | npm/Expo                          | locked dependencies, Expo compatibility and audit                        | 14 moderate advisories pending governance                    |
| Release misconfiguration — High                  | environment/EAS                   | HTTPS/non-loopback/diagnostics/public-secret guards; tests               | Signed artifact and EAS environment validation pending       |

No formal penetration test, privacy/legal review, or independent security assessment is claimed.
