import { useRouter } from 'expo-router';
import {
  AppAlert,
  AppButton,
  AppCard,
  AppHeader,
  AppScreen,
  AppText,
} from '@/components';
import { usePreferences } from '@/state/PreferencesContext';
export default function AccessibilityScreen() {
  const router = useRouter();
  const { accessibility, setAccessibility } = usePreferences();
  return (
    <AppScreen>
      <AppHeader
        title="Accessibility preferences"
        subtitle="MedicineApp supports device text scaling, screen readers, and large touch targets."
      />
      <AppText>
        Choose a starting display preference. Your phone text-size and screen
        reader settings continue to apply.
      </AppText>
      <AppCard>
        <AppButton
          variant={accessibility === 'system' ? 'primary' : 'secondary'}
          label="Use device settings"
          onPress={() => setAccessibility('system')}
        />
        <AppButton
          variant={accessibility === 'enhanced' ? 'primary' : 'secondary'}
          label="Enhanced clarity"
          onPress={() => setAccessibility('enhanced')}
        />
      </AppCard>
      <AppAlert message="Important information is communicated with words as well as color." />
      <AppButton label="Continue" onPress={() => router.push('/complete')} />
    </AppScreen>
  );
}
