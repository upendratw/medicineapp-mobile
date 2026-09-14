import { useState } from 'react';
import {
  AppAlert,
  AppButton,
  AppCard,
  AppText,
  EmptyState,
  LoadingIndicator,
  SafetyConfirmation,
} from '@/components';
import type { EmergencyContact } from '@/services/highRiskServices';
export function EmergencyHelp({
  contacts,
  loading,
  error,
  onCall,
}: {
  contacts: readonly EmergencyContact[];
  loading: boolean;
  error: boolean;
  onCall(phone: string): Promise<void>;
}) {
  const [selected, setSelected] = useState<EmergencyContact | null>(null);
  const [failed, setFailed] = useState(false);
  const [opened, setOpened] = useState(false);
  if (loading)
    return <LoadingIndicator label="Loading emergency help options" />;
  if (selected)
    return (
      <SafetyConfirmation
        action="Open the phone dialer"
        target={`${selected.name} (${selected.relationship})`}
        consequence="Your device will open the dialer. The call is not placed automatically."
        onCancel={() => setSelected(null)}
        onConfirm={async () => {
          try {
            await onCall(selected.phone);
            setOpened(true);
            setSelected(null);
          } catch {
            setFailed(true);
            setSelected(null);
          }
        }}
      />
    );
  return (
    <>
      <AppAlert
        tone="warning"
        message="MedicineApp is not an emergency medical service. No one has been contacted and no location or medical data has been shared."
      />
      {error ? (
        <AppAlert
          tone="error"
          message="Emergency contacts are temporarily unavailable."
        />
      ) : null}
      {failed ? (
        <AppAlert
          tone="error"
          message="The phone dialer could not be opened."
        />
      ) : null}
      {opened ? (
        <AppAlert
          tone="success"
          message="The phone dialer was opened after confirmation. MedicineApp has not confirmed that a call was placed or answered."
        />
      ) : null}
      {!contacts.length ? (
        <EmptyState
          title="No emergency contacts configured"
          message="Use your device phone app and a locally appropriate emergency number."
        />
      ) : (
        contacts.map((c) => (
          <AppCard key={c.id}>
            <AppText variant="heading">{c.name}</AppText>
            <AppText>{c.relationship}</AppText>
            <AppButton
              label={`Call ${c.name}`}
              onPress={() => setSelected(c)}
            />
          </AppCard>
        ))
      )}
      <AppAlert message="Caregiver emergency messaging is not available. No SMS or caregiver notification will be sent." />
    </>
  );
}
