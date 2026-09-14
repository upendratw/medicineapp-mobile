import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { theme } from '@/theme/tokens';
export function EmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <View style={styles.container}>
      <AppText variant="heading">{title}</AppText>
      <AppText>{message}</AppText>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
});
