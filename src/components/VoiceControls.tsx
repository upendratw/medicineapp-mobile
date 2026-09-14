import { useState } from 'react';
import {
  AppAlert,
  AppButton,
  AppCard,
  AppText,
  AppTextInput,
  SafetyConfirmation,
} from '@/components';
import type { VoiceIntent } from '@/services/highRiskServices';
export function VoiceControls({
  resolve,
  navigate,
  simulationEnabled,
}: {
  resolve(text: string): VoiceIntent;
  navigate(route: string): void;
  simulationEnabled: boolean;
}) {
  const [text, setText] = useState('');
  const [intent, setIntent] = useState<VoiceIntent | null>(null);
  const review = () => setIntent(resolve(text));
  if (!simulationEnabled)
    return (
      <AppAlert
        tone="warning"
        message="Voice recognition is not available. Use the on-screen navigation controls."
      />
    );
  if (intent?.kind === 'CONFIRM_REQUIRED')
    return (
      <SafetyConfirmation
        action={intent.description}
        target="Recognized voice request"
        consequence="This only opens the next screen. A medication or emergency action still requires its own confirmation."
        onCancel={() => {
          setIntent(null);
          setText('');
        }}
        onConfirm={() => {
          if (intent.action === 'OPEN_SOS') navigate('/sos');
          setIntent(null);
          setText('');
        }}
      />
    );
  return (
    <>
      <AppAlert message="Voice recognition is not connected. Recognition output is untrusted and never executes medication or emergency actions automatically." />
      <AppTextInput
        label="Development transcription preview"
        value={text}
        onChangeText={setText}
        maxLength={300}
      />
      {text ? (
        <AppCard>
          <AppText>You said: {text}</AppText>
        </AppCard>
      ) : null}
      <AppButton label="Review voice command" onPress={review} />
      {intent?.kind === 'NAVIGATE' ? (
        <>
          <AppText>Navigation command recognized.</AppText>
          <AppButton
            label="Open requested screen"
            onPress={() => navigate(intent.route)}
          />
        </>
      ) : null}
      {intent?.kind === 'BLOCKED_CLINICAL' ? (
        <AppAlert
          tone="warning"
          message="Clinical and medication-change requests cannot be performed by voice."
        />
      ) : null}
      {intent?.kind === 'UNKNOWN' ? (
        <AppAlert message="Command not recognized. Retry or use manual navigation." />
      ) : null}
    </>
  );
}
