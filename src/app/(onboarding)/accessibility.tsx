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
  const { accessibility, updateAccessibility } = usePreferences();
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
          variant={
            accessibility.textSize === 'default' ? 'primary' : 'secondary'
          }
          label="Use device settings"
          onPress={() => updateAccessibility({ textSize: 'default' })}
        />
        <AppButton
          variant={accessibility.textSize === 'large' ? 'primary' : 'secondary'}
          label="Enhanced clarity"
          onPress={() =>
            updateAccessibility({ textSize: 'large', largerControls: true })
          }
        />
      </AppCard>
      <AppAlert message="Important information is communicated with words as well as color." />
      <AppButton label="Continue" onPress={() => router.push('/complete')} />
    </AppScreen>
  );
}
