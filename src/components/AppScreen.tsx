import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@/theme/tokens';
import { useAppTheme } from '@/theme/useAppTheme';

export function AppScreen({
  children,
  contentContainerStyle,
  ...props
}: PropsWithChildren<ScrollViewProps>) {
  const activeTheme = useAppTheme();
  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: activeTheme.colors.background }]}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, contentContainerStyle]}
        {...props}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: { flexGrow: 1, padding: theme.spacing.lg, gap: theme.spacing.md },
});
