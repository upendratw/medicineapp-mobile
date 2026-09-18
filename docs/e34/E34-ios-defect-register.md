# E34 iOS defect register

| ID          | Severity | Defect                                                                                                                | Status                                                                           |
| ----------- | -------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| E34-DEF-001 | High     | Push registration accepted only Android platform/identifier, leaving installed iOS builds unavailable                 | Fixed and automated retest passed                                                |
| E34-DEF-002 | High     | Restored token presence was treated as authenticated, while protected-request 401 had no refresh or invalidation path | Fixed; automated retest passed; physical retest pending                          |
| E34-DEF-003 | High     | Authenticated application exposed no reachable Logout control                                                         | Fixed; automated accessibility/navigation retest passed; physical retest pending |

The physical-iPhone failure above is actual execution evidence. Unexecuted simulator/device retests remain evidence gaps, not passing tests.
