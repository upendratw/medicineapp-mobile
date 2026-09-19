import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Crypto from 'expo-crypto';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
  const { image, imageUri, setImage, setCandidate, clear } = useCapture();
  const recognitionController = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const [working, setWorking] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => () => {
    mounted.current = false;
    recognitionController.current?.abort();
  });
  const chooseFromGallery = async () => {
    if (working) return;
    setWorking(true);
    setError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        exif: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const mediaType = asset.mimeType ?? 'image/jpeg';
      if (
        !asset.uri ||
        asset.width < 1 ||
        asset.height < 1 ||
        !['image/jpeg', 'image/png'].includes(mediaType)
      ) {
        setError(t('cameraUnsupportedPhoto'));
        return;
      }
      setCandidate(null);
      setImage({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        mediaType: mediaType as 'image/jpeg' | 'image/png',
        source: 'gallery',
        idempotencyKey: Crypto.randomUUID(),
      });
    } catch {
      setError(t('cameraPhotoOpenFailed'));
    } finally {
      setWorking(false);
    }
  };
  const capture = async () => {
    if (working || !cameraReady) return;
    await captureGate.run(async () => {
      setWorking(true);
      setError('');
      try {
        const photo = await camera.current?.takePictureAsync({ quality: 0.7 });
        if (!photo?.uri) throw new Error('Camera returned no image');
        setCandidate(null);
        setImage({
          uri: photo.uri,
          width: photo.width,
          height: photo.height,
          mediaType: 'image/jpeg',
          source: 'camera',
          idempotencyKey: Crypto.randomUUID(),
        });
      } catch {
        setError(t('cameraCaptureFailed'));
      } finally {
        setWorking(false);
      }
    });
  };
  const continueToReview = async () => {
    if (!image || working) return;
    recognitionController.current?.abort();
    const controller = new AbortController();
    recognitionController.current = controller;
    setWorking(true);
    setError('');
    try {
      setCandidate(await ocrService.recognize(image, controller.signal));
      if (controller.signal.aborted) return;
      router.push('/ocr-confirmation');
    } catch (failure) {
      if (controller.signal.aborted || !mounted.current) return;
      setError(
        failure instanceof IntegrationPendingError
          ? 'Recognition could not produce a safe candidate. Retake the image or enter the medicine manually.'
          : 'Recognition is temporarily unavailable.',
      );
    } finally {
      if (recognitionController.current === controller)
        recognitionController.current = null;
      if (mounted.current) setWorking(false);
    }
  };
  if (!permission)
    return <LoadingIndicator label="Checking camera permission" />;
  if (!permission.granted)
    return (
      <AppScreen>
        <AppHeader title="Choose a medicine image" />
        {error ? <AppAlert tone="error" message={error} /> : null}
        <AppAlert
          tone="warning"
          message="Camera access is needed only when you choose to photograph medicine packaging."
        />
        <AppButton label="Allow camera access" onPress={requestPermission} />
        {permission.canAskAgain ? null : (
          <AppAlert message="Camera access is denied. You can select a photo, use manual entry, or enable permission in device settings." />
        )}
        <AppButton
          variant="secondary"
          label={t('cameraChoosePhoto')}
          loading={working}
          onPress={chooseFromGallery}
        />
        <AppButton
          variant="secondary"
          label="Use manual entry"
          onPress={() => router.replace('/add-medicine')}
        />
      </AppScreen>
    );
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
            recognitionController.current?.abort();
            setImage(null);
            setCandidate(null);
            setCameraReady(false);
            setError('');
          }}
        />
        <AppButton
          variant="secondary"
          label={t('cameraChooseAnotherPhoto')}
          disabled={working}
          onPress={chooseFromGallery}
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
            label={t('cameraChoosePhoto')}
            disabled={working}
            onPress={chooseFromGallery}
          />
          <AppButton
            variant="secondary"
            label="Cancel camera"
            onPress={() => {
              recognitionController.current?.abort();
              clear();
              router.back();
            }}
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
