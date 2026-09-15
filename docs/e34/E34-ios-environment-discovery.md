# E34 iOS environment discovery

Observed 2026-09-15 on macOS 26.6.2 (25G83), Apple silicon arm64. Node was v22.18.0, npm 10.9.3, and Expo CLI 57.0.25. The project resolves Expo SDK 57 and its dependencies pass `expo install --check`.

`xcodebuild` reported that the active developer directory is Command Line Tools, not Xcode. `simctl` was unavailable; therefore Xcode version, Simulator devices, iOS runtimes, and simulator execution are PENDING. No physical iPhone was visible through available tooling, so physical-device execution is PENDING.

EAS authenticated as `@ankala.ai`; project info resolved `@ankala.ai/medicineapp-mobile` with ID `2f80f2d1-5285-479b-9358-0cf8a88cbe93`. The installed CLI has no non-interactive credentials-inspection flag. Apple membership, certificates, profiles, device registration, and APNs credentials were not inspected or created and remain PENDING.
