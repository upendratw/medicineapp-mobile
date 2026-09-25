# E33 Notification Privacy

Reminder lock-screen copy is limited to the generic title “Medicine reminder”
and `Time to take <authoritative medicine display label>.` The backend resolves
that label from the linked medication record. Patient name, condition,
diagnosis, dose, instructions, inventory, adherence information, caregiver
identity, arbitrary notes, prescription details, and clinical evidence remain
excluded. Richer clinical data is retrieved only after opening the authenticated
application.

Notification data is untrusted and passes through the same deep-link allowlist, authentication, onboarding, and authorization gates. Notification taps cannot mark Taken, Skip, or Snooze and cannot trigger SOS. Notifications are supplementary and are not relied on for clinical safety.

Android uses the versioned `medicineapp-reminders-v3` runtime channel with MAX
importance, the platform default sound, vibration, public lock-screen
visibility, and no DND bypass. No custom bundled sound or invasive permission is
introduced, so an already installed SDK 57 development client can reuse its
native notification capability after loading the updated JavaScript. Expo Go
continues to fail safely without remote push support.

SDK 57 selects Android's platform default notification sound when the runtime
channel omits the `sound` property. The literal string `default` is a custom
raw-resource filename in the Android channel API and must not be supplied. The
v3 identifier replaces v2 because Android will not update a persisted channel's
sound or importance after creation. Foreground presentation explicitly permits
sound and visible banner/list presentation; device permission, DND, and channel
settings remain authoritative.

Swiping away a notification is not Snooze. Dismissal creates no Taken, Snooze,
or Skip acknowledgement and changes no inventory. A future policy must define
bounded re-notification, maximum attempts, missed deadlines, and any approved
caregiver escalation without inventing clinical timing here.
