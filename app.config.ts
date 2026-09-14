import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'MedicineApp',
  slug: 'medicineapp-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'medicineapp',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'com.medicineapp.mobile',
    icon: './assets/expo.icon',
    supportsTablet: true,
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
    ['expo-secure-store', { configureAndroidBackup: true }],
    ['expo-notifications', { defaultChannel: 'medicineapp-reminders-v1' }],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#F7FAF9',
        image: './assets/images/splash-icon.png',
        imageWidth: 96,
      },
    ],
  ],
  experiments: { typedRoutes: true },
};

export default config;
