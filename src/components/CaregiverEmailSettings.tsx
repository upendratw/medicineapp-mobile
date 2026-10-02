import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { ApiError } from '@/api/client';
import { AppAlert } from '@/components/AppAlert';
import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { AppTextInput } from '@/components/AppTextInput';
import { useTranslation } from '@/localization';
import {
  caregiverEmailService,
  type CaregiverEmailService,
  type CaregiverEmailState,
  type VerificationRequestResult,
} from '@/services/caregiverEmailService';
import { theme } from '@/theme/tokens';

const EMPTY: CaregiverEmailState = {
  state: 'none',
  identityId: null,
  challengeId: null,
  maskedEmail: null,
  verifiedAt: null,
};

export function CaregiverEmailSettings({
  service = caregiverEmailService,
}: {
  service?: CaregiverEmailService;
}) {
  const { t } = useTranslation();
  const [state, setState] = useState<CaregiverEmailState>(EMPTY);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    void service
      .status()
      .then(setState)
      .catch(() => setError(t('caregiverEmailLoadFailed')))
      .finally(() => setLoading(false));
  }, [service, t]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1_000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const applyRequest = useCallback((result: VerificationRequestResult) => {
    setState({
      state: 'pending',
      identityId: result.identityId,
      challengeId: result.challengeId,
      maskedEmail: result.maskedEmail,
      verifiedAt: null,
    });
    setCooldown(result.resendAfterSeconds);
    setEmail('');
    setCode('');
    setEditing(false);
  }, []);

  const requestCode = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      applyRequest(await service.request(email.trim()));
    } catch (caught) {
      if (
        caught instanceof ApiError &&
        caught.code === 'EMAIL_ALREADY_VERIFIED'
      ) {
        setState(await service.status());
        setEditing(false);
        return;
      }
      setError(errorMessage(caught, t));
    } finally {
      setLoading(false);
    }
  }, [applyRequest, email, service, t]);

  const resend = useCallback(async () => {
    if (!state.identityId) return;
    setLoading(true);
    setError(null);
    try {
      applyRequest(await service.resend(state.identityId));
    } catch (caught) {
      setError(errorMessage(caught, t));
    } finally {
      setLoading(false);
    }
  }, [applyRequest, service, state.identityId, t]);

  const confirm = useCallback(async () => {
    if (!state.challengeId) return;
    setLoading(true);
    setError(null);
    try {
      setState(await service.confirm(state.challengeId, code));
      setCode('');
    } catch (caught) {
      setError(errorMessage(caught, t));
    } finally {
      setLoading(false);
    }
  }, [code, service, state.challengeId, t]);

  const showEmailEntry = state.state === 'none' || editing;
  return (
    <View style={{ gap: theme.spacing.md }}>
      <AppText variant="heading">{t('caregiverEmailTitle')}</AppText>
      <AppText>{t('caregiverEmailHelp')}</AppText>
      {error ? <AppAlert tone="error" announce message={error} /> : null}
      {state.state === 'verified' && !editing ? (
        <>
          <AppAlert
            tone="success"
            message={`${t('caregiverEmailVerified')}: ${state.maskedEmail ?? ''}`}
          />
          <AppButton
            variant="secondary"
            label={t('caregiverEmailReplace')}
            onPress={() => setEditing(true)}
          />
        </>
      ) : null}
      {state.state === 'pending' && !editing ? (
        <>
          <AppAlert
            message={`${t('caregiverEmailPending')}: ${state.maskedEmail ?? ''}`}
          />
          <AppTextInput
            label={t('caregiverEmailCode')}
            accessibilityLabel={t('caregiverEmailCode')}
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="one-time-code"
            value={code}
            onChangeText={(value) =>
              setCode(value.replace(/\D/g, '').slice(0, 6))
            }
          />
          <AppButton
            label={t('caregiverEmailVerify')}
            disabled={code.length !== 6 || !state.challengeId}
            loading={loading}
            onPress={confirm}
          />
          <AppButton
            variant="secondary"
            label={
              cooldown > 0
                ? `${t('caregiverEmailResend')} (${cooldown})`
                : t('caregiverEmailResend')
            }
            disabled={cooldown > 0}
            loading={loading}
            onPress={resend}
          />
          <AppButton
            variant="secondary"
            label={t('caregiverEmailUseDifferent')}
            onPress={() => setEditing(true)}
          />
        </>
      ) : null}
      {showEmailEntry ? (
        <>
          <AppTextInput
            label={t('caregiverEmailAddress')}
            accessibilityLabel={t('caregiverEmailAddress')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            maxLength={320}
            value={email}
            onChangeText={setEmail}
          />
          <AppButton
            label={t('caregiverEmailRequest')}
            disabled={!email.includes('@')}
            loading={loading}
            onPress={requestCode}
          />
        </>
      ) : null}
      {loading && state === EMPTY ? <AppText>{t('loading')}</AppText> : null}
    </View>
  );
}

function errorMessage(
  caught: unknown,
  t: ReturnType<typeof useTranslation>['t'],
): string {
  if (caught instanceof ApiError) {
    if (caught.code === 'EMAIL_VERIFICATION_COOLDOWN')
      return t('caregiverEmailCooldown');
    if (caught.code === 'EMAIL_VERIFICATION_INVALID')
      return t('caregiverEmailInvalidCode');
    if (caught.code === 'EMAIL_VERIFICATION_EXPIRED')
      return t('caregiverEmailExpired');
    if (caught.code === 'EMAIL_VERIFICATION_EXHAUSTED')
      return t('caregiverEmailExhausted');
    if (caught.code === 'EMAIL_VERIFICATION_UNAVAILABLE')
      return t('caregiverEmailUnavailable');
  }
  return t('caregiverEmailActionFailed');
}
