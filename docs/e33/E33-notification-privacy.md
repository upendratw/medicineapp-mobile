# E33 Notification Privacy

Reminder lock-screen copy is limited to the generic title “Medicine reminder”
and “It's time for your scheduled medicine.” The provider payload contains only
the bounded notification type/schema and opaque reminder identifier. Patient
or caregiver name, medicine label, dose, diagnosis, symptom, instructions,
inventory, adherence information, arbitrary notes, prescription details, and
clinical evidence remain excluded. Richer detail is retrieved only after
opening the authenticated application.

Notification data is untrusted and passes through the same bounded reminder
schema, authentication, onboarding, and authorization gates. The direct Taken,
Snooze, and Skip actions use the existing backend reminder APIs; no action is
accepted locally as successful. Notifications cannot trigger SOS and remain
supplementary rather than a clinical-safety dependency.

Android uses the versioned `medicineapp-reminders-v4` runtime channel with MAX
importance, the bundled `medicine_reminder_alarm.wav` sound, vibration, private
lock-screen visibility, and no DND bypass. The operating system and user-selected
device settings remain authoritative; MedicineApp does not claim that every OS
configuration hides content. The sound is an original,
programmatically synthesized MedicineApp asset containing no third-party
sample; it is covered by the repository MIT license. This native configuration
change requires a new Android development/preview build. Expo Go continues to
fail safely without remote push support.

The v4 identifier replaces v3 because Android will not update a persisted
channel's sound or importance after creation. Foreground presentation permits
sound and visible banner/list presentation; device permission, DND, and channel
settings remain authoritative.

The native category `MEDICINE_REMINDER_ACTIONS` exposes stable
`MEDICINE_TAKEN`, `MEDICINE_SNOOZE`, and `MEDICINE_SKIP` identifiers. Actions
open the application to the foreground, persist only action identifier, opaque
reminder UUID, and idempotency UUID, wait for authenticated session restoration,
and reuse the normal APIs. Taken therefore retains E20
intake/inventory semantics; Snooze and Skip retain their established semantics.
The OS notification is dismissed only after backend success. Network/auth
failure leaves the action pending and routes to the authenticated reminder
screen without showing fake success.

Swiping away a notification is not Snooze. Dismissal creates no Taken, Snooze,
or Skip acknowledgement and changes no inventory. A future policy must define
bounded re-notification, maximum attempts, missed deadlines, and any approved
caregiver escalation without inventing clinical timing here.

Android Back has a bounded fallback for screens launched directly from Home.
It uses normal history when available and replaces with Home only when the
native stack has no prior in-app route. Home retains Android's normal exit
behavior, and nested medicine/OCR/reminder flows retain their own navigation.
