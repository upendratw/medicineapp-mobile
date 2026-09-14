# E33 Authentication and Token Security

MED-1309 implements the backend `/api/v1/auth/request-otp`, `/verify-otp`, and `/logout` contracts. India `+91` phone normalization is bounded; OTP input accepts 4–8 digits and is neither displayed as helper content nor persisted. Repeat submission is disabled while loading and resend has a local cooldown.

Access and refresh tokens pass directly from the API service to the `SecureTokenStore` abstraction backed by `expo-secure-store`. UI components cannot read refresh tokens. Tokens are never stored in AsyncStorage, route parameters, logs, or error messages. API requests have bounded timeouts, sanitized failures, and no automatic auth retry/refresh rotation in this batch.
