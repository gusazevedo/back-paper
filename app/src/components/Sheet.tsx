import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '../i18n';
import { colors, radii, spacing, typography } from '../theme';
import { Button } from './Button';

type SheetProps = {
  visible: boolean;
  onDismiss: () => void;
  title?: string;
  children: ReactNode;
  /** Option lists (folder options) use tighter padding than dialogs. */
  compact?: boolean;
};

/** Bottom sheet over a dimmed backdrop; tapping the backdrop dismisses it. */
export function Sheet({
  visible,
  onDismiss,
  title,
  children,
  compact,
}: SheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <KeyboardAvoidingView behavior="padding" style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.dismiss')}
          onPress={onDismiss}
          style={StyleSheet.absoluteFill}
        >
          <View style={styles.backdrop} />
        </Pressable>
        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            compact ? styles.compact : styles.dialog,
            { paddingBottom: 30 + insets.bottom },
          ]}
        >
          {title ? (
            <Text
              accessibilityRole="header"
              style={[typography.sheetTitle, styles.title]}
            >
              {title}
            </Text>
          ) : null}
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type ConfirmProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'dangerSoft' | 'primary';
};

/** Title, explanation, a colored confirm button and Cancel. */
export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  variant = 'danger',
}: ConfirmProps) {
  return (
    <Sheet visible={visible} onDismiss={onCancel} title={title}>
      <Text style={[typography.bodySmall, styles.message]}>{message}</Text>
      <Button label={confirmLabel} variant={variant} onPress={onConfirm} />
      <Button
        label={t('common.cancel')}
        variant="secondary"
        onPress={onCancel}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    backgroundColor: colors.surface,
    gap: 10,
  },
  dialog: { paddingTop: 22, paddingHorizontal: spacing.xl },
  compact: { paddingTop: 14, paddingHorizontal: spacing.md, gap: spacing.xs },
  title: { marginBottom: 0 },
  message: { marginBottom: spacing.sm },
});
