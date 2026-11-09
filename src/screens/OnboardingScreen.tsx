import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../components/icons';
import { PermissionGuide } from '../components/PermissionGuide';
import { CSS_EASE, pressedStyle } from '../components/ui';
import { useFeedback } from '../context/FeedbackContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { radius, size, space, type } from '../theme/tokens';
import { requestFolderAccess } from '../utils/folderPicker';

export interface OnboardingScreenProps {
  onGranted: () => void;
  onSkip: () => void;
}

/** The three numbered rows. Step 2 carries the accent span, so it is composed. */
const STEPS = [0, 1, 2] as const;

/**
 * First run on Android 11+, where the status folder is reachable only through
 * a SAF grant. One job: explain the ask well enough that the picker gets
 * finished instead of backed out of.
 */
const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  onGranted,
  onSkip,
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { showToast } = useFeedback();
  const insets = useSafeAreaInsets();
  const [guideOpen, setGuideOpen] = useState(false);

  // The prototype's `animation: fadeIn .3s both` on this screen.
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    // Stopped on unmount, as every other animation in the app is: a grant that
    // lands mid-fade takes this screen away while the timing is still driving
    // a node that no longer exists.
    const enter = Animated.timing(fade, {
      toValue: 1,
      duration: 300,
      easing: CSS_EASE,
      useNativeDriver: true,
    });
    enter.start();
    return () => enter.stop();
  }, [fade]);

  // The picker is an activity round-trip; the screen can unmount while it is
  // up, and a second tap must not open a second picker.
  const mounted = useRef(true);
  const busy = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const choose = useCallback(async () => {
    if (busy.current) {
      return;
    }
    busy.current = true;
    try {
      const uri = await requestFolderAccess('whatsapp');
      if (!uri) {
        /*
         * No URI and no rejection means the picker never opened: the native
         * module answers null when it is not there to call. Backing out of it
         * rejects with CANCELLED, which is handled below, so silence here is
         * never a decision the user made.
         *
         * This is the only screen on Android 11+ with a route off it, and the
         * unsaid version of it was the worst dead end in the app: the CTA did
         * nothing whatsoever, every time, and the only way on was "Not now"
         * into a Feed that could never fill.
         */
        showToast({
          message: t('onboard.failed'),
          meta: t('toast.metaSetup'),
          type: 'error',
        });
        return;
      }
      showToast({
        message: t('toast.folderGranted'),
        meta: t('toast.metaSetup'),
        type: 'success',
      });
      onGranted();
    } catch (error) {
      // Backing out of the system picker is a decision, not a failure — an
      // error toast on top of it would read as if the app had broken.
      const code = (error as { code?: string })?.code;
      if (code === 'CANCELLED') {
        return;
      }
      const message = (error as { message?: string })?.message ?? '';
      if (
        message.includes('Status folder not found') ||
        message.includes('Invalid folder')
      ) {
        // The wrong folder was picked. Walking the two taps beats repeating a
        // toast the user has just watched fail.
        //
        // Guarded: the picker is an activity round-trip, so a grant that
        // arrives from anywhere else meanwhile takes this screen away while the
        // rejection is still in flight, and the guide would then be opened on a
        // component that is gone.
        if (mounted.current) {
          setGuideOpen(true);
        }
      } else {
        showToast({ message: t('onboard.failed'), type: 'error' });
      }
    } finally {
      if (mounted.current) {
        busy.current = false;
      }
    }
  }, [onGranted, showToast, t]);

  return (
    <Animated.View
      style={[styles.screen, { backgroundColor: theme.bg, opacity: fade }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <Text style={[type.brand, { color: theme.textSoft }]}>
            {t('brand.name')}
          </Text>
          <Text style={[type.display, { color: theme.text }]}>
            {t('onboard.title')}
          </Text>
          <Text style={[type.lede, styles.lede, { color: theme.textMuted }]}>
            {t('onboard.body')}
          </Text>
        </View>

        <View style={[styles.steps, { borderTopColor: theme.hairline }]}>
          {STEPS.map(index => (
            <View
              key={index}
              style={[styles.step, { borderBottomColor: theme.hairline }]}
            >
              <Text
                style={[type.monoLight, styles.num, { color: theme.textDim }]}
              >
                {`0${index + 1}`}
              </Text>
              <Text
                style={[type.step, styles.stepText, { color: theme.textSoft }]}
              >
                {index === 0 ? t('onboard.step1') : null}
                {index === 1 ? (
                  <>
                    {t('onboard.step2a')}
                    <Text style={{ color: theme.accent }}>
                      {t('onboard.step2Accent')}
                    </Text>
                    {t('onboard.step2b')}
                  </>
                ) : null}
                {index === 2 ? t('onboard.step3') : null}
              </Text>
            </View>
          ))}
        </View>

        <View
          style={[styles.bottom, { paddingBottom: space.sm + insets.bottom }]}
        >
          <View style={styles.note}>
            <Icon
              name="lockWide"
              size={13}
              color={theme.textDim}
              strokeWidth={1.9}
            />
            <Text
              style={[type.small, styles.noteText, { color: theme.textDim }]}
            >
              {t('onboard.note')}
            </Text>
          </View>
          <Pressable
            onPress={choose}
            accessibilityRole="button"
            accessibilityLabel={t('onboard.cta')}
            style={({ pressed }) => [
              styles.cta,
              { backgroundColor: theme.accent },
              pressedStyle(pressed),
            ]}
          >
            <Text style={[type.cta, { color: theme.onAccent }]}>
              {t('onboard.cta')}
            </Text>
          </Pressable>
          <Pressable
            onPress={onSkip}
            accessibilityRole="button"
            accessibilityLabel={t('onboard.skip')}
            style={({ pressed }) => [styles.skip, pressedStyle(pressed)]}
          >
            <Text style={[type.value, { color: theme.textMuted }]}>
              {t('onboard.skip')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <PermissionGuide
        visible={guideOpen}
        onClose={() => setGuideOpen(false)}
        onOpenPicker={() => {
          setGuideOpen(false);
          choose();
        }}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: space.xxl },
  intro: { marginTop: 54, gap: space.row },
  lede: { maxWidth: 302 },
  steps: { marginTop: 38, borderTopWidth: 1 },
  step: {
    flexDirection: 'row',
    gap: space.lg,
    paddingVertical: space.lg,
    borderBottomWidth: 1,
  },
  /** The numeral sits on the step's own 1.5 line so the two align. */
  num: { width: 16, lineHeight: 15.75 },
  stepText: { flex: 1 },
  bottom: { marginTop: 'auto' },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space.lg,
  },
  noteText: { flex: 1 },
  cta: {
    height: size.cta,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skip: {
    height: size.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default OnboardingScreen;
