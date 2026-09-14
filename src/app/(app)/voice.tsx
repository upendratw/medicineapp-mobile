import { useRouter } from 'expo-router';
import { AppHeader, AppScreen, VoiceControls } from '@/components';
import { publicEnvironment } from '@/config/environment';
import { voiceCommandResolver } from '@/services/registry';
export default function Voice() {
  const router = useRouter();
  return (
    <AppScreen>
      <AppHeader
        title="Voice controls"
        subtitle="Review recognized words before any action."
      />
      <VoiceControls
        resolve={(text) => voiceCommandResolver.resolve(text)}
        navigate={(route) => router.push(route as never)}
        simulationEnabled={publicEnvironment.developerDiagnostics}
      />
    </AppScreen>
  );
}
