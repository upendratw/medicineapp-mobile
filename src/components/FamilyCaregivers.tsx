import { useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import { AppAlert } from '@/components/AppAlert';
import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppText } from '@/components/AppText';
import { AppTextInput } from '@/components/AppTextInput';
import { LoadingIndicator } from '@/components/LoadingIndicator';
import { useTranslation } from '@/localization';
import {
  caregiverPermissionOptions,
  type CaregiverInvitation,
  type CaregiverPermission,
  type CaregiverRelationship,
  type CaregiverRelationshipService,
} from '@/services/caregiverRelationshipService';
import type { AuthRole } from '@/services/authService';
import { normalizeIndianPhone } from '@/utils/phone';

type Props = {
  role: AuthRole;
  service: CaregiverRelationshipService;
  onAccepted?(): void;
};

export function FamilyCaregivers({ role, service, onAccepted }: Props) {
  const { t } = useTranslation();
  const loadError = t('familyLoadError');
  const [invitations, setInvitations] = useState<
    readonly CaregiverInvitation[]
  >([]);
  const [relationships, setRelationships] = useState<
    readonly CaregiverRelationship[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');
  const [permissions, setPermissions] = useState<CaregiverPermission[]>([]);

  const load = useCallback(
    () =>
      Promise.all([
        service.listInvitations(),
        role === 'patient' ? service.listRelationships() : Promise.resolve([]),
      ]),
    [role, service],
  );

  const refresh = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const [nextInvitations, nextRelationships] = await load();
      setInvitations(nextInvitations);
      setRelationships(nextRelationships);
    } catch {
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, [load, loadError]);

  useEffect(() => {
    let active = true;
    void load().then(
      ([nextInvitations, nextRelationships]) => {
        if (!active) return;
        setInvitations(nextInvitations);
        setRelationships(nextRelationships);
        setLoading(false);
      },
      () => {
        if (!active) return;
        setError(loadError);
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [load, loadError]);

  const run = async (action: () => Promise<void>, accepted = false) => {
    setError('');
    setWorking(true);
    try {
      await action();
      await refresh();
      if (accepted) onAccepted?.();
    } catch {
      setError(t('familyActionError'));
    } finally {
      setWorking(false);
    }
  };

  const invite = async () => {
    const normalized = normalizeIndianPhone(phone);
    if (!normalized) {
      setError(t('familyPhoneError'));
      return;
    }
    if (!permissions.length) {
      setError(t('familyPermissionError'));
      return;
    }
    await run(async () => {
      await service.invite(normalized, permissions);
      setPhone('');
      setPermissions([]);
    });
  };

  if (loading) return <LoadingIndicator label={t('familyLoading')} />;
  const pending = invitations.filter((item) => item.status === 'pending');

  if (role === 'caregiver') {
    return (
      <View accessibilityRole="summary">
        {error ? <AppAlert tone="error" message={error} /> : null}
        <AppText variant="heading">{t('familyPendingInvitations')}</AppText>
        {!pending.length ? (
          <AppText>{t('familyNoPendingInvitations')}</AppText>
        ) : null}
        {pending.map((invitation) => (
          <AppCard key={invitation.invitationId}>
            <AppText variant="heading">{invitation.patientDisplayName}</AppText>
            <PermissionSummary permissions={invitation.permissions} />
            <AppButton
              label={t('familyAccept')}
              loading={working}
              onPress={() =>
                void run(() => service.accept(invitation.invitationId), true)
              }
            />
            <AppButton
              label={t('familyDecline')}
              variant="secondary"
              disabled={working}
              onPress={() =>
                void run(() => service.decline(invitation.invitationId))
              }
            />
          </AppCard>
        ))}
      </View>
    );
  }

  return (
    <View accessibilityRole="summary">
      {error ? <AppAlert tone="error" message={error} /> : null}
      <AppText variant="heading">{t('familyAuthorizedCaregivers')}</AppText>
      {!relationships.filter((item) => item.status === 'active').length ? (
        <AppText>{t('familyNoAuthorizedCaregivers')}</AppText>
      ) : null}
      {relationships
        .filter((item) => item.status === 'active')
        .map((relationship) => (
          <RelationshipCard
            key={relationship.relationshipId}
            relationship={relationship}
            service={service}
            working={working}
            run={run}
          />
        ))}

      <AppText variant="heading">{t('familyPendingInvitations')}</AppText>
      {!pending.length ? (
        <AppText>{t('familyNoPendingInvitations')}</AppText>
      ) : null}
      {pending.map((invitation) => (
        <AppCard key={invitation.invitationId}>
          <AppText>{invitation.destination}</AppText>
          <PermissionSummary permissions={invitation.permissions} />
          <AppText variant="caption">{t('familyPendingStatus')}</AppText>
        </AppCard>
      ))}

      <AppText variant="heading">{t('familyAddCaregiver')}</AppText>
      <AppText>{t('familySharingExplanation')}</AppText>
      <AppTextInput
        label={t('familyCaregiverPhone')}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
        maxLength={14}
        placeholder="98765 43210"
      />
      <PermissionSelector selected={permissions} onChange={setPermissions} />
      <AppButton
        label={t('familySendInvitation')}
        loading={working}
        onPress={() => void invite()}
      />
    </View>
  );
}

type RelationshipCardProps = {
  relationship: CaregiverRelationship;
  service: CaregiverRelationshipService;
  working: boolean;
  run(action: () => Promise<void>): Promise<void>;
};

function RelationshipCard({
  relationship,
  service,
  working,
  run,
}: RelationshipCardProps) {
  const { t } = useTranslation();
  const [permissions, setPermissions] = useState<CaregiverPermission[]>([
    ...relationship.permissions,
  ]);
  const [sharing, setSharing] = useState(relationship.sharingEnabled);
  const revoke = () =>
    Alert.alert(t('familyRevokeTitle'), t('familyRevokeMessage'), [
      { text: t('familyCancel'), style: 'cancel' },
      {
        text: t('familyRevoke'),
        style: 'destructive',
        onPress: () =>
          void run(() => service.revoke(relationship.relationshipId)),
      },
    ]);
  return (
    <AppCard>
      <AppText variant="heading">{relationship.caregiverDisplayName}</AppText>
      <AppButton
        label={sharing ? t('familySharingOn') : t('familySharingOff')}
        variant={sharing ? 'primary' : 'secondary'}
        accessibilityState={{ checked: sharing }}
        onPress={() => setSharing((value) => !value)}
      />
      <PermissionSelector selected={permissions} onChange={setPermissions} />
      <AppButton
        label={t('familySavePermissions')}
        loading={working}
        disabled={!permissions.length}
        onPress={() =>
          void run(() =>
            service.update(relationship.relationshipId, permissions, sharing),
          )
        }
      />
      <AppButton label={t('familyRevoke')} variant="danger" onPress={revoke} />
    </AppCard>
  );
}

function PermissionSelector({
  selected,
  onChange,
}: {
  selected: readonly CaregiverPermission[];
  onChange(value: CaregiverPermission[]): void;
}) {
  const { t } = useTranslation();
  const toggle = (permission: CaregiverPermission) =>
    onChange(
      selected.includes(permission)
        ? selected.filter((item) => item !== permission)
        : [...selected, permission],
    );
  return (
    <View accessibilityRole="radiogroup">
      {caregiverPermissionOptions.map((option) => {
        const checked = selected.includes(option.key);
        return (
          <AppButton
            key={option.key}
            label={`${t(option.labelKey)}: ${checked ? t('on') : t('off')}`}
            variant={checked ? 'primary' : 'secondary'}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            onPress={() => toggle(option.key)}
          />
        );
      })}
    </View>
  );
}

function PermissionSummary({
  permissions,
}: {
  permissions: readonly CaregiverPermission[];
}) {
  const { t } = useTranslation();
  return (
    <AppText variant="caption">
      {permissions.length
        ? permissions
            .map((permission) =>
              t(
                caregiverPermissionOptions.find(
                  (item) => item.key === permission,
                )?.labelKey ?? 'familyPermissionAlerts',
              ),
            )
            .join(', ')
        : t('familyNoPermissions')}
    </AppText>
  );
}
