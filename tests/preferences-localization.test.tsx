import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { AppButton, AppText, LanguageSettings } from '@/components';
import { translate } from '@/localization';
import {
  defaultPreferences,
  PREFERENCES_KEY,
  PreferencesProvider,
  restorePreferences,
  usePreferences,
} from '@/state/PreferencesContext';
import {
  NetworkProvider,
  OfflineBanner,
  useRefreshOnReconnect,
} from '@/state/NetworkContext';

const storage = jest.mocked(AsyncStorage);
beforeEach(() => {
  jest.clearAllMocks();
  storage.getItem.mockResolvedValue(null);
});

test('restores bounded preferences and safely falls back after corruption', () => {
  expect(restorePreferences('{broken')).toEqual(defaultPreferences);
  expect(
    restorePreferences(
      JSON.stringify({
        language: 'hi-IN',
        accessibility: {
          textSize: 'extra-large',
          highContrast: true,
          token: 'forbidden',
        },
      }),
    ),
  ).toMatchObject({
    language: 'hi-IN',
    accessibility: { textSize: 'extra-large', highContrast: true },
  });
});

test('applies large text and large control settings through primitives', async () => {
  storage.getItem.mockResolvedValue(
    JSON.stringify({
      language: 'en-IN',
      accessibility: { textSize: 'extra-large', largerControls: true },
    }),
  );
  const screen = await render(
    <PreferencesProvider>
      <AppText>Readable</AppText>
      <AppButton label="Large control" />
    </PreferencesProvider>,
  );
  await waitFor(() =>
    expect(screen.getByText('Readable').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ fontSize: 23 })]),
    ),
  );
  expect(
    screen.getByRole('button', { name: 'Large control' }).props.style,
  ).toEqual(
    expect.arrayContaining([expect.objectContaining({ minHeight: 60 })]),
  );
});

function SwitchProbe() {
  const { language } = usePreferences();
  return (
    <>
      <AppText>{language}</AppText>
      <LanguageSettings />
    </>
  );
}
test('switches language at runtime and persists only the namespaced preference document', async () => {
  const screen = await render(
    <PreferencesProvider>
      <SwitchProbe />
    </PreferencesProvider>,
  );
  await fireEvent.press(screen.getByRole('button', { name: /Hindi/ }));
  await waitFor(() => expect(screen.getByText('hi-IN')).toBeTruthy());
  expect(storage.setItem).toHaveBeenCalledWith(
    PREFERENCES_KEY,
    expect.stringContaining('hi-IN'),
  );
  expect(JSON.stringify(storage.setItem.mock.calls)).not.toMatch(
    /accessToken|refreshToken|jwt/i,
  );
});

test('provides Hindi UI and English UI fallback without translating clinical data', () => {
  expect(translate('hi-IN', 'settings')).toBe('सेटिंग्स');
  expect(translate('hi-IN', 'save')).toBe('सहेजें');
  expect(translate('en-IN', 'medicines')).toBe('Medicines');
  const source = require('node:fs').readFileSync(
    require('node:path').join(
      process.cwd(),
      'src/components/DrugInformationView.tsx',
    ),
    'utf8',
  );
  expect(source).toContain('human_translation_required');
  expect(source).not.toContain("from '@/localization'");
});

test('high contrast propagates and offline state is explicitly labeled', async () => {
  storage.getItem.mockResolvedValue(
    JSON.stringify({
      language: 'en-IN',
      accessibility: { highContrast: true, reducedMotion: true },
    }),
  );
  const screen = await render(
    <PreferencesProvider>
      <NetworkProvider online={false}>
        <OfflineBanner />
        <AppText>Contrast sample</AppText>
      </NetworkProvider>
    </PreferencesProvider>,
  );
  await waitFor(() =>
    expect(screen.getByText('Contrast sample').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: '#000000' })]),
    ),
  );
  expect(screen.getByText(/Offline data/)).toBeTruthy();
});

function ReconnectProbe({ refresh }: { refresh(): void }) {
  useRefreshOnReconnect(refresh);
  return null;
}
test('reconnect transition invokes authoritative refresh once', async () => {
  const refresh = jest.fn();
  const screen = await render(
    <NetworkProvider online={false}>
      <ReconnectProbe refresh={refresh} />
    </NetworkProvider>,
  );
  expect(refresh).not.toHaveBeenCalled();
  await screen.rerender(
    <NetworkProvider online>
      <ReconnectProbe refresh={refresh} />
    </NetworkProvider>,
  );
  await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
});
