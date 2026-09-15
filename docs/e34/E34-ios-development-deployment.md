# iOS development deployment

CONFIGURATION READY: development-client profile uses the linked EAS project and `https://api-medicine.ankala.ai`. EXPO GO VALIDATION: shared capability was previously validated, but it is bounded and remote push remains unsupported. INSTALLED DEVELOPMENT BUILD: PENDING Apple credentials/device registration/build authorization. PHYSICAL DEVICE: PENDING.

Owner next steps: install full Xcode if simulator testing is desired; run the interactive `eas build --platform ios --profile development`; authenticate with the correct Apple team; register the intended iPhone when prompted; let EAS manage credentials; install the resulting internal build; execute the smoke plan. Never export signing secrets into the repository.
