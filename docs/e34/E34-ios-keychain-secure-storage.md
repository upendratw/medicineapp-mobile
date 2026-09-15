# iOS Keychain secure storage

`ExpoSecureTokenStore` is the single auth-token abstraction. On iOS, Expo SecureStore uses Keychain. Access and refresh tokens use `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`; partial/corrupt sessions are cleared, replacement is transactional with cleanup, and logout clears current and legacy keys. Device-registration metadata also uses SecureStore and is bounded/validated.

No auth token is stored in AsyncStorage. Native storage errors fail closed. iOS Keychain may persist across reinstall, so logout/account replacement cleanup remains required; it is not treated as an irreplaceable source of truth.
