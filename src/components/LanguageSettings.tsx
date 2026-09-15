import { AppAlert, AppButton } from '@/components/primitives';
import { useTranslation } from '@/localization';
import { usePreferences, type AppLanguage } from '@/state/PreferencesContext';
export function LanguageSettings() {
  const { language, setLanguage } = usePreferences();
  const { t } = useTranslation();
  const choose = (value: AppLanguage) => setLanguage(value);
  return (
    <>
      <AppButton
        variant={language === 'en-IN' ? 'primary' : 'secondary'}
        label={`${t('english')} (en-IN)`}
        onPress={() => choose('en-IN')}
      />
      <AppButton
        variant={language === 'hi-IN' ? 'primary' : 'secondary'}
        label={`${t('hindi')} (hi-IN)`}
        onPress={() => choose('hi-IN')}
      />
      <AppAlert message="Language changes UI labels only. Clinical evidence is shown only in the language and translation status supplied by the backend." />
    </>
  );
}
