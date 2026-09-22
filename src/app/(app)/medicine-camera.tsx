import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Crypto from 'expo-crypto';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { publicEnvironment } from '@/config/environment';
import { OcrWorkflowError } from '@/services/ocrService';
import { ocrService } from '@/services/registry';
import { useCapture } from '@/state/CaptureContext';
import { theme } from '@/theme/tokens';
import { useTranslation } from '@/localization';
import { SingleFlight } from '@/utils/singleFlight';

export const recognitionFailureMessage = (
  failure: unknown,
  developerDiagnostics = publicEnvironment.developerDiagnostics,
): string => {
  if (failure instanceof OcrWorkflowError && developerDiagnostics)
    return `Recognition unavailable [${failure.code}]`;
  return failure instanceof IntegrationPendingError
    ? 'Recognition could not produce a safe candidate. Retake the image or enter the medicine manually.'
    : 'Recognition is temporarily unavailable.';
};

export default function MedicineCameraScreen() {
  const router = useRouter();
  const { choose } = useLocalSearchParams<{ choose?: string }>();
  const { t } = useTranslation();
  const camera = useRef<CameraView>(null);
  const captureGate = useRef(new SingleFlight()).current;
  const recognitionGate = useRef(new SingleFlight()).current;
  const [permission, requestPermission] = useCameraPermissions();
  const {
    image,
    imageUri,
    setImage,
    setCandidate,
    setRecognitionResult,
    clear,
  } = useCapture();
  const recognitionController = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const galleryRequestHandled = useRef(false);
  const [working, setWorking] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      recognitionController.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (!image) recognitionController.current?.abort();
  }, [image]);
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
      setRecognitionResult(null);
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
  useEffect(() => {
    if (
      choose === 'gallery' &&
      permission?.granted &&
      !image &&
      !galleryRequestHandled.current
    ) {
      galleryRequestHandled.current = true;
      void chooseFromGallery();
    }
    // The route hint is consumed once; callback recreation must not reopen the picker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choose, image, permission?.granted]);
  const capture = async () => {
    if (working || !cameraReady) return;
    await captureGate.run(async () => {
      setWorking(true);
      setError('');
      try {
        const photo = await camera.current?.takePictureAsync({ quality: 0.7 });
        if (!photo?.uri) throw new Error('Camera returned no image');
        setCandidate(null);
        setRecognitionResult(null);
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
    await recognitionGate.run(async () => {
      recognitionController.current?.abort();
      const controller = new AbortController();
      recognitionController.current = controller;
      setWorking(true);
      setError('');
      try {
        const result = await ocrService.recognize(image, controller.signal);
        if (controller.signal.aborted) return;
        setRecognitionResult(result);
        router.push('/ocr-confirmation');
      } catch (failure) {
        if (controller.signal.aborted || !mounted.current) return;
        setError(recognitionFailureMessage(failure));
      } finally {
        if (recognitionController.current === controller)
          recognitionController.current = null;
        if (mounted.current) setWorking(false);
      }
    });
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
          onPress={() => {
            recognitionController.current?.abort();
            setImage(null);
            setCandidate(null);
            setRecognitionResult(null);
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
