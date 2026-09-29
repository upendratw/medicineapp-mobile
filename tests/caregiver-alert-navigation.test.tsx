import { fireEvent, render } from '@testing-library/react-native';

import CaregiverAlertDetailScreen from '@/app/(app)/caregiver-alerts/[relationshipId]/[alertId]';

const mockBack = jest.fn();
let mockRole: 'patient' | 'caregiver' = 'caregiver';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({
    relationshipId: 'relationship-one',
    alertId: 'alert-one',
  }),
  useRouter: () => ({ back: mockBack }),
}));
jest.mock('@/components/CaregiverAlertDetail', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    CaregiverAlertDetail: ({
      relationshipId,
      alertId,
      onBack,
    }: {
      relationshipId: string;
      alertId: string;
      onBack(): void;
    }) =>
      React.createElement(
        Pressable,
        {
          accessibilityRole: 'button',
          accessibilityLabel: `${relationshipId}:${alertId}`,
          onPress: onBack,
        },
        React.createElement(Text, null, 'Alert detail'),
      ),
  };
});
jest.mock('@/services/registry', () => ({ caregiverAlertService: {} }));
jest.mock('@/state/AuthContext', () => ({
  useAuth: () => ({ role: mockRole }),
}));
jest.mock('@/state/NetworkContext', () => ({
  useOnline: () => true,
}));

test('passes only route IDs to detail and uses standard router Back', async () => {
  const screen = await render(<CaregiverAlertDetailScreen />);
  await fireEvent.press(
    screen.getByRole('button', { name: 'relationship-one:alert-one' }),
  );
  expect(mockBack).toHaveBeenCalledTimes(1);
});

test('does not render Caregiver alert detail for a Patient role', async () => {
  mockRole = 'patient';
  const screen = await render(<CaregiverAlertDetailScreen />);
  expect(screen.toJSON()).toBeNull();
  mockRole = 'caregiver';
});
