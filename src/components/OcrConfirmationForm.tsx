import { useState } from 'react';
import {
  AppAlert,
  AppButton,
  AppCard,
  AppText,
  AppTextInput,
} from '@/components/primitives';
import type { OcrCandidate } from '@/types/medication';

type Props = {
  candidate: OcrCandidate | null;
  onConfirm(candidate: OcrCandidate): Promise<void> | void;
  onReject(): Promise<void> | void;
  onNone(): Promise<void> | void;
  onRetry(): Promise<void> | void;
  onManual(): Promise<void> | void;
};
export function OcrConfirmationForm({
  candidate,
  onConfirm,
  onReject,
  onNone,
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
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [selection, setSelection] = useState(candidate);
  const run = async (operation: () => Promise<void> | void) => {
    if (working) return;
    setWorking(true);
    setError('');
    try {
      await operation();
    } catch {
      setError('Your decision could not be saved. Please try again.');
    } finally {
      setWorking(false);
    }
  };
  if (!candidate)
    return (
      <>
        <AppAlert message="OCR backend integration is pending. No image or text was uploaded automatically." />
        <AppButton label="Enter medicine manually" onPress={onManual} />
        <AppButton variant="secondary" label="Retry scan" onPress={onRetry} />
      </>
    );
  const selected = selection ?? candidate;
  const name = edits.source === selected ? edits.name : selected.name;
  const strength =
    edits.source === selected ? edits.strength : selected.strength;
  const dosageForm =
    edits.source === selected ? edits.dosageForm : selected.dosageForm;
  const update = (values: Partial<Omit<typeof edits, 'source'>>) =>
    setEdits({ source: selected, name, strength, dosageForm, ...values });
  const corrected = {
    ...selected,
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
      {error ? <AppAlert tone="error" message={error} /> : null}
      <AppCard>
        <AppText variant="label">
          Candidate status:{' '}
          {selected.sourceStatus === 'development_fixture'
            ? 'Development-only example'
            : 'Backend recognition candidate'}
        </AppText>
        {selected.confidence == null ? null : (
          <AppText>
            Confidence: {Math.round(selected.confidence * 100)}%
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
        {candidate.alternativeCandidates?.map((alternative) => (
          <AppButton
            key={alternative.candidateId}
            variant="secondary"
            label={`Review alternative: ${alternative.name}`}
            disabled={working}
            onPress={() => {
              const next = {
                ...candidate,
                candidateId: alternative.candidateId,
                name: alternative.name,
                strength: alternative.strength,
                dosageForm: alternative.dosageForm,
                confidence: alternative.confidence,
              };
              setSelection(next);
              setEdits({
                source: next,
                name: next.name,
                strength: next.strength,
                dosageForm: next.dosageForm,
              });
            }}
          />
        ))}
      </AppCard>
      <AppButton
        label="I verified this candidate"
        disabled={name.trim().length < 2}
        loading={working}
        onPress={() => run(() => onConfirm(corrected))}
      />
      <AppButton
        variant="secondary"
        label="Reject candidate"
        disabled={working}
        onPress={() => run(onReject)}
      />
      <AppButton
        variant="secondary"
        label="None of these"
        disabled={working}
        onPress={() => run(onNone)}
      />
      <AppButton
        variant="secondary"
        label="Retry scan"
        disabled={working}
        onPress={() => run(onRetry)}
      />
      <AppButton
        variant="secondary"
        label="Enter manually instead"
        disabled={working}
        onPress={() => run(onManual)}
      />
    </>
  );
}
