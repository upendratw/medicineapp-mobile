import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
import { useTranslation } from '@/localization';
import { SingleFlight } from '@/utils/singleFlight';

export default function MedicineCameraScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const camera = useRef<CameraView>(null);
  const captureGate = useRef(new SingleFlight()).current;
  const [permission, requestPermission] = useCameraPermissions();
  const { imageUri, setImage, setCandidate } = useCapture();
  const [working, setWorking] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
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
    if (working || !cameraReady) return;
    await captureGate.run(async () => {
      setWorking(true);
      setError('');
      try {
        const photo = await camera.current?.takePictureAsync({ quality: 0.7 });
        if (!photo?.uri) throw new Error('Camera returned no image');
        setImage(photo.uri);
      } catch {
        setError(t('cameraCaptureFailed'));
      } finally {
        setWorking(false);
      }
    });
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
          disabled={working}
          onPress={() => {
            setImage(null);
            setCandidate(null);
            setCameraReady(false);
            setError('');
          }}
        />
      </AppScreen>
    );
  return (
    <View style={styles.container}>
      <CameraView
        ref={camera}
        testID="medicine-camera-preview"
        style={StyleSheet.absoluteFill}
        facing="back"
        onCameraReady={() => setCameraReady(true)}
        onMountError={() => setError(t('cameraCaptureFailed'))}
      />
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.controls}>
          <AppText style={styles.cameraText}>
            Place the medicine name and strength inside the frame.
          </AppText>
          {error ? <AppAlert tone="error" message={error} /> : null}
          <AppButton
            label={t('cameraTakePhoto')}
            accessibilityHint={t('cameraTakePhotoHint')}
            loading={working}
            disabled={!cameraReady}
            onPress={capture}
          />
          <AppButton
            variant="secondary"
            label="Cancel camera"
            onPress={() => router.back()}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    zIndex: 1,
    elevation: 1,
  },
  controls: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  cameraText: { color: '#FFFFFF' },
  preview: { width: '100%', height: 360, borderRadius: theme.radius.md },
});
