import { useEffect, useState } from 'react';
import { Alert, Share, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppAlert } from '@/components/AppAlert';
import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppText } from '@/components/AppText';
import { AppTextInput } from '@/components/AppTextInput';
import { LoadingIndicator } from '@/components/LoadingIndicator';
import { useTranslation } from '@/localization';
import type {
  ErasureStatus,
  PrivacyCapabilities,
  PrivacyNotice,
  PrivacyService,
} from '@/services/privacyService';
import { useAuth } from '@/state/AuthContext';
import { theme } from '@/theme/tokens';

export function PrivacyCenter({ service }: { service: PrivacyService }) {
  const { language, t } = useTranslation();
  const { logout, role } = useAuth();
  const router = useRouter();
  const [capabilities, setCapabilities] = useState<PrivacyCapabilities | null>(
    null,
  );
  const [erasure, setErasure] = useState<ErasureStatus | null>(null);
  const [notice, setNotice] = useState<PrivacyNotice | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (role !== 'patient' && role !== 'caregiver') return undefined;
    void Promise.all([
      service.profile(role),
      service.capabilities(),
      service.erasureStatus(),
      service.notice(language),
    ]).then(
      ([profile, nextCapabilities, nextErasure, nextNotice]) => {
        if (!active) return;
        setDisplayName(profile.display_name ?? '');
        setCapabilities(nextCapabilities);
        setErasure(nextErasure);
        setNotice(nextNotice);
        setLoading(false);
      },
      () => {
        if (!active) return;
        setError(t('privacyLoadFailed'));
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [language, role, service, t]);

  const saveDisplayName = async () => {
    const candidate = displayName.trim();
    if (!candidate || (role !== 'patient' && role !== 'caregiver')) return;
    setWorking(true);
    setError('');
    try {
      await service.updateDisplayName(role, candidate);
      setDisplayName(candidate);
    } catch {
      setError(t('privacyProfileFailed'));
    } finally {
      setWorking(false);
    }
  };

  const exportData = async () => {
    setWorking(true);
    setError('');
    try {
      const data = await service.exportData();
      await Share.share({ message: JSON.stringify(data, null, 2) });
    } catch {
      setError(t('privacyExportFailed'));
    } finally {
      setWorking(false);
    }
  };

  const deleteAccount = async () => {
    setWorking(true);
    setError('');
    try {
      await service.requestDeletion();
      await logout();
    } catch {
      setError(t('privacyDeleteFailed'));
      setWorking(false);
    }
  };

  const confirmDeletion = () =>
    Alert.alert(t('privacyDeleteConfirmTitle'), t('privacyDeleteConfirmBody'), [
      { text: t('privacyCancel'), style: 'cancel' },
      {
        text: t('privacyDeleteConfirmAction'),
        style: 'destructive',
        onPress: () => void deleteAccount(),
      },
    ]);

  if (loading) return <LoadingIndicator label={t('privacyLoading')} />;

  return (
    <View style={{ gap: theme.spacing.md }} accessibilityRole="summary">
      {error ? <AppAlert tone="error" announce message={error} /> : null}
      <AppCard>
        <AppText variant="heading">{t('privacyYourData')}</AppText>
        <AppText>{t('privacyExportHelp')}</AppText>
        <AppButton
          label={t('privacyExport')}
          loading={working}
          onPress={() => void exportData()}
        />
      </AppCard>

      <AppCard>
        <AppText variant="heading">{t('privacyCorrections')}</AppText>
        <AppText>{t('privacyCorrectionHelp')}</AppText>
        <AppTextInput
          label={t('privacyDisplayName')}
          value={displayName}
          maxLength={120}
          autoCorrect={false}
          onChangeText={setDisplayName}
        />
        <AppButton
          variant="secondary"
          label={t('privacySaveProfile')}
          loading={working}
          disabled={!displayName.trim()}
          onPress={() => void saveDisplayName()}
        />
        {role === 'patient' ? (
          <AppButton
            variant="secondary"
            label={t('privacyMedicationCorrection')}
            onPress={() => router.push('/medicines')}
          />
        ) : null}
        <AppAlert tone="warning" message={t('privacySymptomPending')} />
      </AppCard>

      <AppCard>
        <AppText variant="heading">{t('privacySharing')}</AppText>
        <AppText>{t('privacySharingHelp')}</AppText>
        <AppButton
          variant="secondary"
          label={t('privacySharingAction')}
          onPress={() => router.push('/family-caregivers' as never)}
        />
      </AppCard>

      <AppCard>
        <AppText variant="heading">{t('privacyDeletion')}</AppText>
        <AppText>{t('privacyDeletionHelp')}</AppText>
        <AppText variant="caption">
          {t('privacyErasureStatus')}: {erasure?.status ?? t('privacyUnknown')}
        </AppText>
        <AppText variant="caption">{t('privacyPostDeactivation')}</AppText>
        <AppButton
          variant="danger"
          label={t('privacyDeleteAction')}
          disabled={working}
          onPress={confirmDeletion}
        />
      </AppCard>

      {notice ? (
        <AppCard>
          <AppText variant="heading">{notice.title}</AppText>
          <AppAlert tone="warning" message={notice.review_status} />
          {notice.sections.map((section) => (
            <View key={section.heading} style={{ gap: theme.spacing.xs }}>
              <AppText variant="label">{section.heading}</AppText>
              <AppText>{section.body}</AppText>
            </View>
          ))}
          <AppText variant="caption">
            {t('privacyNoticeVersion')}: {notice.notice_version}
          </AppText>
        </AppCard>
      ) : null}

      <AppText variant="caption">
        {t('privacyCapabilitySummary')}:{' '}
        {capabilities?.capabilities.filter(
          (item) => item.status === 'available',
        ).length ?? 0}
      </AppText>
    </View>
  );
}
