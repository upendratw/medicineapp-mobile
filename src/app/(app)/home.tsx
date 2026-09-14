import {
  AppButton,
  AppCard,
  AppHeader,
  AppScreen,
  AppText,
  EmptyState,
} from '@/components';
import { useAuth } from '@/state/AuthContext';
import { useOnboarding } from '@/state/OnboardingContext';
export default function HomeScreen() {
  const { logout } = useAuth();
  const { reset } = useOnboarding();
  const signOut = async () => {
    await logout();
    await reset();
  };
  return (
    <AppScreen>
      <AppHeader
        title="MedicineApp"
        subtitle="Medication support designed for clarity and safety."
      />
      <AppCard>
        <EmptyState
          title="Your dashboard is ready"
          message="Medication features will be added in later E33 tasks."
        />
      </AppCard>
      <AppText variant="caption">
        MedicineApp does not diagnose, prescribe, or recommend changing
        medication or dosage.
      </AppText>
      <AppButton variant="secondary" label="Sign out" onPress={signOut} />
    </AppScreen>
  );
}
