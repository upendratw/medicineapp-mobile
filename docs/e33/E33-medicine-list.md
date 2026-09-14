# E33 Medicine List

MED-1313 adds loading, failure, empty, refresh, add, and schedule actions plus reusable medication cards. Cards identify user-entered records as not clinically reviewed and distinguish backend catalog review status.

The backend provides medication catalog search/details but not a patient-owned medication list. Production therefore returns a truthful integration-pending empty state; development may retain user entries in memory for the current process only.
