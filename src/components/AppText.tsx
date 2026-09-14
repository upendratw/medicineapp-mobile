import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { theme } from '@/theme/tokens';

type Variant = 'body' | 'label' | 'title' | 'heading' | 'caption';

export function AppText({
  children,
  style,
  variant = 'body',
  ...props
}: PropsWithChildren<TextProps & { variant?: Variant }>) {
  return (
    <Text
      allowFontScaling
      style={[styles.base, styles[variant], style]}
      {...props}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: { color: theme.colors.text, lineHeight: 25 },
  body: { fontSize: theme.typography.body },
  label: { fontSize: theme.typography.label, fontWeight: '600' },
  title: {
    fontSize: theme.typography.title,
    fontWeight: '700',
    lineHeight: 36,
  },
  heading: {
    fontSize: theme.typography.heading,
    fontWeight: '700',
    lineHeight: 30,
  },
  caption: {
    fontSize: theme.typography.caption,
    color: theme.colors.mutedText,
    lineHeight: 20,
  },
});
