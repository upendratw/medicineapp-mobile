import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { theme } from '@/theme/tokens';

export function AppHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View accessibilityRole="header" style={styles.header}>
      <AppText variant="title">{title}</AppText>
      {subtitle ? <AppText style={styles.subtitle}>{subtitle}</AppText> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  header: { gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  subtitle: { color: theme.colors.mutedText },
});
