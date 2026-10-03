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

## Physical Taken, Snooze, and Skip acceptance

R1 E19 Android notification-action acceptance is complete on a physical Samsung
Android 15 device. The evidence combines separate controlled runs; the three
actions were not repeated in one run:

- Taken was proven previously to create exactly one acknowledgement, one Taken
  intake, and one inventory-consumption event, changing the test inventory from
  9 to 8 with no duplicate result.
- Snooze was tapped once on one naturally delivered background notification. It
  moved the original reminder to `snoozed`, created exactly one scheduled child
  at +10 minutes, and created no intake or inventory event. The inventory stayed
  at 8. The temporary schedule was then cancelled through the authenticated
  application lifecycle, which cancelled the future child without altering the
  preserved Snooze evidence.
- Skip was tapped once on a separate naturally delivered background
  notification. It produced exactly one `SKIPPED` acknowledgement and exactly
  one skipped intake, with zero Taken results, zero snooze children, and no
  inventory event. The inventory stayed at 8. The temporary schedule was then
  cancelled through the authenticated application lifecycle; its future
  occurrences were cancelled while the fired/Skipped occurrence remained
  preserved.

Each tested notification was the single visible MedicineApp notification for
its occurrence, exposed all three Taken/Snooze/Skip actions, used the
`medicineapp-reminders-v4` alarm channel, produced the bundled alarm sound and
vibration, and retained a generic `PRIVATE` preview without medicine name, dose,
or Patient health content. No action-less remote notification or duplicate local
notification was observed. The deployed backend was
`1fce8673a0c33791223a17898e4f69af2b9bb9e7`; the tested mobile JavaScript was
`81c0ebcc80ce206338c4a9900c112dfd580e2569`, loaded by the installed development
client through the documented Metro 8081/ADB-reverse workflow. Expo Go and a new
EAS build were not used.

Two separate UX follow-ups remain outside this acceptance:

- Android/Samsung may initially collapse the notification, requiring expansion
  before its action buttons are visible. The application cannot guarantee an
  always-expanded notification without a separately reviewed, materially more
  intrusive full-screen alarm design.
- Editing a daily schedule to a time already passed on the current day is still
  rejected instead of scheduling its next occurrence for the following day.

The acceptance used only normal authenticated lifecycle operations for
temporary schedule cleanup. It made no direct database update, AWS
configuration change, provider retry, or change to account/device isolation.
