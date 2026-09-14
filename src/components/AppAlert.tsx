import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { theme } from '@/theme/tokens';
import { useAppTheme } from '@/theme/useAppTheme';

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
  const activeTheme = useAppTheme();
  const surfaceKey = `${tone}Surface` as
    'errorSurface' | 'successSurface' | 'warningSurface' | 'infoSurface';
  return (
    <View
      accessible
      accessibilityRole={
        tone === 'error' || tone === 'warning' ? 'alert' : undefined
      }
      style={[
        styles.base,
        styles[tone],
        {
          backgroundColor: activeTheme.colors[surfaceKey],
          borderColor: activeTheme.colors[tone],
        },
      ]}
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
