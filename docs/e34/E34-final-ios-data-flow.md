# Final iOS data flow

User input → bounded shared UI validation → authenticated API client → HTTPS backend → authorized backend services. Tokens → SecureStore/Keychain only. Preferences and bounded non-authoritative cache → AsyncStorage. Camera image → transient in-memory capture context → explicit review; no automatic upload or medication creation. Notification permission → explicit user action → installed-build token → authenticated device endpoint; token is neither logged nor placed in AsyncStorage. Deep links/taps → whitelist → auth/onboarding route guard.
