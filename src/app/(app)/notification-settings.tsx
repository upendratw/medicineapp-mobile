import { AppHeader, AppScreen, PushRegistrationSettings } from '@/components';
import { useTranslation } from '@/localization';
export default function NotificationSettingsScreen() {
  const { t } = useTranslation();
  return (
    <AppScreen>
      <AppHeader title={t('notificationSettings')} />
      <PushRegistrationSettings />
    </AppScreen>
  );
}
