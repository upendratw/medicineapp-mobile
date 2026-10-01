import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ApiError } from '@/api/client';
import {
  AppAlert,
  AppButton,
  AppHeader,
  AppScreen,
  CaregiverAlertPreferences,
  LoadingIndicator,
} from '@/components';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useTranslation } from '@/localization';
import {
  classifyCaregiverAlertPreferenceFailure,
  type CaregiverAlertPreferenceFailure,
  type CaregiverAlertPreferenceInput,
} from '@/services/caregiverAlertPreferenceService';
import { caregiverAlertPreferenceService } from '@/services/registry';
import { useAuth } from '@/state/AuthContext';

export default function CaregiverAlertPreferencesScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { role } = useAuth();
  const params = useLocalSearchParams<{ relationshipId?: string | string[] }>();
  const relationshipId =
    typeof params.relationshipId === 'string' ? params.relationshipId : null;
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveFailure, setSaveFailure] =
    useState<CaregiverAlertPreferenceFailure | null>(null);

  const load = useCallback(() => {
    if (role !== 'caregiver' || !relationshipId)
      return Promise.reject(new ApiError('CAREGIVER_ACCESS_NOT_FOUND', 404));
    return caregiverAlertPreferenceService.get(relationshipId);
  }, [relationshipId, role]);
  const resource = useAsyncResource(load);
  const loadFailure = resource.failure
    ? classifyCaregiverAlertPreferenceFailure(resource.failure)
    : null;

  const save = async (input: CaregiverAlertPreferenceInput) => {
    if (!relationshipId || saving) return;
    setSaving(true);
    setSaved(false);
    setSaveFailure(null);
    try {
      await caregiverAlertPreferenceService.save(relationshipId, input);
      await resource.refresh();
      setSaved(true);
    } catch (error) {
      setSaveFailure(classifyCaregiverAlertPreferenceFailure(error));
    } finally {
      setSaving(false);
    }
  };

  const refresh = () => {
    setSaveFailure(null);
    setSaved(false);
    void resource.refresh();
  };

  return (
    <AppScreen>
      <AppHeader
        title={t('caregiverPreferencesTitle')}
        subtitle={t('caregiverPreferencesSubtitle')}
      />
      {resource.loading ? (
        <LoadingIndicator label={t('caregiverPreferencesLoading')} />
      ) : resource.data ? (
        <CaregiverAlertPreferences
          key={`${resource.data.configured}-${resource.data.revision ?? 'new'}`}
          value={resource.data}
          saving={saving}
          saved={saved}
          failure={saveFailure}
          onSave={(input) => void save(input)}
          onRefresh={refresh}
        />
      ) : (
        <>
          <AppAlert
            tone="error"
            message={
              loadFailure === 'access'
                ? t('caregiverPreferencesAccessDenied')
                : t('caregiverPreferencesLoadFailed')
            }
          />
          {loadFailure !== 'access' ? (
            <AppButton label={t('caregiverTryAgain')} onPress={refresh} />
          ) : null}
        </>
      )}
      <AppButton
        variant="secondary"
        label={t('caregiverPreferencesBack')}
        onPress={() => router.back()}
      />
    </AppScreen>
  );
}
