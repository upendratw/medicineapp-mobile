# E33 Expo Go Push Runtime Fix

## Root cause

`pushRegistration.ts` and `PushRegistrationContext.tsx` statically imported `expo-notifications`. On Android Expo Go with SDK 57, remote-notification functionality is unsupported and module initialization threw before Expo Router completed route discovery. All route files were verified to have default exports; the missing-export warnings and `ErrorBoundary` failure were secondary effects.

## Resolution

`ExpoNotificationCapability` uses the Expo-supported `Constants.expoGoConfig` signal. Expo Go returns `unsupported_runtime` before loading `expo-notifications`, requesting permission, acquiring a push token, configuring a channel, registering a backend device, or subscribing to notification responses. The native module is dynamically imported only for development/preview/standalone builds. Notification settings explain the limitation without blocking the rest of the app.

Logout remains independent: backend unregister is attempted only for an existing opaque registration ID, and local registration metadata is always cleared.

Component-internal imports now use a primitives-only barrel plus direct composite imports, eliminating cycles caused when a component imported the public barrel that re-exported itself.

## Evidence boundary

Automated tests cover unsupported and supported capability paths, module-load failure, no fake registration success, logout cleanup, and deep-link/notification routing safety. Android export confirms bundling. Expo Go startup is reported separately and is not marked passed unless directly observed.
