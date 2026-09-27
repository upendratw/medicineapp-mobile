import {
  AccessibilityInfo,
  findNodeHandle,
  Modal,
  StyleSheet,
  View,
} from 'react-native';
import { useRef } from 'react';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { theme } from '@/theme/tokens';

export function DeviceOwnershipTransferDialog({
  visible,
  loading,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  loading: boolean;
  onConfirm(): void;
  onCancel(): void;
}) {
  const title = useRef<View>(null);
  const focusTitle = () => {
    const node = findNodeHandle(title.current);
    if (node) AccessibilityInfo.setAccessibilityFocus(node);
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onShow={focusTitle}
      onRequestClose={() => {
        if (!loading) onCancel();
      }}
    >
      <View style={styles.overlay}>
        <View
          accessibilityViewIsModal
          accessibilityLabel="Notification device ownership confirmation"
          style={styles.dialog}
        >
          <View ref={title} accessible>
            <AppText variant="heading" accessibilityRole="header">
              Use this device for notifications?
            </AppText>
          </View>
          <AppText>
            This device is currently registered to another MedicineApp account.
            Use this device for notifications for the account you just signed
            into?
          </AppText>
          <View style={styles.actions}>
            <AppButton
              label="Cancel"
              variant="secondary"
              disabled={loading}
              onPress={onCancel}
            />
            <AppButton
              label="Use This Device"
              loading={loading}
              onPress={onConfirm}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  dialog: {
    gap: theme.spacing.md,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  actions: { gap: theme.spacing.sm },
});
