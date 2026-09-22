import { AppAlert, AppButton } from '@/components/primitives';
import { useTranslation } from '@/localization';
import type { OcrRecognitionResult } from '@/types/medication';

type TerminalResult = Exclude<OcrRecognitionResult, { kind: 'review_ready' }>;

type Props = {
  result: TerminalResult;
  working: boolean;
  onRetake(): Promise<void> | void;
  onChooseAnother(): Promise<void> | void;
  onManual(): Promise<void> | void;
  onCancel(): Promise<void> | void;
};

export function OcrOutcomePanel({
  result,
  working,
  onRetake,
  onChooseAnother,
  onManual,
  onCancel,
}: Props) {
  const { t } = useTranslation();
  const message =
    result.kind === 'no_match'
      ? t('recognitionNoMatch')
      : result.kind === 'retake_required'
        ? t('recognitionRetake')
        : result.kind === 'expired'
          ? t('recognitionExpired')
          : t('recognitionFailedSafe');
  const qualityWarning = result.qualityReasons.some((reason) =>
    reason.toUpperCase().includes('BLUR'),
  );
  return (
    <>
      <AppAlert tone="warning" message={message} />
      {qualityWarning ? (
        <AppAlert message={t('recognitionQualityAdvisory')} />
      ) : null}
      <AppButton
        label={t('recognitionRetakeAction')}
        loading={working}
        onPress={onRetake}
      />
      <AppButton
        variant="secondary"
        label={t('recognitionChooseAnotherAction')}
        disabled={working}
        onPress={onChooseAnother}
      />
      <AppButton
        variant="secondary"
        label={t('recognitionManualAction')}
        disabled={working}
        onPress={onManual}
      />
      <AppButton
        variant="secondary"
        label={t('recognitionCancelAction')}
        disabled={working}
        onPress={onCancel}
      />
    </>
  );
}
