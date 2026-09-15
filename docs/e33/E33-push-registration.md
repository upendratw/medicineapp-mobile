# E33 Push Registration

MED-1333 uses Expo Notifications and Android device identity from Expo Application. Permission is requested only after an explicit accessible action; denial does not block the app. Previously granted permission may be refreshed at authenticated startup without prompting. A stable private Android notification channel uses default importance, private lock-screen visibility, and no forced vibration pattern.

The Expo push token is transient. It is sent through the authenticated API client to real `POST /api/v1/devices` with the minimum device identifier, Android platform, and app version. Only the returned backend device-record ID is retained in SecureStore. Token rotation reuses the same backend contract. Logout/account replacement attempts `DELETE /api/v1/devices/{did}` before token removal and always clears the local registration association even if revocation fails.

Registration requires connectivity and confirmed backend success. No fake success or unsafe offline queue exists.

Expo Go cannot load Android remote-notification functionality in SDK 57. The notification capability boundary detects `Constants.expoGoConfig`, returns `unsupported_runtime`, and does not import the native notification module, request permission, acquire a token, register a backend device, or subscribe to notification responses. The settings screen explains that an installed development/preview build is required. EAS development, preview, and standalone builds retain the lazy native notification flow.
