# E33 Medicine Camera

MED-1315 uses Expo Camera with explicit permission, denied-permission/manual fallback, labeled capture, preview, retake, cancel, and explicit continue controls. Capture does not trigger upload. Image URIs and content are never logged or stored in AsyncStorage.

After E34 physical testing exposed an iOS compositing/safe-area defect, the native preview and controls are siblings rather than nesting controls inside `CameraView`. A safe-area overlay keeps the text-labelled shutter above the home indicator. Capture waits for camera readiness, is single-flight, and reports only sanitized failure copy.

The captured URI remains only in transient React state. Retake, manual fallback, or completed handoff clears the app reference; Expo/OS owns cleanup of its temporary camera cache. Future backend upload work must add explicit cancellation and deletion without sending images directly to Gemini or another third party.
