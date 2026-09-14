import { AccessibilitySettings, AppHeader, AppScreen } from '@/components';
import { useTranslation } from '@/localization';
export default function AccessibilitySettingsScreen() {
  const { t } = useTranslation();
  return (
    <AppScreen>
      <AppHeader
        title={t('accessibility')}
        subtitle="Elderly-first display and interaction preferences"
      />
      <AccessibilitySettings />
    </AppScreen>
  );
}
