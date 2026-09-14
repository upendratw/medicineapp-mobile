import {
  createContext,
  type PropsWithChildren,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { OcrCandidate } from '@/types/medication';

type CaptureValue = {
  imageUri: string | null;
  candidate: OcrCandidate | null;
  setImage(uri: string | null): void;
  setCandidate(candidate: OcrCandidate | null): void;
  clear(): void;
};
const CaptureContext = createContext<CaptureValue | null>(null);
export function CaptureProvider({ children }: PropsWithChildren) {
  const [imageUri, setImage] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<OcrCandidate | null>(null);
  const value = useMemo(
    () => ({
      imageUri,
      candidate,
      setImage,
      setCandidate,
      clear: () => {
        setImage(null);
        setCandidate(null);
      },
    }),
    [imageUri, candidate],
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
