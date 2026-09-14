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
  PrescriptionReview,
} from '@/components';
import { prescriptionScanService } from '@/services/registry';
import type { PrescriptionCandidate } from '@/types/clinicalFeatures';
import { theme } from '@/theme/tokens';

export default function PrescriptionScanScreen() {
  const router = useRouter();
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<
    readonly PrescriptionCandidate[] | null
  >(null);
  const [working, setWorking] = useState(false);
  const [pending, setPending] = useState(false);
  const [captureError, setCaptureError] = useState(false);
  const clear = () => {
    setImageUri(null);
    setCandidates(null);
    setPending(false);
    setCaptureError(false);
  };
  if (!permission)
    return <LoadingIndicator label="Checking camera permission" />;
  if (!permission.granted)
    return (
      <AppScreen>
        <AppHeader title="Prescription camera permission" />
        <AppAlert
          tone="warning"
          message="Camera access is used only when you choose to capture a prescription."
        />
        <AppButton
          label="Allow prescription camera"
          onPress={requestPermission}
        />
        {permission.canAskAgain ? null : (
          <AppAlert message="Permission is denied. Use manual medicine entry or device settings." />
        )}
        <AppButton
          variant="secondary"
          label="Enter manually"
          onPress={() => router.replace('/add-medicine')}
        />
      </AppScreen>
    );
  const capture = async () => {
    if (working) return;
    setWorking(true);
    setCaptureError(false);
    try {
      const photo = await camera.current?.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) setImageUri(photo.uri);
    } catch {
      setCaptureError(true);
    } finally {
      setWorking(false);
    }
  };
  const process = async () => {
    if (!imageUri || working) return;
    setWorking(true);
    setPending(false);
    try {
      setCandidates(await prescriptionScanService.process({ uri: imageUri }));
    } catch {
      setPending(true);
    } finally {
      setWorking(false);
    }
  };
  if (candidates)
    return (
      <AppScreen>
        <AppHeader title="Review prescription extraction" />
        <PrescriptionReview
          candidates={candidates}
          onConfirm={() => {
            clear();
            router.replace('/add-medicine');
          }}
          onReject={clear}
          onManual={() => {
            clear();
            router.replace('/add-medicine');
          }}
        />
      </AppScreen>
    );
  if (imageUri)
    return (
      <AppScreen>
        <AppHeader
          title="Review prescription image"
          subtitle="The image has not been uploaded."
        />
        {pending ? (
          <AppAlert
            tone="warning"
            message="Prescription OCR and backend upload are not yet available. The image remains local and unsaved."
          />
        ) : null}
        <Image
          source={{ uri: imageUri }}
          accessibilityLabel="Captured prescription preview"
          style={styles.preview}
          contentFit="contain"
        />
        <AppButton
          label="Continue to prescription processing"
          loading={working}
          onPress={process}
        />
        <AppButton
          variant="secondary"
          label="Retake prescription"
          onPress={clear}
        />
        <AppButton
          variant="secondary"
          label="Cancel and discard"
          onPress={() => {
            clear();
            router.back();
          }}
        />
      </AppScreen>
    );
  return (
    <View style={styles.container}>
      <CameraView ref={camera} style={styles.camera} facing="back">
        <View style={styles.controls}>
          <AppText style={styles.text}>
            Keep the prescription flat and visible. It may contain sensitive
            health information.
          </AppText>
          {captureError ? (
            <AppAlert
              tone="error"
              message="The prescription image could not be captured. Please try again."
            />
          ) : null}
          <AppButton
            label="Capture prescription"
            loading={working}
            onPress={capture}
          />
          <AppButton
            variant="secondary"
            label="Cancel prescription camera"
            onPress={() => router.back()}
          />
        </View>
      </CameraView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1, justifyContent: 'flex-end' },
  controls: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  text: { color: '#FFF' },
  preview: { width: '100%', height: 420 },
});
