# E33 Intake Actions

MED-1319 uses the real authenticated reminder APIs: `POST /api/v1/reminders/{reminder_id}/acknowledge` for user-reported Taken/Skipped outcomes and `POST /api/v1/reminders/{reminder_id}/snooze` for notification postponement. Client event/request IDs support idempotency, and a synchronous guard prevents duplicate submissions.

Snooze changes only reminder state. These controls never change schedules, medication, dose, or prescribed instructions.
