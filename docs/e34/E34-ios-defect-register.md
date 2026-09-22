# E34 iOS defect register

| ID          | Severity | Defect                                                                                                                | Status                                                                            |
| ----------- | -------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| E34-DEF-001 | High     | Push registration accepted only Android platform/identifier, leaving installed iOS builds unavailable                 | Fixed and automated retest passed                                                 |
| E34-DEF-002 | High     | Restored token presence was treated as authenticated, while protected-request 401 had no refresh or invalidation path | Fixed; automated retest passed; physical retest pending                           |
| E34-DEF-003 | High     | Authenticated application exposed no reachable Logout control                                                         | Fixed; automated accessibility/navigation retest passed; physical retest pending  |
| E34-DEF-004 | Medium   | Manual medicine fields remained populated after confirmed development creation                                        | Fixed; automated positive/negative retest passed; physical retest pending         |
| E34-DEF-005 | High     | Camera preview opened on iPhone but capture control was not visible or usable                                         | Fixed in source; automated retest passed; physical retest pending                 |
| E34-DEF-006 | Medium   | Caregiver-role 403 was presented as a temporary backend outage                                                        | Fixed; automated authorization UX retest passed; physical retest pending          |
| E34-DEF-007 | Medium   | Physical E22 query returned 404 and prior evidence did not distinguish route absence from domain identity failure     | Investigated; source route verified; deployed error code/OpenAPI evidence pending |
| E34-DEF-008 | High     | Physical OCR integration exposed spinner, React Native binary-body, and valid no-match lifecycle/UX defects           | Fixed; automated validation and physical review-ready confirmation retest passed  |

The physical-iPhone failure above is actual execution evidence. Unexecuted simulator/device retests remain evidence gaps, not passing tests.

## E34-DEF-008 physical evidence update

- Physical device: iPhone 16 Personal-Team development build.
- Camera capture: **PASS**.
- Local preview: **PASS**.
- Continue entered processing: **PASS**.
- First source root cause: the recognition screen's unmount cleanup effect omitted its empty
  dependency array. Every state-driven render therefore executed cleanup,
  marked the screen unmounted, aborted recognition, suppressed the cancellation
  error, and skipped clearing the busy state.
- Spinner source fix: **COMPLETE AND PHYSICALLY RETESTED**. Processing now
  terminates and presents safe retry/manual-entry guidance.
- Latest physical evidence reached authenticated initiation, private S3 upload,
  normalization, Textract OCR, E16 parsing, deterministic E17 structured
  extraction, editable `REVIEW_READY`, explicit confirmation, `CONFIRMED`, and
  Add Medicine field population.
- Second source root cause: installed React Native rejects `Uint8Array` and
  `ArrayBufferView` parts in its `Blob` constructor. The prior
  `new Blob([bytes])` therefore failed after `File.bytes()` but before capture
  initiation; DOM TypeScript declarations did not expose this native-runtime
  restriction.
- Current source fix: **COMPLETE; AUTOMATED VALIDATION PASS**. Upload preparation
  retains `File.bytes()` output as a bounded `Uint8Array`, and Expo's installed
  fetch implementation accepts that binary view directly. Development-only
  diagnostics expose bounded stage identifiers and sanitized failure codes.
- E15 returned `NO_MATCH`/`NO_SAFE_CANDIDATE`, correctly reflecting insufficient
  eligible Development catalog coverage. The old mobile path converted this
  valid outcome into a generic failure and called `/cancel`; the capture became
  `CANCELLED`, object cleanup was scheduled, and same-key replay returned 409.
- Source remediation models no-match/retake/failed-safe separately, does not
  auto-cancel no-match, and provides English/Hindi accessible explicit actions.
- Review-ready confirmation for the tested packaging sample: **PASS**. This is
  not evidence of broad real-world extraction accuracy or clinical validation.
- No-match UX/retention automated validation: **PASS**.
- E34-DEF-008 physical retest: **PASS; CLOSED FOR THE TESTED FLOW**.
