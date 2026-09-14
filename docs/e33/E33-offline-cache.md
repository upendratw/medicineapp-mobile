# E33 Offline Cache

MED-1330 provides a versioned AsyncStorage cache limited to allowlisted UI configuration, minimal medication summaries, and schedule summaries. It enforces 20 entries, 8 KiB per item, 64 KiB total, TTL and bounded stale windows, corruption removal, and explicit stale labeling.

Expo-compatible NetInfo drives the online/offline state. A reconnect hook allows read screens to refresh authoritative server data after connectivity returns.

Offline behavior is read-only resilience. Taken, Skip, Snooze, SOS, symptom submission, prescription upload, and every clinical write require connectivity and are never queued or reported as successful. Tokens, prescriptions/OCR, symptoms, voice/audio, contacts, caregiver/history data, and clinical evidence are prohibited cache categories.
