import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const ACCESSIBILITY_KEY = 'medicineapp.preferences.accessibility';
export type AccessibilityPreference = 'system' | 'enhanced';
type PreferencesValue = {
  accessibility: AccessibilityPreference;
  setAccessibility(value: AccessibilityPreference): Promise<void>;
};
const PreferencesContext = createContext<PreferencesValue | null>(null);

export function PreferencesProvider({ children }: PropsWithChildren) {
  const [accessibility, setAccessibilityState] =
    useState<AccessibilityPreference>('system');
  useEffect(() => {
    AsyncStorage.getItem(ACCESSIBILITY_KEY).then((value) => {
      if (value === 'system' || value === 'enhanced')
        setAccessibilityState(value);
    });
  }, []);
  const setAccessibility = useCallback(
    async (value: AccessibilityPreference) => {
      await AsyncStorage.setItem(ACCESSIBILITY_KEY, value);
      setAccessibilityState(value);
    },
    [],
  );
  const context = useMemo(
    () => ({ accessibility, setAccessibility }),
    [accessibility, setAccessibility],
  );
  return (
    <PreferencesContext.Provider value={context}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesValue {
  const value = useContext(PreferencesContext);
  if (!value)
    throw new Error('usePreferences must be used inside PreferencesProvider');
  return value;
}
