import { useRouter } from 'expo-router';
import {
  AppButton,
  AppCard,
  AppHeader,
  AppScreen,
  AppText,
} from '@/components';
import { useOnboarding } from '@/state/OnboardingContext';
export default function ProfileBasicsScreen() {
  const router = useRouter();
  const { roleContext, setRoleContext } = useOnboarding();
  return (
    <AppScreen>
      <AppHeader
        title="How will you use MedicineApp?"
        subtitle="Choose the context that best fits today. Access remains consent-based and can change later."
      />
      <AppCard>
        <AppButton
          variant={roleContext === 'self' ? 'primary' : 'secondary'}
          label="For my own medication routine"
          onPress={() => setRoleContext('self')}
        />
        <AppButton
          variant={roleContext === 'caregiver' ? 'primary' : 'secondary'}
          label="To support someone with consent"
          onPress={() => setRoleContext('caregiver')}
        />
      </AppCard>
      <AppText variant="caption">
        We are not asking for diagnoses, medication history, or treatment
        preferences during this setup.
      </AppText>
      <AppButton
        label="Continue"
        disabled={!roleContext}
        onPress={() => router.push('/accessibility')}
      />
    </AppScreen>
  );
}
