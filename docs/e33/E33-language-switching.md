# E33 Language Switching

MED-1329 establishes an extensible typed UI catalog for English (`en-IN`) and Hindi (`hi-IN`), persisted as a non-secret preference and updated without restarting or changing navigation/authentication state. Missing application-chrome labels safely fall back to English.

UI localization is not clinically validated translation. Medication names, user-entered health text, citations, source identifiers, and E22 evidence are not locally translated. `human_translation_required` remains authoritative and English evidence is never relabeled as Hindi.
