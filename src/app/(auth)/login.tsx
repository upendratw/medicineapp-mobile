import { useRouter } from 'expo-router';
import { useState } from 'react';

import {
  AppAlert,
  AppButton,
  AppHeader,
  AppScreen,
  AppText,
  AppTextInput,
} from '@/components';
import { publicEnvironment } from '@/config/environment';
import { useAuth } from '@/state/AuthContext';
import { normalizeIndianPhone } from '@/utils/phone';
import { useTranslation } from '@/localization';

export default function LoginScreen() {
  const router = useRouter();
  const { requestOtp } = useAuth();
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    const normalized = normalizeIndianPhone(phone);
    if (!normalized) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await requestOtp(normalized);
      router.push('/verify-otp');
    } catch {
      setError('We could not send the verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <AppScreen>
      <AppHeader
        title={t('signIn')}
        subtitle="Use your mobile number to receive a one-time verification code."
      />
      <AppTextInput
        label={t('mobileNumber')}
        accessibilityLabel="Indian mobile number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
        placeholder="98765 43210"
        error={error || undefined}
        maxLength={14}
      />
      <AppButton label={t('sendCode')} loading={loading} onPress={submit} />
      {publicEnvironment.developerDiagnostics ? (
        <AppAlert message="Development diagnostics are enabled. Verification codes are never displayed here." />
      ) : null}
      <AppText variant="caption">
        India country code +91 is applied automatically. Standard carrier
        charges may apply.
      </AppText>
    </AppScreen>
  );
}
