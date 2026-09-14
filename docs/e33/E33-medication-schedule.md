# E33 Medication Schedule

MED-1317 aligns with the backend `ScheduleCreate` daily-rule contract: stable medication ID, timezone, start/optional end date, up to eight unique 24-hour daily times, optional user instructions, explicit medication confirmation, and draft/active intent. The service also supports the real list and patch routes for future edit screens.

Validation rejects malformed dates, reverse ranges, invalid/duplicate/excessive times, and repeated submissions. The UI records intended instructions only; it never generates timing, dosage, prescribing, or treatment advice.
