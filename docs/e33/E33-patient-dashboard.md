# E33 Patient Dashboard

MED-1311 adds the protected patient home with medicine count, active schedule summary, adherence availability, upcoming schedule, safe empty/error/loading states, and quick actions. Production data is loaded only through typed services and the authenticated API client; no medication or adherence fixture is presented as real data.

The current backend has no patient-medication ownership list, so that portion is explicitly marked integration-pending. The dashboard does not diagnose, interpret adherence clinically, or recommend treatment or dosage changes.
