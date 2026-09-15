import { AppAlert, AppButton, AppText } from '@/components/primitives';
import { useTranslation } from '@/localization';
import { usePushRegistration } from '@/state/PushRegistrationContext';
import { Linking } from 'react-native';
export function PushRegistrationSettings() {
  const { result, loading, register } = usePushRegistration();
  const { t } = useTranslation();
  const message =
    result?.status === 'registered'
      ? t('registrationComplete')
      : result?.status === 'unsupported_personal_team'
        ? t('notificationsUnsupportedPersonalTeam')
        : result?.status === 'unsupported_runtime'
          ? t('notificationsUnsupportedRuntime')
          : result?.status === 'denied'
            ? t('permissionDenied')
            : result?.status === 'offline'
              ? t('registrationOffline')
              : result
                ? t('registrationPending')
                : null;
  return (
    <>
      <AppText>{t('notificationsHelp')}</AppText>
      <AppButton
        label={t('enableNotifications')}
        loading={loading}
        onPress={register}
        accessibilityHint={t('notificationsHelp')}
        disabled={
          result?.status === 'unsupported_runtime' ||
          result?.status === 'unsupported_personal_team'
        }
      />
      {message ? (
        <AppAlert
          tone={result?.status === 'registered' ? 'success' : 'warning'}
          message={message}
        />
      ) : null}
      {result?.status === 'denied' ? (
        <AppButton
          variant="secondary"
          label={t('openNotificationSettings')}
          onPress={() => Linking.openSettings()}
          accessibilityHint={t('permissionDenied')}
        />
      ) : null}
      <AppAlert message="Lock-screen notifications use generic wording and never include medication names, dosage, symptoms, caregiver identity, prescriptions, or clinical evidence by default." />
    </>
  );
}
