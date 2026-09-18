# iOS Keychain secure storage

`ExpoSecureTokenStore` is the single auth-token abstraction. On iOS, Expo SecureStore uses Keychain. Access and refresh tokens use `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`; partial/corrupt sessions are cleared, replacement is transactional with cleanup, and logout clears current and legacy keys. Device-registration metadata also uses SecureStore and is bounded/validated.

No auth token is stored in AsyncStorage. Native storage errors fail closed. iOS Keychain may persist across reinstall, so logout/account replacement cleanup remains required; it is not treated as an irreplaceable source of truth.

Physical-iPhone evidence confirmed that the complete session pair persisted across force-close. Presence alone is not treated as proof that an access token remains backend-valid: a protected 401 now uses the stored refresh credential once through the backend rotation contract. Rejected or missing refresh credentials clear access, refresh, and legacy auth keys and return the application to unauthenticated state. MED-1377 automated recovery coverage passes; post-fix physical Keychain/session retest is pending.
