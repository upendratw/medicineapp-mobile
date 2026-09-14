import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { theme } from '@/theme/tokens';

type Tone = 'error' | 'success' | 'warning' | 'info';
const symbols: Record<Tone, string> = {
  error: 'Error:',
  success: 'Success:',
  warning: 'Warning:',
  info: 'Information:',
};
export function AppAlert({
  message,
  tone = 'info',
}: {
  message: string;
  tone?: Tone;
}) {
  return (
    <View
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      style={[styles.base, styles[tone]]}
    >
      <AppText>
        <AppText variant="label">{symbols[tone]} </AppText>
        {message}
      </AppText>
    </View>
  );
}
export const InlineMessage = AppAlert;
const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  error: {
    backgroundColor: theme.colors.errorSurface,
    borderColor: theme.colors.error,
  },
  success: {
    backgroundColor: theme.colors.successSurface,
    borderColor: theme.colors.success,
  },
  warning: {
    backgroundColor: theme.colors.warningSurface,
    borderColor: theme.colors.warning,
  },
  info: {
    backgroundColor: theme.colors.infoSurface,
    borderColor: theme.colors.info,
  },
});
