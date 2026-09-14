# E33 Navigation Design

MED-1307 defines `(auth)`, `(onboarding)`, and `(app)` route groups. The root provider restores secure session and non-sensitive onboarding state. `RouteGuard` derives the only permitted group: unauthenticated or error states go to login; authenticated users with incomplete onboarding go to welcome; fully initialized users go to home.

Deep links are subjected to the same state guard. Tokens are never route parameters. Logout clears secure tokens and onboarding state, returning navigation to auth. Server authorization remains mandatory even when UI routes are protected.
