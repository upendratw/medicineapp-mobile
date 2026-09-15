# E34 detailed technical design

One Expo Router application supplies shared screens, contexts, components, validation, localization, offline cache, and API services. Platform adapters are limited to Expo Camera, Application identifiers, SecureStore, Notifications, and OS settings. Notification native code is lazy-loaded behind a typed capability; Expo Go returns unsupported, while an installed iOS build uses vendor identifier + Expo token + authenticated device API. Route intents always pass the whitelist and auth/onboarding guards. No clinical decisions occur locally.
