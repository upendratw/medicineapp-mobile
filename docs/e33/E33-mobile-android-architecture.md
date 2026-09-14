# E33 Mobile Android Architecture

MED-1304 establishes Expo SDK 57, React Native 0.86, TypeScript strict mode, and Expo Router. Routes live in `src/app`; reusable logic lives under `src`. Android uses `com.medicineapp.mobile`, portrait orientation, the `medicineapp` deep-link scheme, version code 1, and placeholder adaptive/splash assets. Future releases increment Android `versionCode` monotonically for every Play artifact.

The backend HTTP API is the only application backend. Mobile code never accesses MySQL, S3, OpenSearch, Gemini, or AWS credentials. Android is the first delivery target without intentionally breaking iOS.
