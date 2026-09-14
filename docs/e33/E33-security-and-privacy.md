# E33 Security and Privacy

Deep links and notification data are untrusted, bounded, action-free navigation input. Push tokens remain transient and never enter logs, AsyncStorage, routes, analytics, or error output. Only the backend registration ID is stored in SecureStore. Generic lock-screen content minimizes disclosure, and auth/onboarding/backend authorization remains mandatory.

Authentication secrets use SecureStore without an AsyncStorage fallback. Preference and offline stores accept only non-secret, explicitly approved data. No local clinical database, write-behind queue, direct AWS/Gemini/OpenSearch/S3/MySQL client, clinical translation engine, or sensitive logging is introduced. Secure-storage failure prevents authenticated restoration.

Release preparation rejects HTTP or loopback backends in staging/production and rejects secret-like `EXPO_PUBLIC_*` names. EAS profiles contain only non-secret environment selectors and diagnostics flags; production API configuration must be provisioned separately and pass runtime validation. The Play Data Safety mapping is a draft, not privacy, DPDP, medical-device, or legal approval.

The MED-1349 STRIDE-inspired review is recorded in `E33-mobile-threat-model.md`. MED-1352/1353 observability accepts only predefined content-free events, categories, outcomes, sanitized error codes, and duration buckets. It has no analytics SDK or network exporter and defaults to no-op sinks; raw errors, paths, identifiers, and clinical content are excluded.
