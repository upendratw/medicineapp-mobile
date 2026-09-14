import { AppHeader, AppScreen, LanguageSettings } from '@/components';
import { useTranslation } from '@/localization';
export default function LanguageSettingsScreen() {
  const { t } = useTranslation();
  return (
    <AppScreen>
      <AppHeader title={t('language')} subtitle="UI language / इंटरफ़ेस भाषा" />
      <LanguageSettings />
    </AppScreen>
  );
}
