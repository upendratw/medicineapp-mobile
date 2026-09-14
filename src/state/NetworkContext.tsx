import NetInfo from '@react-native-community/netinfo';
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppAlert } from '@/components/AppAlert';
import { useTranslation } from '@/localization';
const NetworkContext = createContext(true);
export function NetworkProvider({
  children,
  online,
}: PropsWithChildren<{ online?: boolean }>) {
  const [detectedOnline, setDetectedOnline] = useState(true);
  useEffect(() => {
    if (online !== undefined) return;
    return NetInfo.addEventListener((state) =>
      setDetectedOnline(
        state.isConnected === true && state.isInternetReachable !== false,
      ),
    );
  }, [online]);
  return (
    <NetworkContext.Provider value={online ?? detectedOnline}>
      {children}
    </NetworkContext.Provider>
  );
}
export function useOnline(): boolean {
  return useContext(NetworkContext);
}
export function useRefreshOnReconnect(refresh: () => void): void {
  const online = useOnline();
  const wasOnline = useRef(online);
  useEffect(() => {
    if (online && !wasOnline.current) refresh();
    wasOnline.current = online;
  }, [online, refresh]);
}
export function OfflineBanner({ stale = false }: { stale?: boolean }) {
  const online = useOnline();
  const { t } = useTranslation();
  return !online || stale ? (
    <AppAlert tone="warning" message={t('offline')} />
  ) : null;
}
