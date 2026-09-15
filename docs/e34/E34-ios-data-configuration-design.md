# iOS data/configuration design

- Secrets/session: SecureStore/Keychain, never AsyncStorage or public environment.
- Health data: authoritative backend over authenticated HTTPS; bounded UI memory only.
- Images: transient user-initiated capture; no silent persistence/upload.
- Operational cache: bounded, non-authoritative AsyncStorage with corruption handling.
- Preferences: non-sensitive local persistence.
- Device registration: bounded identifier stored in SecureStore; token backend-mediated and never logged.

There is no iOS clinical database and no direct AWS/MySQL/Gemini/OpenSearch/S3 client.
