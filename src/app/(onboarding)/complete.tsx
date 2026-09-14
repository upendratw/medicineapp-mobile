import {
  AppAlert,
  AppButton,
  AppHeader,
  AppScreen,
  AppText,
} from '@/components';
import { useOnboarding } from '@/state/OnboardingContext';
export default function CompleteScreen() {
  const { finish } = useOnboarding();
  return (
    <AppScreen>
      <AppHeader
        title="You are ready"
        subtitle="Your basic preferences are set."
      />
      <AppText>You can now open the MedicineApp dashboard.</AppText>
      <AppAlert
        tone="warning"
        message="For medical questions or changes to treatment, contact a qualified doctor or pharmacist."
      />
      <AppButton label="Open dashboard" onPress={finish} />
    </AppScreen>
  );
}
