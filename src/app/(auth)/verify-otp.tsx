import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import {
  AppAlert,
  AppButton,
  AppHeader,
  AppScreen,
  AppText,
  AppTextInput,
} from '@/components';
import { useAuth } from '@/state/AuthContext';
import { isValidOtp } from '@/utils/phone';

export default function VerifyOtpScreen() {
  const router = useRouter();
  const { pendingChallenge, requestOtp, verifyOtp } = useAuth();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(30);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  useEffect(() => {
    if (!pendingChallenge) router.replace('/login');
  }, [pendingChallenge, router]);
  const submit = async () => {
    if (!isValidOtp(otp)) {
      setError('Enter the 4 to 8 digit verification code.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await verifyOtp(otp);
    } catch {
      setError(
        'The verification code could not be confirmed. Request a new code or try again.',
      );
    } finally {
      setLoading(false);
    }
  };
  const resend = async () => {
    if (!pendingChallenge || cooldown > 0) return;
    setLoading(true);
    setError('');
    try {
      await requestOtp(pendingChallenge.phone);
      setCooldown(30);
    } catch {
      setError('A new verification code could not be sent. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <AppScreen>
      <AppHeader
        title="Verify your number"
        subtitle="Enter the one-time code sent to your mobile number."
      />
      {error ? <AppAlert tone="error" message={error} /> : null}
      <AppTextInput
        label="Verification code"
        accessibilityLabel="One-time verification code"
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        maxLength={8}
        secureTextEntry
      />
      <AppButton
        label="Verify and continue"
        loading={loading}
        onPress={submit}
      />
      <AppButton
        variant="secondary"
        label={
          cooldown > 0
            ? `Resend available in ${cooldown} seconds`
            : 'Resend code'
        }
        disabled={cooldown > 0}
        onPress={resend}
      />
      <AppText variant="caption">
        For your security, MedicineApp never displays or stores the verification
        code.
      </AppText>
    </AppScreen>
  );
}
