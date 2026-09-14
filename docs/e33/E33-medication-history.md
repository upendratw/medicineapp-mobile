# E33 Medication History

MED-1320 reads the real authenticated, bounded, paginated `/api/v1/intake/history` endpoint. The screen shows factual recorded outcomes for a 30-day window with refresh, loading, empty, and safe failure states. Caregiver patient IDs are accepted only as stable identifiers; backend relationship authorization remains mandatory.

The current backend response omits medication display names and scheduled-time fields, so the UI states that the name is unavailable rather than fabricating it. History is held in memory and is not logged or stored in AsyncStorage.
