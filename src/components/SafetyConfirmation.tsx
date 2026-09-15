import { AppAlert, AppButton, AppText } from '@/components/primitives';
export function SafetyConfirmation({
  action,
  target,
  consequence,
  onCancel,
  onConfirm,
}: {
  action: string;
  target: string;
  consequence: string;
  onCancel(): void;
  onConfirm(): void;
}) {
  return (
    <>
      <AppAlert
        tone="warning"
        message="Confirm this action before anything happens."
      />
      <AppText variant="heading">{action}</AppText>
      <AppText>Target: {target}</AppText>
      <AppText>{consequence}</AppText>
      <AppButton label="Confirm action" onPress={onConfirm} />
      <AppButton variant="secondary" label="Cancel action" onPress={onCancel} />
    </>
  );
}
