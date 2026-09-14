# E33 Environment Management

MED-1306 supports `development`, `test`, `staging`, and `production`. `src/config/environment.ts` validates the public API URL, a 1–30 second request timeout, and a development-only diagnostics flag. Staging and production require HTTPS; local development may use HTTP.

Only `EXPO_PUBLIC_*` configuration is accepted and it must never contain secrets. Copy `.env.example` to ignored `.env`. Android Emulator normally reaches a Mac backend at `http://10.0.2.2:8000`; a physical device needs the Mac's reachable LAN URL.
