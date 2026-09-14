import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppAlert,
  AppButton,
  AppHeader,
  AppScreen,
  AppText,
  LoadingIndicator,
} from '@/components';
import { IntegrationPendingError } from '@/services/integration';
import { ocrService } from '@/services/registry';
import { useCapture } from '@/state/CaptureContext';
import { theme } from '@/theme/tokens';

export default function MedicineCameraScreen() {
  const router = useRouter();
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const { imageUri, setImage, setCandidate } = useCapture();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  if (!permission)
    return <LoadingIndicator label="Checking camera permission" />;
  if (!permission.granted)
    return (
      <AppScreen>
        <AppHeader title="Camera permission" />
        <AppAlert
          tone="warning"
          message="Camera access is needed only when you choose to photograph medicine packaging."
        />
        <AppButton label="Allow camera access" onPress={requestPermission} />
        {permission.canAskAgain ? null : (
          <AppAlert message="Camera access is denied. You can use manual entry or enable permission in device settings." />
        )}
        <AppButton
          variant="secondary"
          label="Use manual entry"
          onPress={() => router.replace('/add-medicine')}
        />
      </AppScreen>
    );
  const capture = async () => {
    if (working) return;
    setWorking(true);
    setError('');
    try {
      const photo = await camera.current?.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) setImage(photo.uri);
    } catch {
      setError('The image could not be captured. Please try again.');
    } finally {
      setWorking(false);
    }
  };
  const continueToReview = async () => {
    if (!imageUri || working) return;
    setWorking(true);
    setError('');
    try {
      setCandidate(await ocrService.recognize({ uri: imageUri }));
    } catch (failure) {
      if (!(failure instanceof IntegrationPendingError))
        setError('Recognition is temporarily unavailable.');
    } finally {
      setWorking(false);
      router.push('/ocr-confirmation');
    }
  };
  if (imageUri)
    return (
      <AppScreen>
        <AppHeader
          title="Review image"
          subtitle="The image has not been uploaded."
        />
        {error ? <AppAlert tone="error" message={error} /> : null}
        <Image
          source={{ uri: imageUri }}
          accessibilityLabel="Captured medicine packaging preview"
          style={styles.preview}
          contentFit="contain"
        />
        <AppButton
          label="Continue to recognition review"
          loading={working}
          onPress={continueToReview}
        />
        <AppButton
          variant="secondary"
          label="Retake photo"
          onPress={() => {
            setImage(null);
            setCandidate(null);
          }}
        />
      </AppScreen>
    );
  return (
    <View style={styles.container}>
      <CameraView ref={camera} style={styles.camera} facing="back">
        <View style={styles.controls}>
          <AppText style={styles.cameraText}>
            Place the medicine name and strength inside the frame.
          </AppText>
          <AppButton
            label="Capture medicine packaging"
            loading={working}
            onPress={capture}
          />
          <AppButton
            variant="secondary"
            label="Cancel camera"
            onPress={() => router.back()}
          />
        </View>
      </CameraView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  camera: { flex: 1, justifyContent: 'flex-end' },
  controls: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  cameraText: { color: '#FFFFFF' },
  preview: { width: '100%', height: 360, borderRadius: theme.radius.md },
});
