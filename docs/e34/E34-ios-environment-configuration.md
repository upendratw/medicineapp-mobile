# iOS environment configuration

The shared typed environments remain development, test, staging, and production. Development and preview/test EAS profiles explicitly use `https://api-medicine.ankala.ai`; no physical build uses localhost. Staging/production retain the HTTPS/non-loopback validators and intentionally require deployment-owned configuration rather than embedding an unverified production endpoint. `EXPO_PUBLIC_*` values are public configuration and may never contain secrets.

The development profile creates an installed development client. Preview is an internal test build, staging is internal, and production is store-oriented. Android profile outputs remain unchanged.
