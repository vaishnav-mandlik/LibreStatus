import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Icon } from './icons';
import { Sheet } from './Sheet';
import { PrimaryButton } from './ui';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { radius, space, type } from '../theme/tokens';

export interface PermissionGuideProps {
  visible: boolean;
  onClose: () => void;
  /** Dismisses the guide and opens the real system picker. */
  onOpenPicker: () => void;
}

/** Android's own package folders under Android › media. */
// Decoration only: the step says to grant Android › media itself, so which
// package folders the drawing lists does not matter, and the user's rule is
// that no other app's name appears anywhere in this one.
const MOCK_FOLDERS = ['com.android.providers.media', 'com.android.gallery3d'];

/**
 * Walkthrough for Android's folder picker.
 *
 * The Storage Access Framework flow is the hardest moment in this app: Android
 * hands the user its own two-step UI with no explanation of why, and a wrong
 * folder silently yields nothing. So rather than describing it in prose this
 * draws a recognisable mock-up of the two screens the user is about to see,
 * with the tap target pulsing on each.
 */
export const PermissionGuide: React.FC<PermissionGuideProps> = ({
  visible,
  onClose,
  onOpenPicker,
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  // One 0→1→0 loop drives both pointers in opposite phase, so the eye is
  // pulled to step 1 and then step 2 in the order they actually happen.
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, pulse]);

  const stepOne = pulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.1, 1],
  });
  const stepTwo = pulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1.1, 1, 1.1],
  });

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('guide.title')}
      scroll
      maxHeight="92%"
    >
      <View style={styles.content}>
        <Text style={[type.body, { color: theme.textMuted }]}>
          {t('guide.intro')}
        </Text>

        <Step index="01" text={t('guide.step1')} />
        {/*
          A drawing of Android's picker, not a control. Left visible to a
          screen reader it offers a "Use this folder" and an "Allow" that
          cannot be tapped; the step text above each one says the same thing
          in words, so the mock-ups are hidden from the reader instead.
        */}
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.mock, { backgroundColor: theme.surface }]}
        >
          <View style={styles.crumbs}>
            <Text
              style={[type.monoSm, { color: theme.textFaint }]}
              numberOfLines={1}
            >
              {t('guide.mockInternal')}
            </Text>
            <Icon name="chevronRight" size={11} color={theme.textFaint} />
            <Text
              style={[type.monoSm, { color: theme.accent }]}
              numberOfLines={1}
            >
              {t('onboard.step2Accent')}
            </Text>
          </View>
          {MOCK_FOLDERS.map(name => (
            <View key={name} style={styles.fileRow}>
              <View
                style={[styles.folder, { backgroundColor: theme.borderHi }]}
              />
              <Text
                style={[type.chip, { color: theme.textMuted }]}
                numberOfLines={1}
              >
                {name}
              </Text>
            </View>
          ))}
          <View style={styles.mockActions}>
            <Animated.View
              style={[
                styles.mockButton,
                {
                  backgroundColor: theme.accent,
                  transform: [{ scale: stepOne }],
                },
              ]}
            >
              <Text
                style={[type.button, { color: theme.onAccent }]}
                numberOfLines={1}
              >
                {t('guide.mockUseFolder')}
              </Text>
            </Animated.View>
          </View>
        </View>

        <Step index="02" text={t('guide.step2')} />
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.mock,
            styles.dialog,
            { backgroundColor: theme.surface },
          ]}
        >
          <Text style={[type.rowTitle, { color: theme.text }]}>
            {t('guide.mockAllowTitle')}
          </Text>
          <Text
            style={[type.body, styles.dialogBody, { color: theme.textMuted }]}
          >
            {t('guide.mockAllowBody')}
          </Text>
          <View style={styles.dialogActions}>
            <Text style={[type.button, { color: theme.textFaint }]}>
              {t('common.cancel')}
            </Text>
            <Animated.View
              style={[
                styles.mockButton,
                {
                  backgroundColor: theme.accent,
                  transform: [{ scale: stepTwo }],
                },
              ]}
            >
              <Text style={[type.button, { color: theme.onAccent }]}>
                {t('guide.mockAllow')}
              </Text>
            </Animated.View>
          </View>
        </View>

        <PrimaryButton
          label={t('guide.open')}
          onPress={onOpenPicker}
          style={styles.cta}
        />
      </View>
    </Sheet>
  );
};

/** Numbered step in the onboarding's own language: mono numeral, then the copy. */
const Step: React.FC<{ index: string; text: string }> = ({ index, text }) => {
  const { theme } = useTheme();
  return (
    <View style={styles.step}>
      <Text
        style={[type.monoLight, styles.stepIndex, { color: theme.textDim }]}
      >
        {index}
      </Text>
      <Text style={[type.step, styles.stepText, { color: theme.textSoft }]}>
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.xl },

  step: {
    flexDirection: 'row',
    gap: space.lg,
    paddingTop: 18,
    paddingBottom: space.md,
  },
  stepIndex: { width: 16 },
  stepText: { flex: 1 },

  mock: { borderRadius: radius.md, padding: space.md },
  crumbs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingBottom: space.sm,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: 6,
  },
  folder: { width: 12, height: 9, borderRadius: 2 },
  mockActions: { alignItems: 'flex-end', paddingTop: space.sm },
  mockButton: {
    borderRadius: radius.sm,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },

  dialog: { padding: space.lg },
  dialogBody: { marginTop: space.xs },
  dialogActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: space.lg,
    marginTop: space.lg,
  },

  cta: { marginTop: space.xl },
});

export default PermissionGuide;
