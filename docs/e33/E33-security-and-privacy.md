# E33 Security and Privacy

Authentication secrets use SecureStore without an AsyncStorage fallback. Preference and offline stores accept only non-secret, explicitly approved data. No local clinical database, write-behind queue, direct AWS/Gemini/OpenSearch/S3/MySQL client, clinical translation engine, or sensitive logging is introduced. Secure-storage failure prevents authenticated restoration.
