# iOS code/configuration review

AUTOMATED ENGINEERING REVIEW: COMPLETE. HUMAN PEER REVIEW: PENDING.

- Critical: none in executed scope.
- High: fixed — iOS push registration previously hard-coded Android and could not obtain an iOS identifier/platform.
- Medium: Apple credentials/profiles/APNs and runtime matrices cannot be verified without owner/Xcode/device; tracked as exceptions, not defects.
- Low: final App Store metadata/assets require owner/legal review.

Review covered app/EAS configuration, identity, permissions, notifications, SecureStore, deep links, accessibility, environments, tests, release gates, privacy, and clinical safety.
