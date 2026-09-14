import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
} from 'react-native';

import { AppText } from '@/components/AppText';
import { theme } from '@/theme/tokens';

type Props = PressableProps & {
  label: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
};

export function AppButton({
  label,
  loading = false,
  disabled,
  variant = 'primary',
  style,
  ...props
}: Props) {
  const unavailable = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? label}
      accessibilityState={{ disabled: unavailable, busy: loading }}
      disabled={unavailable}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        unavailable && styles.disabled,
        pressed && !unavailable && styles.pressed,
        typeof style === 'function' ? style({ pressed }) : style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          accessibilityLabel="Loading"
          color={variant === 'primary' ? '#FFFFFF' : theme.colors.primary}
        />
      ) : (
        <AppText
          variant="label"
          style={
            variant === 'primary' ? styles.primaryText : styles.secondaryText
          }
        >
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: theme.touchTarget,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    borderWidth: 2,
  },
  primary: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.primary,
  },
  disabled: {
    backgroundColor: theme.colors.disabled,
    borderColor: theme.colors.border,
    opacity: 0.75,
  },
  pressed: { transform: [{ scale: 0.99 }] },
  primaryText: { color: '#FFFFFF' },
  secondaryText: { color: theme.colors.primary },
});
