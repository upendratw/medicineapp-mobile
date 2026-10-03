const { isRunningInExpoGo } = require('expo');
const { Platform } = require('react-native');

// Native notification modules must be loaded before the router so Android can
// start the headless task after the JavaScript process has been terminated.
// Expo Go intentionally skips this native-only capability boundary.
if (Platform.OS === 'android' && !isRunningInExpoGo()) {
  require('./src/services/backgroundReminderNotifications');
}

require('expo-router/entry');
