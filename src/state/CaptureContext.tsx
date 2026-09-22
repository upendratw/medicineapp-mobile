import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type {
  CapturedMedicineImage,
  OcrCandidate,
  OcrRecognitionResult,
  ReviewedMedicine,
} from '@/types/medication';
import { sessionEvents } from '@/security/SessionEvents';

type CaptureValue = {
  imageUri: string | null;
  image: CapturedMedicineImage | null;
  candidate: OcrCandidate | null;
  recognitionResult: OcrRecognitionResult | null;
  reviewedMedicine: ReviewedMedicine | null;
  setImage(image: CapturedMedicineImage | string | null): void;
  setCandidate(candidate: OcrCandidate | null): void;
  setRecognitionResult(result: OcrRecognitionResult | null): void;
  setReviewedMedicine(medicine: ReviewedMedicine | null): void;
  clear(): void;
};
const CaptureContext = createContext<CaptureValue | null>(null);
export function CaptureProvider({ children }: PropsWithChildren) {
  const [image, setImageState] = useState<CapturedMedicineImage | null>(null);
  const setImage = useCallback(
    (value: CapturedMedicineImage | string | null) =>
      setImageState(
        typeof value === 'string'
          ? {
              uri: value,
              width: 1,
              height: 1,
              mediaType: 'image/jpeg',
              source: 'camera',
              idempotencyKey: 'compatibility-transient-image',
            }
          : value,
      ),
    [],
  );
  const [candidate, setCandidate] = useState<OcrCandidate | null>(null);
  const [recognitionResult, setRecognitionResultState] =
    useState<OcrRecognitionResult | null>(null);
  const [reviewedMedicine, setReviewedMedicine] =
    useState<ReviewedMedicine | null>(null);
  const setRecognitionResult = useCallback(
    (result: OcrRecognitionResult | null) => {
      setRecognitionResultState(result);
      setCandidate(null);
    },
    [],
  );
  useEffect(
    () =>
      sessionEvents.subscribe(() => {
        setImageState(null);
        setCandidate(null);
        setRecognitionResultState(null);
        setReviewedMedicine(null);
      }),
    [],
  );
  const value = useMemo(
    () => ({
      imageUri: image?.uri ?? null,
      image,
      candidate,
      recognitionResult,
      reviewedMedicine,
      setImage,
      setCandidate,
      setRecognitionResult,
      setReviewedMedicine,
      clear: () => {
        setImageState(null);
        setCandidate(null);
        setRecognitionResultState(null);
        setReviewedMedicine(null);
      },
    }),
    [
      image,
      candidate,
      recognitionResult,
      reviewedMedicine,
      setImage,
      setRecognitionResult,
    ],
  );
  return (
    <CaptureContext.Provider value={value}>{children}</CaptureContext.Provider>
  );
}
export function useCapture(): CaptureValue {
  const value = useContext(CaptureContext);
  if (!value) throw new Error('useCapture must be used inside CaptureProvider');
  return value;
}
