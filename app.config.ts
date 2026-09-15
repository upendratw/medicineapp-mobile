import type { ExpoConfig } from 'expo/config';

const personalTeamValue = process.env.MEDICINEAPP_IOS_PERSONAL_TEAM_BUILD;
if (personalTeamValue && !['true', 'false'].includes(personalTeamValue)) {
  throw new Error(
    'MEDICINEAPP_IOS_PERSONAL_TEAM_BUILD must be true or false when set',
  );
}
const iosPersonalTeamBuild = personalTeamValue === 'true';

const config: ExpoConfig = {
  name: 'MedicineApp',
  slug: 'medicineapp-mobile',
  owner: 'ankala.ai',
  version: '1.0.0',

  orientation: 'portrait',

  icon: './assets/images/icon.png',

  scheme: 'medicineapp',

  userInterfaceStyle: 'automatic',

  ios: {
    bundleIdentifier: 'com.medicineapp.mobile',
    buildNumber: '1',
    icon: './assets/expo.icon',
    supportsTablet: true,
    config: {
      usesNonExemptEncryption: false,
    },
  },

  android: {
    package: 'com.medicineapp.mobile',
    versionCode: 1,

    adaptiveIcon: {
      backgroundColor: '#E8F3F1',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },

    predictiveBackGestureEnabled: true,
  },

  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },

  plugins: [
    'expo-router',

    [
      'expo-camera',
      {
        cameraPermission:
          'Allow MedicineApp to photograph medicine packaging for your review.',
        recordAudioAndroid: false,
      },
    ],

    [
      'expo-secure-store',
      {
        configureAndroidBackup: true,
      },
    ],

    ...(iosPersonalTeamBuild
      ? ['./plugins/withPersonalTeamNotificationsDisabled']
      : []),

    [
      'expo-notifications',
      {
        defaultChannel: 'medicineapp-reminders-v1',
      },
    ],

    [
      'expo-splash-screen',
      {
        backgroundColor: '#F7FAF9',
        image: './assets/images/splash-icon.png',
        imageWidth: 96,
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
  },

  extra: {
    router: {},
    iosPersonalTeamBuild,

    eas: {
      projectId: '2f80f2d1-5285-479b-9358-0cf8a88cbe93',
    },
  },
};

export default config;
