# E34 iOS environment discovery

Originally observed 2026-09-15 and refreshed 2026-09-16 on macOS 26.6.2 (25G83), Apple silicon arm64. Node was v22.18.0, npm 10.9.3, and Expo CLI 57.0.25. The project resolves Expo SDK 57 and its dependencies pass `expo install --check`.

Xcode 27.0 (27A266a) and the iOS 27.0 simulator runtime are now installed. `devicectl` reports an iPhone 16 visible without recording its identifier. No simulator or physical-device MedicineApp execution was performed by Codex, so runtime results remain PENDING. The user-reported Personal Team signing attempt failed because the generated APNs entitlement is unsupported by free Personal Teams; the canonical local-build workaround is documented in `E34-personal-team-local-iphone-build.md`.

EAS authenticated as `@ankala.ai`; project info resolved `@ankala.ai/medicineapp-mobile` with ID `2f80f2d1-5285-479b-9358-0cf8a88cbe93`. The installed CLI has no non-interactive credentials-inspection flag. Apple membership, certificates, profiles, device registration, and APNs credentials were not inspected or created and remain PENDING.
