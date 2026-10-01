import React from 'react';
import { Switch, View } from 'react-native';
import {
  AppAlert,
  AppButton,
  AppCard,
  AppText,
  AppTextInput,
} from '@/components/primitives';
import { useTranslation, type TranslationKey } from '@/localization';
import {
  caregiverAlertSeverities,
  caregiverAlertTypes,
  type CaregiverAlertPreference,
  type CaregiverAlertPreferenceFailure,
  type CaregiverAlertPreferenceInput,
  type CaregiverAlertSeverity,
  type CaregiverAlertType,
} from '@/services/caregiverAlertPreferenceService';

type Props = {
  value: CaregiverAlertPreference;
  saving: boolean;
  saved: boolean;
  failure: CaregiverAlertPreferenceFailure | null;
  onSave(value: CaregiverAlertPreferenceInput): void;
  onRefresh(): void;
};

const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function validateCaregiverAlertPreference(
  value: CaregiverAlertPreferenceInput,
): string | null {
  if (!value.quietHoursEnabled) return null;
  if (
    !TIME.test(value.quietHoursStartLocal) ||
    !TIME.test(value.quietHoursEndLocal)
  )
    return 'caregiverPreferencesQuietHoursInvalid';
  if (value.quietHoursStartLocal === value.quietHoursEndLocal)
    return 'caregiverPreferencesQuietHoursSame';
  return null;
}

export function CaregiverAlertPreferences({
  value,
  saving,
  saved,
  failure,
  onSave,
  onRefresh,
}: Props) {
  const { t } = useTranslation();
  const [draft, setDraft] = React.useState<CaregiverAlertPreferenceInput>({
    alertsEnabled: value.alertsEnabled,
    enabledAlertTypes: value.enabledAlertTypes,
    minimumSeverity: value.minimumSeverity,
    quietHoursEnabled: value.quietHoursEnabled,
    quietHoursStartLocal: value.quietHoursStartLocal,
    quietHoursEndLocal: value.quietHoursEndLocal,
    timezone: value.timezone,
    escalationEnabled: value.escalationEnabled,
    escalationDelayMinutes: value.escalationDelayMinutes,
    revision: value.revision,
  });
  const [validationKey, setValidationKey] = React.useState<string | null>(null);

  const set = (change: Partial<CaregiverAlertPreferenceInput>) =>
    setDraft((current) => ({ ...current, ...change }));
  const toggleType = (item: CaregiverAlertType) =>
    set({
      enabledAlertTypes: draft.enabledAlertTypes.includes(item)
        ? draft.enabledAlertTypes.filter((value) => value !== item)
        : [...draft.enabledAlertTypes, item],
    });
  const submit = () => {
    const issue = validateCaregiverAlertPreference(draft);
    setValidationKey(issue);
    if (!issue) onSave(draft);
  };

  return (
    <>
      {!value.configured ? (
        <AppAlert message={t('caregiverPreferencesNotConfigured')} />
      ) : null}
      {saved ? (
        <AppAlert
          tone="success"
          announce
          message={t('caregiverPreferencesSaved')}
        />
      ) : null}
      {failure ? (
        <>
          <AppAlert
            tone="error"
            message={
              failure === 'access'
                ? t('caregiverPreferencesAccessDenied')
                : failure === 'conflict'
                  ? t('caregiverPreferencesConflict')
                  : t('caregiverPreferencesSaveFailed')
            }
          />
          {failure === 'conflict' ? (
            <AppButton
              variant="secondary"
              label={t('caregiverPreferencesRefresh')}
              onPress={onRefresh}
            />
          ) : null}
        </>
      ) : null}
      <ToggleRow
        label={t('caregiverPreferencesReceiveAlerts')}
        hint={t('caregiverPreferencesReceiveAlertsHint')}
        value={draft.alertsEnabled}
        onChange={(alertsEnabled) => set({ alertsEnabled })}
      />
      <AppCard>
        <AppText variant="heading">
          {t('caregiverPreferencesAlertTypes')}
        </AppText>
        {caregiverAlertTypes.map((item) => (
          <AppButton
            key={item}
            variant={
              draft.enabledAlertTypes.includes(item) ? 'primary' : 'secondary'
            }
            label={t(`caregiverAlertType_${item}` as TranslationKey)}
            accessibilityState={{
              selected: draft.enabledAlertTypes.includes(item),
            }}
            onPress={() => toggleType(item)}
          />
        ))}
      </AppCard>
      <AppCard>
        <AppText variant="heading">
          {t('caregiverPreferencesMinimumSeverity')}
        </AppText>
        <AppText variant="caption">
          {t('caregiverPreferencesMinimumSeverityHint')}
        </AppText>
        {caregiverAlertSeverities.map((item) => (
          <AppButton
            key={item}
            variant={draft.minimumSeverity === item ? 'primary' : 'secondary'}
            label={severityLabel(item, t)}
            accessibilityState={{ selected: draft.minimumSeverity === item }}
            onPress={() => set({ minimumSeverity: item })}
          />
        ))}
      </AppCard>
      <ToggleRow
        label={t('caregiverPreferencesEscalation')}
        hint={t('caregiverPreferencesEscalationHint')}
        value={draft.escalationEnabled}
        onChange={(escalationEnabled) => set({ escalationEnabled })}
      />
      <ToggleRow
        label={t('caregiverPreferencesQuietHours')}
        hint={t('caregiverPreferencesQuietHoursHint')}
        value={draft.quietHoursEnabled}
        onChange={(quietHoursEnabled) => set({ quietHoursEnabled })}
      />
      {draft.quietHoursEnabled ? (
        <AppCard>
          <AppTextInput
            label={t('caregiverPreferencesQuietStart')}
            accessibilityHint={t('caregiverPreferencesTimeHint')}
            placeholder="22:00"
            maxLength={5}
            value={draft.quietHoursStartLocal}
            onChangeText={(quietHoursStartLocal) =>
              set({ quietHoursStartLocal })
            }
          />
          <AppTextInput
            label={t('caregiverPreferencesQuietEnd')}
            accessibilityHint={t('caregiverPreferencesTimeHint')}
            placeholder="07:00"
            maxLength={5}
            value={draft.quietHoursEndLocal}
            onChangeText={(quietHoursEndLocal) => set({ quietHoursEndLocal })}
          />
          {validationKey ? (
            <AppAlert
              tone="error"
              message={t(validationKey as TranslationKey)}
            />
          ) : null}
          <AppText variant="caption">
            {t('caregiverPreferencesTimezone')}: {draft.timezone}
          </AppText>
        </AppCard>
      ) : null}
      <AppButton
        label={t('caregiverPreferencesSave')}
        loading={saving}
        disabled={saving}
        onPress={submit}
      />
    </>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange(value: boolean): void;
}) {
  return (
    <AppCard>
      <View style={{ minHeight: 56, justifyContent: 'center' }}>
        <AppText variant="label">{label}</AppText>
        <AppText variant="caption">{hint}</AppText>
        <Switch
          accessibilityLabel={label}
          accessibilityHint={hint}
          accessibilityRole="switch"
          accessibilityState={{ checked: value }}
          value={value}
          onValueChange={onChange}
        />
      </View>
    </AppCard>
  );
}

function severityLabel(
  severity: CaregiverAlertSeverity,
  t: (key: TranslationKey) => string,
): string {
  const key = `caregiverPreferencesSeverity_${severity}` as TranslationKey;
  return t(key);
}
