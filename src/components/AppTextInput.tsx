import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { AppText } from '@/components/AppText';
import { theme } from '@/theme/tokens';
import { useAppTheme } from '@/theme/useAppTheme';

type Props = TextInputProps & { label: string; error?: string };

export function AppTextInput({ label, error, style, ...props }: Props) {
  const activeTheme = useAppTheme();
  const errorId = error ? `${props.nativeID ?? 'input'}-error` : undefined;
  return (
    <View style={styles.group}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        accessibilityLabel={props.accessibilityLabel ?? label}
        accessibilityHint={error}
        aria-describedby={errorId}
        allowFontScaling
        placeholderTextColor={activeTheme.colors.mutedText}
        style={[
          styles.input,
          {
            minHeight: activeTheme.touchTarget,
            borderColor: activeTheme.colors.border,
            backgroundColor: activeTheme.colors.surface,
            color: activeTheme.colors.text,
            fontSize: activeTheme.typography.body,
          },
          error && styles.inputError,
          style,
        ]}
        {...props}
      />
      {error ? (
        <AppText
          nativeID={errorId}
          accessibilityRole="alert"
          style={styles.error}
        >
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: theme.spacing.sm },
  input: {
    minHeight: theme.touchTarget,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    fontSize: theme.typography.body,
    paddingHorizontal: theme.spacing.md,
  },
  inputError: { borderColor: theme.colors.error },
  error: { color: theme.colors.error },
});
