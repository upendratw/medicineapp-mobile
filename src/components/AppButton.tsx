import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
} from 'react-native';

import { AppText } from '@/components/AppText';
import { theme } from '@/theme/tokens';
import { useAppTheme } from '@/theme/useAppTheme';

type Props = PressableProps & {
  label: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
};

export function AppButton({
  label,
  loading = false,
  disabled,
  variant = 'primary',
  style,
  ...props
}: Props) {
  const activeTheme = useAppTheme();
  const unavailable = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? label}
      accessibilityState={{ disabled: unavailable, busy: loading }}
      disabled={unavailable}
      style={(state) => [
        styles.base,
        { minHeight: activeTheme.touchTarget },
        styles[variant],
        variant === 'primary' && {
          backgroundColor: activeTheme.colors.primary,
          borderColor: activeTheme.colors.primary,
        },
        variant === 'secondary' && {
          backgroundColor: activeTheme.colors.surface,
          borderColor: activeTheme.colors.primary,
        },
        variant === 'danger' && {
          backgroundColor: activeTheme.colors.errorSurface,
          borderColor: activeTheme.colors.error,
        },
        unavailable && styles.disabled,
        state.pressed && !unavailable && styles.pressed,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          accessibilityLabel="Loading"
          color={variant === 'primary' ? '#FFFFFF' : activeTheme.colors.primary}
        />
      ) : (
        <AppText
          variant="label"
          style={{
            color:
              variant === 'primary'
                ? '#FFFFFF'
                : variant === 'danger'
                  ? activeTheme.colors.error
                  : activeTheme.colors.primary,
          }}
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
  danger: {
    backgroundColor: theme.colors.errorSurface,
    borderColor: theme.colors.error,
  },
  disabled: {
    backgroundColor: theme.colors.disabled,
    borderColor: theme.colors.border,
    opacity: 0.75,
  },
  pressed: { transform: [{ scale: 0.99 }] },
});
