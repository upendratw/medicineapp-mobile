import { useState } from 'react';
import {
  AppAlert,
  AppButton,
  AppCard,
  AppText,
  AppTextInput,
  EmptyState,
} from '@/components/primitives';
import type { PrescriptionCandidate } from '@/types/clinicalFeatures';

export function PrescriptionReview({
  candidates,
  onConfirm,
  onReject,
  onManual,
}: {
  candidates: readonly PrescriptionCandidate[];
  onConfirm(candidate: PrescriptionCandidate): void;
  onReject(): void;
  onManual(): void;
}) {
  const first = candidates[0];
  const [name, setName] = useState(first?.medicationName ?? '');
  if (!first)
    return (
      <>
        <EmptyState
          title="No extracted candidates"
          message="No prescription text has been accepted as medication data."
        />
        <AppButton label="Enter medicine manually" onPress={onManual} />
      </>
    );
  return (
    <>
      <AppAlert
        tone="warning"
        message="Review before saving. Extracted prescription text can be incorrect and is not a medication order until you confirm it."
      />
      <AppCard>
        <AppTextInput
          label="Extracted medication name"
          value={name}
          onChangeText={setName}
          maxLength={120}
        />
        <AppText>Strength: {first.strength || 'Not extracted'}</AppText>
        <AppText>Form: {first.dosageForm || 'Not extracted'}</AppText>
      </AppCard>
      <AppButton
        label="I reviewed this candidate"
        disabled={name.trim().length < 2}
        onPress={() => onConfirm({ ...first, medicationName: name.trim() })}
      />
      <AppButton
        variant="secondary"
        label="Reject extracted result"
        onPress={onReject}
      />
      <AppButton
        variant="secondary"
        label="Enter manually instead"
        onPress={onManual}
      />
    </>
  );
}
