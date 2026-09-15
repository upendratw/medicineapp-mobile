# iOS operational support runbook

Confirm bundle ID/project/profile, app environment and HTTPS reachability without printing secrets. For auth, clear the session through app logout; never inspect JWT/refresh token. For Keychain failure, record only a bounded storage outcome. For camera/notifications, check OS permission settings and installed-build capability; never claim Expo Go push. For deep links, use only `medicineapp://` whitelisted routes. For offline issues, reconnect and retry authoritative reads; clinical writes are never queued.

Validate VoiceOver, Dynamic Type, Reduce Motion, E22 safety boundaries, and notification taps on the actual target. Escalate signing/APNs to an authorized Apple/EAS owner. Incident response must revoke/rotate credentials outside Git, disable affected distribution, preserve content-free evidence, and use a known-good build for rollback. Never print tokens, Apple credentials, identifiers, or health data.
