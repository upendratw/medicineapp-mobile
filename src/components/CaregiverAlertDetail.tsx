import { useCallback, useEffect, useRef, useState } from 'react';

import {
  AppAlert,
  AppButton,
  AppCard,
  AppHeader,
  AppScreen,
  AppText,
  EmptyState,
  LoadingIndicator,
} from '@/components/primitives';
import { localeFor, useTranslation } from '@/localization';
import type { AuthRole } from '@/services/authService';
import {
  classifyCaregiverAlertFailure,
  type CaregiverAlertFailure,
  type CaregiverAlertService,
} from '@/services/caregiverAlertService';
import type {
  CaregiverAlert,
  CaregiverAlertRelationship,
} from '@/types/caregiverAlert';

type Props = {
  service: CaregiverAlertService;
  relationshipId: string;
  alertId: string;
  role: AuthRole | null;
  online: boolean;
  onBack(): void;
};

export function CaregiverAlertDetail({
  service,
  relationshipId,
  alertId,
  role,
  online,
  onBack,
}: Props) {
  const { language, t } = useTranslation();
  const [relationship, setRelationship] =
    useState<CaregiverAlertRelationship | null>(null);
  const [alert, setAlert] = useState<CaregiverAlert | null>(null);
  const [loading, setLoading] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);
  const [failure, setFailure] = useState<CaregiverAlertFailure | null>(null);
  const [actionFailure, setActionFailure] =
    useState<CaregiverAlertFailure | null>(null);
  const requestVersion = useRef(0);
  const acknowledgeInFlight = useRef(false);

  const load = useCallback(async () => {
    if (!online) return;
    const version = ++requestVersion.current;
    setLoading(true);
    setFailure(null);
    setActionFailure(null);
    try {
      const relationships = await service.listEligibleRelationships();
      if (requestVersion.current !== version) return;
      const authorized = relationships.find(
        (item) => item.relationshipId === relationshipId,
      );
      if (!authorized) {
        setRelationship(null);
        setAlert(null);
        setFailure('access');
        return;
      }
      const result = await service.getAlert(relationshipId, alertId);
      if (requestVersion.current !== version) return;
      if (
        result.relationshipId !== relationshipId ||
        result.alertId !== alertId
      ) {
        setRelationship(null);
        setAlert(null);
        setFailure('access');
        return;
      }
      setRelationship(authorized);
      setAlert(result);
      setFailure(null);
    } catch (error) {
      if (requestVersion.current !== version) return;
      setFailure(classifyCaregiverAlertFailure(error));
    } finally {
      if (requestVersion.current === version) setLoading(false);
    }
  }, [alertId, online, relationshipId, service]);

  useEffect(() => {
    void Promise.resolve().then(load);
    return () => {
      requestVersion.current += 1;
    };
  }, [load]);

  const acknowledge = async () => {
    if (
      acknowledgeInFlight.current ||
      !online ||
      role !== 'caregiver' ||
      !relationship?.canAcknowledge ||
      alert?.state !== 'open'
    )
      return;
    acknowledgeInFlight.current = true;
    setAcknowledging(true);
    setActionFailure(null);
    try {
      const result = await service.acknowledgeAlert(relationshipId, alertId);
      if (
        result.relationshipId !== relationshipId ||
        result.alertId !== alertId ||
        result.state !== 'acknowledged' ||
        !result.acknowledgedAt
      )
        throw new Error('Invalid acknowledgement response');
      setAlert(result);
    } catch (error) {
      const nextFailure = classifyCaregiverAlertFailure(error);
      if (nextFailure === 'access') setFailure('access');
      else setActionFailure(nextFailure);
    } finally {
      acknowledgeInFlight.current = false;
      setAcknowledging(false);
    }
  };

  const showAcknowledge =
    role === 'caregiver' &&
    relationship?.canAcknowledge === true &&
    alert?.state === 'open';

  return (
    <AppScreen>
      <AppHeader
        title={t('caregiverAlertDetailTitle')}
        subtitle={relationship?.label ?? t('caregiverAlertFamilyMember')}
      />
      <AppButton
        variant="secondary"
        label={t('caregiverAlertDetailBack')}
        onPress={onBack}
      />
      {!online ? (
        <AppAlert tone="warning" message={t('caregiverAlertDetailOffline')} />
      ) : null}
      {failure === 'access' ? (
        <EmptyState
          title={t('caregiverAlertAccessUnavailable')}
          message={t('caregiverAlertAccessUnavailableMessage')}
        />
      ) : loading && !alert ? (
        <LoadingIndicator label={t('caregiverAlertDetailLoading')} />
      ) : !online && !alert ? (
        <EmptyState
          title={t('caregiverAlertDetailOfflineTitle')}
          message={t('caregiverAlertDetailOffline')}
        />
      ) : failure && !alert ? (
        <>
          <AppAlert tone="error" message={failureMessage(failure, t)} />
          <AppButton label={t('retry')} onPress={() => void load()} />
        </>
      ) : alert && relationship ? (
        <>
          <AlertDetails
            alert={alert}
            relationshipLabel={relationship.label}
            locale={localeFor(language)}
          />
          {actionFailure ? (
            <AppAlert
              tone="error"
              announce
              message={failureMessage(actionFailure, t)}
            />
          ) : null}
          {actionFailure === 'conflict' ? (
            <AppButton
              variant="secondary"
              label={t('caregiverAlertRefresh')}
              onPress={() => void load()}
            />
          ) : null}
          {showAcknowledge ? (
            <AppButton
              label={t('caregiverAlertAcknowledge')}
              accessibilityLabel={t('caregiverAlertAcknowledge')}
              loading={acknowledging}
              disabled={!online}
              onPress={() => void acknowledge()}
            />
          ) : null}
        </>
      ) : null}
    </AppScreen>
  );
}

