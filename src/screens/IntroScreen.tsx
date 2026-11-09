import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '../components/icons';
import { CSS_EASE, Pager, pressedStyle } from '../components/ui';
import { useLanguage } from '../context/LanguageContext';
import type { TranslationKey } from '../i18n';
import { useTheme } from '../context/ThemeContext';
import { radius, size, space, type } from '../theme/tokens';
import { hapticSelect } from '../utils/haptics';

export interface IntroScreenProps {
  /** Runs once, on the last slide's CTA or on Skip. Marks the intro seen. */
  onDone: () => void;
}

/**
 * The three slides, in order. Each is one claim: what the app shows, what it
 * changes about the 24-hour window, and what it does not do with the files.
 * The keys are read from the dictionary at render so a language change
 * mid-slide redraws in the new one.
 */
const SLIDES: ReadonlyArray<{
  icon: IconName;
  title: TranslationKey;
  body: TranslationKey;
}> = [
  { icon: 'feed', title: 'intro.one.title', body: 'intro.one.body' },
  { icon: 'download', title: 'intro.two.title', body: 'intro.two.body' },
  { icon: 'lockWide', title: 'intro.three.title', body: 'intro.three.body' },
] as const;

export const SLIDE_COUNT = SLIDES.length;

/** Dots: the resting width, and the width the active one stretches to. */
const DOT = 6;
const DOT_ACTIVE = 20;

/** One dot. Animates between the two widths so the row reads as a track. */
const Dot: React.FC<{ active: boolean }> = ({ active }) => {
  const { theme } = useTheme();
  const v = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    const run = Animated.timing(v, {
      toValue: active ? 1 : 0,
      duration: 220,
      easing: CSS_EASE,
      // Width is a layout property, so this one cannot ride the native driver.
      useNativeDriver: false,
    });
    run.start();
    return () => run.stop();
  }, [active, v]);
  return (
    <Animated.View
      style={{
        height: DOT,
        borderRadius: DOT / 2,
        width: v.interpolate({
          inputRange: [0, 1],
          outputRange: [DOT, DOT_ACTIVE],
        }),
        backgroundColor: active ? theme.accent : theme.border,
      }}
    />
  );
};

/**
 * First launch after install, ahead of the folder grant: three swipeable
 * slides that say what the app is for. Shown once — `introSeen` is written the
 * moment it is finished or skipped, so a reinstall is the only way back.
 */
const IntroScreen: React.FC<IntroScreenProps> = ({ onDone }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  /**
   * The slide as of the last render, for the back handler. Reading it inside a
   * `setIndex` updater only worked because React ran the updater eagerly, and
   * it does not when a swipe's own update is still pending in the same batch.
   */
  const indexRef = useRef(0);
  indexRef.current = index;
  const last = index === SLIDE_COUNT - 1;

  // The same `fadeIn .3s both` the onboarding screen opens on.
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const enter = Animated.timing(fade, {
      toValue: 1,
      duration: 300,
      easing: CSS_EASE,
      useNativeDriver: true,
    });
    enter.start();
    return () => enter.stop();
  }, [fade]);

  /**
   * Finishing is one-way and writes a pref, so it is guarded: the CTA on the
   * last slide and the Skip link both land here, and a double tap on either
   * would otherwise fire the transition twice.
   */
  const done = useRef(false);
  const finish = useCallback(() => {
    if (done.current) {
      return;
    }
    done.current = true;
    onDone();
  }, [onDone]);

  /*
   * Hardware back walks back through the slides, and only leaves the app from
   * the first one. Declining the press there hands it to the shell's handler,
   * which lets Android close the app — the intro is not a place to be trapped,
   * and it is not somewhere back should quietly mark as seen either.
   */
  useEffect(() => {
    const onBack = () => {
      if (indexRef.current === 0) {
        return false;
      }
      setIndex(current => Math.max(current - 1, 0));
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, []);

  const next = useCallback(() => {
    if (last) {
      finish();
      return;
    }
    hapticSelect();
    setIndex(current => Math.min(current + 1, SLIDE_COUNT - 1));
  }, [finish, last]);

  return (
    <Animated.View
      style={[styles.screen, { backgroundColor: theme.bg, opacity: fade }]}
    >
      <View style={styles.top}>
        <Text style={[type.brand, { color: theme.textSoft }]}>
          {t('brand.name')}
        </Text>
        {/* Skip stays up on the last slide too: it is the same destination as
            the CTA there, and a control that vanishes under a moving finger
            reads as the app having lost the tap. */}
        <Pressable
          onPress={finish}
          accessibilityRole="button"
          accessibilityLabel={t('intro.skip')}
          hitSlop={space.gap}
          style={({ pressed }) => pressedStyle(pressed)}
        >
          <Text style={[type.value, { color: theme.textMuted }]}>
            {t('intro.skip')}
          </Text>
        </Pressable>
      </View>

      <Pager
        index={index}
        count={SLIDE_COUNT}
        onIndexChange={setIndex}
        style={styles.pager}
      >
        {SLIDES.map(slide => (
          <View key={slide.title} style={styles.slide}>
            <View
              style={[
                styles.medallion,
                {
                  backgroundColor: theme.accentWash,
                  borderColor: theme.accentWashEdge,
                },
              ]}
            >
              <Icon
                name={slide.icon}
                size={34}
                color={theme.accent}
                strokeWidth={1.7}
              />
            </View>
            <Text style={[type.display, styles.title, { color: theme.text }]}>
              {t(slide.title)}
            </Text>
            <Text style={[type.lede, styles.body, { color: theme.textMuted }]}>
              {t(slide.body)}
            </Text>
          </View>
        ))}
      </Pager>

      <View style={[styles.bottom, { paddingBottom: space.sm + insets.bottom }]}>
        <View
          style={styles.dots}
          accessibilityRole="progressbar"
          accessibilityLabel={t('intro.progress', {
            n: index + 1,
            total: SLIDE_COUNT,
          })}
        >
          {SLIDES.map((slide, i) => (
            <Dot key={slide.title} active={i === index} />
          ))}
        </View>
        <Pressable
          onPress={next}
          accessibilityRole="button"
          accessibilityLabel={last ? t('intro.start') : t('intro.next')}
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: theme.accent },
            pressedStyle(pressed),
          ]}
        >
          <Text style={[type.cta, { color: theme.onAccent }]}>
            {last ? t('intro.start') : t('intro.next')}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xxl,
    paddingTop: space.xl,
  },
  /*
   * The pager is the only part that swipes, so it owns the flex: a slide fills
   * the height between the brand row and the dots, and the two of them stay
   * put while the middle moves.
   */
  pager: { flex: 1 },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xxl,
    gap: space.row,
  },
  medallion: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.gap,
  },
  title: { textAlign: 'center' },
  body: { textAlign: 'center', maxWidth: 300 },
  bottom: { paddingHorizontal: space.xxl },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    marginBottom: space.xl,
  },
  cta: {
    height: size.cta,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default IntroScreen;
