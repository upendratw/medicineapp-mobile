# E33 Notification Privacy

Default notification copy is limited to “MedicineApp reminder” and “You have a scheduled medication reminder.” Medication name, dosage, diagnosis, symptom, caregiver identity, prescription details, and clinical evidence are excluded from default lock-screen content. Richer clinical data is retrieved only after opening the authenticated application.

Notification data is untrusted and passes through the same deep-link allowlist, authentication, onboarding, and authorization gates. Notification taps cannot mark Taken, Skip, or Snooze and cannot trigger SOS. Notifications are supplementary and are not relied on for clinical safety.
