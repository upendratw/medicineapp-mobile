import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { theme } from '@/theme/tokens';
import { useAppTheme } from '@/theme/useAppTheme';

export function AppHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const activeTheme = useAppTheme();
  return (
    <View accessibilityRole="header" style={styles.header}>
      <AppText variant="title">{title}</AppText>
      {subtitle ? (
        <AppText style={{ color: activeTheme.colors.mutedText }}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  header: { gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  subtitle: { color: theme.colors.mutedText },
});
