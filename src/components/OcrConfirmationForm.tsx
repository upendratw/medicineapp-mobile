import { useState } from 'react';
import {
  AppAlert,
  AppButton,
  AppCard,
  AppText,
  AppTextInput,
} from '@/components';
import type { OcrCandidate } from '@/types/medication';

type Props = {
  candidate: OcrCandidate | null;
  onConfirm(candidate: OcrCandidate): void;
  onReject(): void;
  onRetry(): void;
  onManual(): void;
};
export function OcrConfirmationForm({
  candidate,
  onConfirm,
  onReject,
  onRetry,
  onManual,
}: Props) {
  const [edits, setEdits] = useState<{
    source: OcrCandidate | null;
    name: string;
    strength: string;
    dosageForm: string;
  }>({
    source: candidate,
    name: candidate?.name ?? '',
    strength: candidate?.strength ?? '',
    dosageForm: candidate?.dosageForm ?? '',
  });
  if (!candidate)
    return (
      <>
        <AppAlert message="OCR backend integration is pending. No image or text was uploaded automatically." />
        <AppButton label="Enter medicine manually" onPress={onManual} />
        <AppButton variant="secondary" label="Retry scan" onPress={onRetry} />
      </>
    );
  const name = edits.source === candidate ? edits.name : candidate.name;
  const strength =
    edits.source === candidate ? edits.strength : candidate.strength;
  const dosageForm =
    edits.source === candidate ? edits.dosageForm : candidate.dosageForm;
  const update = (values: Partial<Omit<typeof edits, 'source'>>) =>
    setEdits({ source: candidate, name, strength, dosageForm, ...values });
  const corrected = {
    ...candidate,
    name: name.trim(),
    strength: strength.trim(),
    dosageForm: dosageForm.trim(),
  };
  return (
    <>
      <AppAlert
        tone="warning"
        message="Recognition can be incorrect. Verify the medicine name, strength, and form against the label or packaging."
      />
      <AppCard>
        <AppText variant="label">
          Candidate status:{' '}
          {candidate.sourceStatus === 'development_fixture'
            ? 'Development-only example'
            : 'Backend recognition candidate'}
        </AppText>
        {candidate.confidence == null ? null : (
          <AppText>
            Confidence: {Math.round(candidate.confidence * 100)}%
          </AppText>
        )}
        <AppTextInput
          label="Recognized medicine name"
          value={name}
          onChangeText={(value) => update({ name: value })}
          maxLength={120}
        />
        <AppTextInput
          label="Strength"
          value={strength}
          onChangeText={(value) => update({ strength: value })}
          maxLength={40}
        />
        <AppTextInput
          label="Dosage form"
          value={dosageForm}
          onChangeText={(value) => update({ dosageForm: value })}
          maxLength={60}
        />
        {candidate.alternatives.length ? (
          <AppText>
            Other candidates: {candidate.alternatives.join(', ')}
          </AppText>
        ) : null}
      </AppCard>
      <AppButton
        label="I verified this candidate"
        disabled={name.trim().length < 2}
        onPress={() => onConfirm(corrected)}
      />
      <AppButton
        variant="secondary"
        label="Reject candidate"
        onPress={onReject}
      />
      <AppButton variant="secondary" label="Retry scan" onPress={onRetry} />
      <AppButton
        variant="secondary"
        label="Enter manually instead"
        onPress={onManual}
      />
    </>
  );
}
