# E33 Device Test Gaps

On 2026-09-14, `adb` 37.0.0 reported no connected devices. The emulator and SDK-manager commands were unavailable; no SDK root, installed platform, system image, or AVD was discovered. No image was downloaded and no AVD was created.

Required follow-up evidence:

1. Run the bounded smoke flow on matching Android 10, 11, 12, 13, 14, and 15 targets.
2. On Android 13+, exercise notification grant, denial, and settings recovery without repeated prompts.
3. Simulate process death and memory pressure, then verify auth restoration, navigation, and safe loss of transient capture/symptom/voice state.
4. Exercise default and maximum supported Android system font scales on all critical screens.
5. Complete a manual TalkBack traversal of authentication, medication, reminder, clinical-information, settings, voice, and SOS flows.
6. Record device/API, build identifier, steps, outcome, screenshots/logs free of secrets and health data, and defects.

These gaps do not negate automated compatibility preparation, but they block any claim of emulator, physical-device, or final accessibility acceptance.
