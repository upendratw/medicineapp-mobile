import { useEffect, useRef, useState } from 'react';
import { RefreshControl } from 'react-native';

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
import {
  classifyCaregiverAlertFailure,
  type CaregiverAlertFailure,
  type CaregiverAlertService,
} from '@/services/caregiverAlertService';
import type {
  CaregiverAlert,
  CaregiverAlertRelationship,
} from '@/types/caregiverAlert';

const PAGE_SIZE = 50;

type Props = {
  service: CaregiverAlertService;
  online: boolean;
  focusVersion: number;
  onBack(): void;
};

export function CaregiverAlertInbox({
  service,
  online,
  focusVersion,
  onBack,
}: Props) {
  const { language, t } = useTranslation();
  const [relationships, setRelationships] = useState<
    readonly CaregiverAlertRelationship[] | null
  >(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [items, setItems] = useState<readonly CaregiverAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [failure, setFailure] = useState<CaregiverAlertFailure | null>(null);
  const requestVersion = useRef(0);

  const loadPage = async (
    relationshipId: string,
    offset: number,
    replace: boolean,
    version: number,
  ) => {
    const page = await service.listAlerts(relationshipId, {
      limit: PAGE_SIZE,
      offset,
    });
    if (requestVersion.current !== version) return;
    setItems((current) =>
      deduplicate(replace ? page.items : [...current, ...page.items]),
    );
    setHasMore(page.items.length === PAGE_SIZE);
    setFailure(null);
  };

  const refresh = async () => {
    if (!online) return;
    const version = ++requestVersion.current;
    setLoading(true);
    setRefreshing(true);
    setFailure(null);
    try {
      const eligible = await service.listEligibleRelationships();
      if (requestVersion.current !== version) return;
      setRelationships(eligible);
      const nextSelected = eligible.some(
        (item) => item.relationshipId === selected,
      )
        ? selected
        : eligible.length === 1
          ? eligible[0].relationshipId
          : null;
      setSelected(nextSelected);
      setItems([]);
      setHasMore(false);
      if (nextSelected) await loadPage(nextSelected, 0, true, version);
    } catch (error) {
      if (requestVersion.current === version)
        setFailure(classifyCaregiverAlertFailure(error));
    } finally {
      if (requestVersion.current === version) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    if (focusVersion < 1) return;
    if (!online) return;
    void Promise.resolve().then(refresh);
    // Focus changes are the sole automatic refresh trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusVersion]);

  const selectRelationship = async (relationshipId: string) => {
    const version = ++requestVersion.current;
    setSelected(relationshipId);
    setItems([]);
    setHasMore(false);
    setFailure(null);
    if (!online) return;
    setLoading(true);
    try {
      await loadPage(relationshipId, 0, true, version);
    } catch (error) {
      if (requestVersion.current === version)
        setFailure(classifyCaregiverAlertFailure(error));
    } finally {
      if (requestVersion.current === version) setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!selected || !hasMore || loadingMore || !online) return;
    const version = requestVersion.current;
    setLoadingMore(true);
    try {
      await loadPage(selected, items.length, false, version);
    } catch (error) {
      if (requestVersion.current === version)
        setFailure(classifyCaregiverAlertFailure(error));
    } finally {
      if (requestVersion.current === version) setLoadingMore(false);
    }
  };

  const relationshipLabel =
    relationships?.find((item) => item.relationshipId === selected)?.label ??
    t('caregiverAlertFamilyMember');

  return (
    <AppScreen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void refresh()}
          enabled={online}
        />
      }
    >
      <AppHeader
        title={t('caregiverAlertsTitle')}
        subtitle={t('caregiverAlertsSubtitle')}
      />
      <AppButton
        variant="secondary"
        label={t('caregiverAlertsBack')}
        onPress={onBack}
      />
      {!online ? (
        <AppAlert tone="warning" message={t('caregiverAlertsOffline')} />
      ) : null}
      {loading && relationships === null ? (
        <LoadingIndicator label={t('caregiverAlertsLoading')} />
      ) : failure === 'access' ? (
        <EmptyState
          title={t('caregiverAlertAccessUnavailable')}
          message={t('caregiverAlertAccessUnavailableMessage')}
        />
      ) : failure === 'temporary' && !items.length ? (
        <>
          <AppAlert tone="error" message={t('caregiverAlertsFailure')} />
          <AppButton label={t('retry')} onPress={() => void refresh()} />
        </>
      ) : relationships?.length === 0 ? (
        <EmptyState
          title={t('caregiverAlertAccessUnavailable')}
          message={t('caregiverAlertAccessUnavailableMessage')}
        />
      ) : relationships && relationships.length > 1 && !selected ? (
        <RelationshipSelector
          relationships={relationships}
          selected={selected}
          onSelect={(id) => void selectRelationship(id)}
        />
      ) : selected && !items.length && !loading ? (
        <>
          {relationships && relationships.length > 1 ? (
            <RelationshipSelector
              relationships={relationships}
              selected={selected}
              onSelect={(id) => void selectRelationship(id)}
            />
          ) : null}
          <EmptyState
            title={t('caregiverAlertsEmpty')}
            message={t('caregiverAlertsEmptyMessage')}
          />
        </>
      ) : !online && relationships === null ? (
        <EmptyState
          title={t('caregiverAlertsOfflineTitle')}
          message={t('caregiverAlertsOffline')}
        />
      ) : (
        <>
          {relationships && relationships.length > 1 ? (
            <RelationshipSelector
              relationships={relationships}
              selected={selected}
              onSelect={(id) => void selectRelationship(id)}
            />
          ) : null}
          {loading && !items.length ? (
            <LoadingIndicator label={t('caregiverAlertsLoading')} />
          ) : null}
          {items.map((item) => (
            <AlertRow
              key={item.alertId}
              item={item}
              relationshipLabel={relationshipLabel}
              locale={localeFor(language)}
            />
          ))}
          {failure === 'temporary' ? (
            <AppAlert tone="error" message={t('caregiverAlertsFailure')} />
          ) : null}
          {hasMore ? (
            <AppButton
              variant="secondary"
              label={t('caregiverAlertsLoadMore')}
              loading={loadingMore}
              onPress={() => void loadMore()}
            />
          ) : null}
        </>
      )}
    </AppScreen>
  );
}

function RelationshipSelector({
  relationships,
  selected,
  onSelect,
}: {
  relationships: readonly CaregiverAlertRelationship[];
  selected: string | null;
  onSelect(id: string): void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <AppText variant="heading">
        {t('caregiverAlertsChooseRelationship')}
      </AppText>
      {relationships.map((relationship) => (
        <AppButton
          key={relationship.relationshipId}
          variant={
            selected === relationship.relationshipId ? 'primary' : 'secondary'
          }
          label={relationship.label}
          accessibilityLabel={`${t('caregiverAlertsRelationshipLabel')}: ${relationship.label}`}
          onPress={() => onSelect(relationship.relationshipId)}
        />
      ))}
    </>
  );
}

function AlertRow({
  item,
  relationshipLabel,
  locale,
}: {
  item: CaregiverAlert;
  relationshipLabel: string;
  locale: string;
}) {
  const { t } = useTranslation();
  const alertType = t(`caregiverAlertType_${item.alertType}`);
  const priority = t(`caregiverAlertSeverity_${item.severity}`);
  const state = t(`caregiverAlertState_${item.state}`);
  const parsed = new Date(item.occurredAt);
  const occurredAt = Number.isNaN(parsed.getTime())
    ? t('caregiverAlertTimeUnavailable')
    : new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(parsed);
  const label = `${relationshipLabel}. ${alertType}. ${t('caregiverAlertWorkflowPriority')}: ${priority}. ${state}. ${occurredAt}`;
  return (
    <AppCard accessible accessibilityLabel={label}>
      <AppText variant="label">{relationshipLabel}</AppText>
      <AppText>{alertType}</AppText>
      <AppText>
        {t('caregiverAlertWorkflowPriority')}: {priority}
      </AppText>
      <AppText>{state}</AppText>
      <AppText variant="caption">{occurredAt}</AppText>
    </AppCard>
  );
}

function deduplicate(
  items: readonly CaregiverAlert[],
): readonly CaregiverAlert[] {
  return [...new Map(items.map((item) => [item.alertId, item])).values()];
}
