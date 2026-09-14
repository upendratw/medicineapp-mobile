import { useRouter } from 'expo-router';
import {
  AppAlert,
  AppButton,
  AppCard,
  AppHeader,
  AppScreen,
  AppText,
} from '@/components';
export default function WelcomeScreen() {
  const router = useRouter();
  return (
    <AppScreen>
      <AppHeader
        title="Welcome to MedicineApp"
        subtitle="Simple support for medication routines and caregiver collaboration."
      />
      <AppCard>
        <AppText>
          MedicineApp can help you organize medication information, schedules,
          and reminders.
        </AppText>
      </AppCard>
      <AppAlert
        tone="warning"
        message="MedicineApp does not replace your doctor or pharmacist and does not prescribe or make treatment decisions."
      />
      <AppButton
        label="Get started"
        onPress={() => router.push('/profile-basics')}
      />
    </AppScreen>
  );
}
