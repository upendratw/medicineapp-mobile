import { useState } from 'react';
import { AppAlert, AppButton, AppText, AppTextInput } from '@/components';
import type {
  SelfReportedSeverity,
  SymptomInput,
  SymptomResult,
} from '@/services/highRiskServices';
import { IntegrationPendingError } from '@/services/integration';
export function SymptomAssessment({
  submit,
}: {
  submit(input: SymptomInput): Promise<SymptomResult>;
}) {
  const [symptom, setSymptom] = useState('');
  const [description, setDescription] = useState('');
  const [timeframe, setTimeframe] = useState('');
  const [severity, setSeverity] = useState<SelfReportedSeverity | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [result, setResult] = useState<SymptomResult | null>(null);
  const send = async () => {
    if (symptom.trim().length < 2 || !severity) return;
    setLoading(true);
    setError(false);
    try {
      setPending(false);
      setResult(
        await submit({
          symptom: symptom.trim(),
          description: description.trim(),
          timeframe: timeframe.trim(),
          severity,
        }),
      );
    } catch (failure) {
      setPending(failure instanceof IntegrationPendingError);
      setError(!(failure instanceof IntegrationPendingError));
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <AppAlert message="MedicineApp cannot determine the cause of your symptoms. Contact a healthcare professional for medical advice." />
      <AppTextInput
        label="Symptom"
        value={symptom}
        onChangeText={setSymptom}
        maxLength={120}
      />
      <AppTextInput
        label="Description (optional)"
        value={description}
        onChangeText={setDescription}
        maxLength={500}
        multiline
      />
      <AppTextInput
        label="Timeframe (optional)"
        value={timeframe}
        onChangeText={setTimeframe}
        maxLength={80}
      />
      <AppText variant="label">Severity — self-reported only</AppText>
      {(['mild', 'moderate', 'severe'] as const).map((v) => (
        <AppButton
          key={v}
          variant={severity === v ? 'primary' : 'secondary'}
          label={`${v[0].toUpperCase() + v.slice(1)} — user-selected`}
          onPress={() => setSeverity(v)}
        />
      ))}
      <AppButton
        label="Submit for validated assessment"
        loading={loading}
        disabled={symptom.trim().length < 2 || !severity}
        onPress={send}
      />
      {pending ? (
        <AppAlert
          tone="warning"
          message="Validated symptom assessment is not available. No diagnosis or triage decision was made."
        />
      ) : null}
      {error ? (
        <AppAlert
          tone="error"
          message="Validated symptom information is temporarily unavailable. No diagnosis or triage decision was made."
        />
      ) : null}
      {result?.reviewed && result.emergency ? (
        <AppAlert
          tone="warning"
          message="The validated service recommends seeking urgent human help. Emergency services have not been contacted."
        />
      ) : null}
      {result?.reviewed ? (
        <AppAlert message={result.informationalGuidance} />
      ) : null}
    </>
  );
}
