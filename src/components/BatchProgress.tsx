import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Modal, StyleSheet, Text, View } from 'react-native';
import { CSS_EASE, EASE } from './ui';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { radius, space, type } from '../theme/tokens';
import { reapplySystemBars } from '../utils/native';

export interface BatchProgressProps {
  visible: boolean;
  done: number;
  total: number;
}

/**
 * Blocking progress for a multi-file save.
 *
 * The gallery takes files one at a time and a video can take a moment, so a
 * batch is several seconds of apparent nothing. Blocking is deliberate: the
 * list underneath is about to be re-marked, and a tap into it mid-write
 * invites exactly the stale-state bugs this rewrite removes.
 */
export const BatchProgress: React.FC<BatchProgressProps> = ({ visible, done, total }) => {
  // Same as Sheet: the overlay is its own window and starts with the system
  // night mode's bar icons, not the app theme's.
  useEffect(() => {
    if (visible) {
      void reapplySystemBars();
    }
  }, [visible]);
  const { theme } = useTheme();
  const { t } = useLanguage();
  const fill = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const scrim = useRef(new Animated.Value(0)).current;
  const ratio = total > 0 ? Math.min(done / total, 1) : 0;

  // Snap back when a batch ends so the next one does not open at the old fill
  // and appear to drain backwards.
  useEffect(() => {
    if (!visible) {
      fill.setValue(0);
      ring.setValue(0);
      scrim.setValue(0);
      return undefined;
    }
    // The prototype's `fadeIn .16s` on the scrim and `ringIn .28s` on the card.
    const enter = Animated.parallel([
      Animated.timing(scrim, {
        toValue: 1,
        duration: 160,
        easing: CSS_EASE,
        useNativeDriver: true,
      }),
      Animated.timing(ring, {
        toValue: 1,
        duration: 280,
        easing: EASE,
        useNativeDriver: true,
      }),
    ]);
    enter.start();
    // A batch of one can be over before the card has finished arriving.
    return () => enter.stop();
  }, [visible, fill, ring, scrim]);

  useEffect(() => {
    if (!visible) {
      return undefined;
    }
    const grow = Animated.timing(fill, {
      toValue: ratio,
      duration: 300,
      easing: EASE,
      // Width cannot go through the native driver.
      useNativeDriver: false,
    });
    grow.start();
    // On the JS driver, so an unstopped run keeps a frame callback alive
    // against a card the batch has already dismissed — the last step of a
    // save is 300ms of fill and the overlay closes the moment it lands.
    return () => grow.stop();
  }, [visible, ratio, fill]);

  /*
   * Held across renders. The card re-renders on every file the batch finishes
   * — that is what `done` is — and a fresh `interpolate()` each time dropped
   * and rebuilt both animated graphs while the ring was still arriving and the
   * bar was mid-grow.
   */
  const pop = useMemo(
    () => ring.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
    [ring],
  );
  const width = useMemo(
    () => fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
    [fill],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      // Swallows the back press: cancelling mid-write would leave the library
      // half-updated with no clean way to report what landed.
      onRequestClose={() => {}}
    >
      <Animated.View
        style={[styles.scrim, { backgroundColor: theme.scrimHeavy, opacity: scrim }]}
      >
        <Animated.View
          // The overlay blocks every control underneath it, so a screen
          // reader has to be told what is holding the app and how far along
          // it is; without this it announces an empty window.
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={t('batch.title')}
          accessibilityValue={{ min: 0, max: Math.max(total, 1), now: done }}
          accessibilityLiveRegion="polite"
          style={[
            styles.card,
            {
              backgroundColor: theme.well,
              opacity: ring,
              transform: [{ scale: pop }],
            },
          ]}
        >
          <View style={styles.head}>
            <Text style={[type.cardTitle, { color: theme.text }]}>{t('batch.title')}</Text>
            <Text style={[type.monoLg, { color: theme.accent }]}>
              {t('batch.progress', { done, total })}
            </Text>
          </View>
          <View style={[styles.track, { backgroundColor: theme.surface }]}>
            <Animated.View
              style={[
                styles.fill,
                {
                  backgroundColor: theme.accent,
                  width,
                },
              ]}
            />
          </View>
          <Text style={[type.bodySm, styles.body, { color: theme.textMuted }]}>
            {t('batch.body')}
          </Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.huge,
  },
  card: { width: '100%', borderRadius: radius.batch, padding: 24 },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: space.lg,
  },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  body: { marginTop: space.row },
});

export default BatchProgress;
