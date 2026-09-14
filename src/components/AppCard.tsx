import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { theme } from '@/theme/tokens';

export function AppCard({
  children,
  style,
  ...props
}: PropsWithChildren<ViewProps>) {
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
});
