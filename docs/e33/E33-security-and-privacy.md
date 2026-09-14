# E33 Security and Privacy

Deep links and notification data are untrusted, bounded, action-free navigation input. Push tokens remain transient and never enter logs, AsyncStorage, routes, analytics, or error output. Only the backend registration ID is stored in SecureStore. Generic lock-screen content minimizes disclosure, and auth/onboarding/backend authorization remains mandatory.

Authentication secrets use SecureStore without an AsyncStorage fallback. Preference and offline stores accept only non-secret, explicitly approved data. No local clinical database, write-behind queue, direct AWS/Gemini/OpenSearch/S3/MySQL client, clinical translation engine, or sensitive logging is introduced. Secure-storage failure prevents authenticated restoration.
