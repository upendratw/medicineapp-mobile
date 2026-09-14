import { usePreferences } from '@/state/PreferencesContext';
import { theme } from '@/theme/tokens';
export function useAppTheme() {
  const { accessibility } = usePreferences();
  const scale =
    accessibility.textSize === 'extra-large'
      ? 1.35
      : accessibility.textSize === 'large'
        ? 1.18
        : 1;
  const colors = accessibility.highContrast
    ? {
        ...theme.colors,
        background: '#FFFFFF',
        surface: '#FFFFFF',
        text: '#000000',
        mutedText: '#242424',
        primary: '#004C40',
        border: '#000000',
      }
    : theme.colors;
  return {
    ...theme,
    colors,
    typography: Object.fromEntries(
      Object.entries(theme.typography).map(([key, value]) => [
        key,
        Math.round(value * scale),
      ]),
    ) as Record<keyof typeof theme.typography, number>,
    touchTarget: accessibility.largerControls ? 60 : theme.touchTarget,
    reducedMotion: accessibility.reducedMotion,
  };
}
