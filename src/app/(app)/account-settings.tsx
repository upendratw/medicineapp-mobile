import { Alert } from 'react-native';
import { useCallback, useState } from 'react';

import { AppAlert, AppButton, AppHeader, AppScreen } from '@/components';
import { useTranslation } from '@/localization';
import { useAuth } from '@/state/AuthContext';

export default function AccountSettingsScreen() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const performLogout = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      await logout();
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [logout]);

  const confirmLogout = useCallback(() => {
    Alert.alert(t('logoutConfirmTitle'), t('logoutConfirmMessage'), [
      { text: t('logoutCancel'), style: 'cancel' },
      { text: t('logout'), style: 'destructive', onPress: performLogout },
    ]);
  }, [performLogout, t]);

  return (
    <AppScreen>
      <AppHeader
        title={t('accountSettings')}
        subtitle={t('accountSettingsHelp')}
      />
      {failed ? <AppAlert tone="error" message={t('logoutError')} /> : null}
      <AppButton
        variant="danger"
        label={t('logout')}
        accessibilityHint={t('logoutHint')}
        loading={loading}
        onPress={confirmLogout}
      />
    </AppScreen>
  );
}
