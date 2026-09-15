# Apple signing and certificates

Configuration design is COMPLETE; real Apple certificate configuration is PENDING.

EAS should manage the distribution certificate, development certificate where needed, and provisioning profiles through the owner-authenticated credentials workflow. No `.p12`, `.cer`, `.mobileprovision`, private key, password, or App Store Connect key belongs in Git or logs. Certificate creation, device registration, rotation, and revocation require an authorized Apple team member. Run the interactive EAS iOS credentials/build flow only with the owner present; verify team, bundle ID, expiry, and profile purpose before accepting changes.
