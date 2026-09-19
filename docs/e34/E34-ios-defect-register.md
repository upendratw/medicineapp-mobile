# E34 iOS defect register

| ID          | Severity | Defect                                                                                                                                                         | Status                                                                                                                                                                                                     |
| ----------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E34-DEF-001 | High     | Push registration accepted only Android platform/identifier, leaving installed iOS builds unavailable                                                          | Fixed and automated retest passed                                                                                                                                                                          |
| E34-DEF-002 | High     | Restored token presence was treated as authenticated, while protected-request 401 had no refresh or invalidation path                                          | Fixed; automated retest passed; physical retest pending                                                                                                                                                    |
| E34-DEF-003 | High     | Authenticated application exposed no reachable Logout control                                                                                                  | Fixed; automated accessibility/navigation retest passed; physical retest pending                                                                                                                           |
| E34-DEF-004 | Medium   | Manual medicine fields remained populated after confirmed development creation                                                                                 | Fixed; automated positive/negative retest passed; physical retest pending                                                                                                                                  |
| E34-DEF-005 | High     | Camera preview opened on iPhone but capture control was not visible or usable                                                                                  | Fixed in source; automated retest passed; physical retest pending                                                                                                                                          |
| E34-DEF-006 | Medium   | Caregiver-role 403 was presented as a temporary backend outage                                                                                                 | Fixed; automated authorization UX retest passed; physical retest pending                                                                                                                                   |
| E34-DEF-007 | Medium   | Physical E22 query returned 404 and prior evidence did not distinguish route absence from domain identity failure                                              | Investigated; source route verified; deployed error code/OpenAPI evidence pending                                                                                                                          |
| E34-DEF-008 | High     | Medicine image Continue first returned a synthetic candidate; after integration, physical iPhone Continue remained indefinitely busy before backend initiation | Root cause fixed in source: render cleanup was aborting recognition and suppressing state cleanup; bounded file/read/request/upload/polling safeguards and automated retests pass; physical retest pending |

The physical-iPhone failure above is actual execution evidence. Unexecuted simulator/device retests remain evidence gaps, not passing tests.

## E34-DEF-008 physical evidence update

- Physical device: iPhone 16 Personal-Team development build.
- Camera capture: **PASS**.
- Local preview: **PASS**.
- Continue entered processing: **PASS**.
- Backend capture initiation during the observed run: **NOT REACHED**; no
  `/api/v1/medicine-captures` request or database row was observed.
- Root cause: the recognition screen's unmount cleanup effect omitted its empty
  dependency array. Every state-driven render therefore executed cleanup,
  marked the screen unmounted, aborted recognition, suppressed the cancellation
  error, and skipped clearing the busy state.
- Source fix: **COMPLETE**. Cleanup now runs only on actual unmount. Local file
  bytes and each network/lifecycle stage also have bounded cancellation and
  timeout behavior.
- Automated validation: **PASS**.
- Physical iPhone retest: **PENDING**.
