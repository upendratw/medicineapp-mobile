import { AppCard, AppText } from '@/components/primitives';
export function StatusCard({
  label,
  value,
  statusText,
}: {
  label: string;
  value: string;
  statusText: string;
}) {
  return (
    <AppCard
      accessible
      accessibilityLabel={`${label}: ${value}. ${statusText}`}
    >
      <AppText variant="caption">{label}</AppText>
      <AppText variant="heading">{value}</AppText>
      <AppText>{statusText}</AppText>
    </AppCard>
  );
}
