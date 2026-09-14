# E33 Secure Storage

MED-1331 keeps access and refresh tokens in Android Keystore-backed Expo SecureStore under versioned, namespaced keys. Reads validate both tokens and fail closed; partial/corrupt values are cleared. Writes are atomic from the application perspective and clear partial state on failure. Logout and clear-session remove current and legacy app token keys. Secret values never use AsyncStorage, UI state, routes, logs, telemetry, or error messages. Biometric unlock is deferred.
