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

const COMPLETION_KEY = 'medicineapp.onboarding.complete';
type OnboardingValue = {
  restoring: boolean;
  complete: boolean;
  roleContext: 'self' | 'caregiver' | null;
  setRoleContext(value: 'self' | 'caregiver'): void;
  finish(): Promise<void>;
  reset(): Promise<void>;
};
const OnboardingContext = createContext<OnboardingValue | null>(null);

export function OnboardingProvider({ children }: PropsWithChildren) {
  const [restoring, setRestoring] = useState(true);
  const [complete, setComplete] = useState(false);
  const [roleContext, setRoleContext] = useState<'self' | 'caregiver' | null>(
    null,
  );
  useEffect(() => {
    AsyncStorage.getItem(COMPLETION_KEY)
      .then((value) => setComplete(value === 'true'))
      .finally(() => setRestoring(false));
  }, []);
  const finish = useCallback(async () => {
    await AsyncStorage.setItem(COMPLETION_KEY, 'true');
    setComplete(true);
  }, []);
  const reset = useCallback(async () => {
    await AsyncStorage.removeItem(COMPLETION_KEY);
    setRoleContext(null);
    setComplete(false);
  }, []);
  const value = useMemo(
    () => ({ restoring, complete, roleContext, setRoleContext, finish, reset }),
    [restoring, complete, roleContext, finish, reset],
  );
  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingValue {
  const value = useContext(OnboardingContext);
  if (!value)
    throw new Error('useOnboarding must be used inside OnboardingProvider');
  return value;
}