function AlertDetails({
  alert,
  relationshipLabel,
  locale,
}: {
  alert: CaregiverAlert;
  relationshipLabel: string;
  locale: string;
}) {
  const { t } = useTranslation();
  const timestamps = [
    [t('caregiverAlertOccurredAt'), alert.occurredAt],
    [t('caregiverAlertAcknowledgedAt'), alert.acknowledgedAt],
    [t('caregiverAlertResolvedAt'), alert.resolvedAt],
    [t('caregiverAlertCancelledAt'), alert.cancelledAt],
  ] as const;
  return (
    <AppCard>
      <DetailField
        label={t('caregiverAlertsRelationshipLabel')}
        value={relationshipLabel}
      />
      <DetailField
        label={t('caregiverAlertTypeLabel')}
        value={t(`caregiverAlertType_${alert.alertType}`)}
      />
      <DetailField
        label={t('caregiverAlertWorkflowPriority')}
        value={t(`caregiverAlertSeverity_${alert.severity}`)}
      />
      <DetailField
        label={t('caregiverAlertSourceLabel')}
        value={t(`caregiverAlertSource_${alert.sourceType}`)}
      />
      <DetailField
        label={t('caregiverAlertStateLabel')}
        value={t(`caregiverAlertState_${alert.state}`)}
      />
      {timestamps.map(([label, value]) =>
        value ? (
          <DetailField
            key={label}
            label={label}
            value={formatTime(
              value,
              locale,
              t('caregiverAlertTimeUnavailable'),
            )}
          />
        ) : null,
      )}
    </AppCard>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <AppText accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="label">{label}: </AppText>
      {value}
    </AppText>
  );
}

function formatTime(value: string, locale: string, fallback: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? fallback
    : new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(parsed);
}

function failureMessage(
  failure: CaregiverAlertFailure,
  t: ReturnType<typeof useTranslation>['t'],
): string {
  if (failure === 'conflict') return t('caregiverAlertConflict');
  if (failure === 'rate-limited') return t('caregiverAlertRateLimited');
  return t('caregiverAlertDetailFailure');
}
