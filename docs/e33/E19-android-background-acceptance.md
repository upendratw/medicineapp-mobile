# E19 Android background-notification acceptance

The installed Android development client loads JavaScript from Metro. A warm
foreground runtime can retain the server selected in Expo Dev Launcher, but a
cold `expo-task-manager` headless start initializes the React host without that
foreground launcher state. In the SDK 57 development client, that cold start
uses the standard Android development-server endpoint on port 8081. A Metro
server and ADB reverse on another port can therefore validate a warm first
notification while preventing later cold/background tasks from loading the
bundle.

This limitation belongs to the development acceptance environment. Preview,
staging, and production builds contain their JavaScript bundle and do not
depend on a developer machine or Metro. The product notification architecture
must not hard-code a Metro port or add a production Metro dependency.

For physical Android background-reminder acceptance, reserve the standard port
and expose that same endpoint before opening the installed development client:

```sh
/opt/homebrew/bin/adb reverse tcp:8081 tcp:8081
npm run start:android-background-acceptance
```

Confirm the development client is connected to this server before placing the
app in the background. Keep Metro running and the reverse active for the whole
sequence, including any process-cold headless task. If port 8081 is occupied,
stop the conflicting local process; do not silently move this acceptance to a
different port. After the test, stop Metro and remove only this temporary
reverse:

```sh
/opt/homebrew/bin/adb reverse --remove tcp:8081
```

The E19 task remains defined at module scope before Expo Router. Distinct
reminder UUIDs produce distinct local notification identifiers, while durable
replay state suppresses another delivery of the same occurrence. Authentication
and owner lookup remain backend-mediated; no credential or clinical content is
added to the push payload or diagnostic output.
