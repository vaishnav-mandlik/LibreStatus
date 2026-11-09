import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Sheet } from './Sheet';
import { pressedStyle } from './ui';
import { useTheme } from '../context/ThemeContext';
import { radius, size, space, type } from '../theme/tokens';

export interface ConfirmSheetProps {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Confirm in the delete tray's danger tones instead of the accent. */
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Confirmation for the one action the toast cannot undo: removing files.
 *
 * Built on the sheet shell with the selection tray's 48px buttons, so it reads
 * as part of the same system even though the prototype never drew a dialogue.
 * Cancel is what the scrim and the back press resolve to.
 */
export const ConfirmSheet: React.FC<ConfirmSheetProps> = ({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel,
  destructive,
  onConfirm,
  onClose,
}) => {
  const { theme } = useTheme();
  const confirmTone = destructive
    ? { backgroundColor: theme.dangerSoft, borderColor: theme.dangerEdge }
    : { backgroundColor: theme.accent, borderColor: theme.accent };
  const confirmFg = destructive ? theme.dangerText : theme.onAccent;

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.content}>
        <Text style={[type.cardTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[type.bodySm, styles.body, { color: theme.textMuted }]}>{body}</Text>
        <View style={styles.actions}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={cancelLabel}
            style={({ pressed }) => [
              styles.action,
              { backgroundColor: theme.surface },
              pressedStyle(pressed),
            ]}
          >
            <Text style={[type.action, { color: theme.textSoft }]} numberOfLines={1}>
              {cancelLabel}
            </Text>
          </Pressable>
          <Pressable
            onPress={onConfirm}
            accessibilityRole="button"
            accessibilityLabel={confirmLabel}
            style={({ pressed }) => [
              styles.action,
              styles.confirm,
              confirmTone,
              pressedStyle(pressed),
            ]}
          >
            <Text style={[type.action, { color: confirmFg }]} numberOfLines={1}>
              {confirmLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </Sheet>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.xl },
  body: { marginTop: space.sm },
  actions: { flexDirection: 'row', gap: space.gap, marginTop: space.xl },
  action: {
    flex: 1,
    height: size.trayBtn,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirm: { borderWidth: 1 },
});

export default ConfirmSheet;
