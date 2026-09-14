import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccessibilityInfo } from 'react-native';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export const PREFERENCES_KEY = 'medicineapp.preferences.v1';
export type TextSize = 'default' | 'large' | 'extra-large';
export type AppLanguage = 'en-IN' | 'hi-IN';
export type AccessibilityPreferences = Readonly<{
  textSize: TextSize;
  highContrast: boolean;
  reducedMotion: boolean;
  largerControls: boolean;
  screenReaderHelp: boolean;
  reminderEmphasis: boolean;
  haptics: boolean;
}>;
export type Preferences = Readonly<{
  language: AppLanguage;
  accessibility: AccessibilityPreferences;
}>;
export const defaultPreferences: Preferences = Object.freeze({
  language: 'en-IN',
  accessibility: Object.freeze({
    textSize: 'default',
    highContrast: false,
    reducedMotion: false,
    largerControls: false,
    screenReaderHelp: false,
    reminderEmphasis: false,
    haptics: false,
  }),
});

function parsePreferences(raw: string | null): Preferences {
  if (!raw) return defaultPreferences;
  try {
    const value = JSON.parse(raw) as Partial<Preferences>;
    const candidate: Partial<AccessibilityPreferences> =
      value.accessibility ?? {};
    const textSize = ['default', 'large', 'extra-large'].includes(
      candidate.textSize ?? '',
    )
      ? candidate.textSize!
      : 'default';
    const booleanKeys = [
      'highContrast',
      'reducedMotion',
      'largerControls',
      'screenReaderHelp',
      'reminderEmphasis',
      'haptics',
    ] as const;
    const booleans = Object.fromEntries(
      booleanKeys
        .filter((key) => typeof candidate[key] === 'boolean')
        .map((key) => [key, candidate[key]]),
    );
    return {
      language: value.language === 'hi-IN' ? 'hi-IN' : 'en-IN',
      accessibility: {
        ...defaultPreferences.accessibility,
        ...booleans,
        textSize,
      },
    };
  } catch {
    return defaultPreferences;
  }
}
type PreferencesValue = Preferences & {
  loaded: boolean;
  setLanguage(value: AppLanguage): Promise<void>;
  updateAccessibility(value: Partial<AccessibilityPreferences>): Promise<void>;
};
const PreferencesContext = createContext<PreferencesValue>({
  ...defaultPreferences,
  loaded: true,
  async setLanguage() {},
  async updateAccessibility() {},
});

export function PreferencesProvider({ children }: PropsWithChildren) {
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [loaded, setLoaded] = useState(false);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(PREFERENCES_KEY)
      .then((raw) => setPreferences(parsePreferences(raw)))
      .catch(() => setPreferences(defaultPreferences))
      .finally(() => setLoaded(true));
  }, []);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setSystemReducedMotion);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setSystemReducedMotion,
    );
    return () => subscription.remove();
  }, []);
  const persist = useCallback(async (next: Preferences) => {
    await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(next));
    setPreferences(next);
  }, []);
  const setLanguage = useCallback(
    (language: AppLanguage) => persist({ ...preferences, language }),
    [persist, preferences],
  );
  const updateAccessibility = useCallback(
    (value: Partial<AccessibilityPreferences>) =>
      persist({
        ...preferences,
        accessibility: { ...preferences.accessibility, ...value },
      }),
    [persist, preferences],
  );
  const context = useMemo(
    () => ({
      ...preferences,
      accessibility: {
        ...preferences.accessibility,
        reducedMotion:
          preferences.accessibility.reducedMotion || systemReducedMotion,
      },
      loaded,
      setLanguage,
      updateAccessibility,
    }),
    [
      loaded,
      preferences,
      setLanguage,
      systemReducedMotion,
      updateAccessibility,
    ],
  );
  return (
    <PreferencesContext.Provider value={context}>
      {children}
    </PreferencesContext.Provider>
  );
}
export function usePreferences(): PreferencesValue {
  return useContext(PreferencesContext);
}
export const restorePreferences = parsePreferences;
