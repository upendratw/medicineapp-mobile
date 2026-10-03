import { useRef, useState } from 'react';
import { View } from 'react-native';

import { AppAlert } from '@/components/AppAlert';
import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { AppTextInput } from '@/components/AppTextInput';
import { useTranslation } from '@/localization';
import type { PatientSymptomService } from '@/services/patientSymptomService';

type Props = {
  service: PatientSymptomService;
};

export function PatientSymptomReport({ service }: Props) {
  const { t } = useTranslation();
  const [symptomText, setSymptomText] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [working, setWorking] = useState(false);
  const workingRef = useRef(false);

  const submit = async () => {
    if (workingRef.current) return;
    if (!symptomText.trim()) {
      setError(t('symptomReportRequired'));
      setSuccess(false);
      return;
    }
    workingRef.current = true;
    setWorking(true);
    setError('');
    setSuccess(false);
    try {
      await service.report(symptomText);
      setSymptomText('');
      setSuccess(true);
    } catch {
      setError(t('symptomReportFailed'));
    } finally {
      workingRef.current = false;
      setWorking(false);
    }
  };

  return (
    <View accessibilityRole="summary">
      <AppText>{t('symptomReportHelp')}</AppText>
      <AppAlert message={t('privacySymptomDisclosure')} />
      {error ? <AppAlert tone="error" message={error} /> : null}
      {success ? (
        <AppAlert tone="success" message={t('symptomReportSaved')} />
      ) : null}
      <AppTextInput
        label={t('symptomReportLabel')}
        value={symptomText}
        onChangeText={(value) => {
          setSymptomText(value);
          setError('');
          setSuccess(false);
        }}
        multiline
        maxLength={500}
        autoCorrect={false}
        autoCapitalize="none"
        textAlignVertical="top"
        accessibilityHint={t('symptomReportHint')}
      />
      <AppText variant="caption">{symptomText.length}/500</AppText>
      <AppButton
        label={t('symptomReportAction')}
        loading={working}
        onPress={() => void submit()}
      />
    </View>
  );
}
