# E33 Caregiver Dashboard

MED-1312 uses the real E21 authorized-patient selector and caregiver dashboard endpoints. A stable patient ID is supplied only after the backend returns an active, sharing-enabled relationship with dashboard permission. The screen presents schedule, engineering adherence, missed-dose, upcoming/recent status, and safe unavailable states.

UI visibility is not authorization. Every request requires a bearer session and backend relationship/permission enforcement. No dependent data is persisted locally and no treatment advice is produced.
