import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';

type Variant = 'body' | 'label' | 'title' | 'heading' | 'caption';

export function AppText({
  children,
  style,
  variant = 'body',
  ...props
}: PropsWithChildren<TextProps & { variant?: Variant }>) {
  const theme = useAppTheme();
  return (
    <Text
      allowFontScaling
      style={[
        styles.base,
        styles[variant],
        {
          color: theme.colors.text,
          fontSize: theme.typography[variant],
          lineHeight: Math.round(theme.typography[variant] * 1.45),
        },
        variant === 'caption' && { color: theme.colors.mutedText },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: { lineHeight: 25, flexShrink: 1 },
  body: {},
  label: { fontWeight: '600' },
  title: {
    fontWeight: '700',
    lineHeight: 36,
  },
  heading: {
    fontWeight: '700',
    lineHeight: 30,
  },
  caption: {
    lineHeight: 20,
  },
});
