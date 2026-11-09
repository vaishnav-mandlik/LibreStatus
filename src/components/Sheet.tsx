import React, { useEffect, useMemo, useRef, useState } from 'react';
import { reapplySystemBars } from '../utils/native';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type DimensionValue,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './icons';
import { CSS_EASE, EASE, pressedStyle } from './ui';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { radius, size, space, type } from '../theme/tokens';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  /** Mono eyebrow under the grabber: "Sort by", "Language". */
  title?: string;
  children: React.ReactNode;
  /** Scrolls the content inside a sheet capped at `maxHeight` (the language sheet). */
  scroll?: boolean;
  maxHeight?: DimensionValue;
}

/**
 * Bottom sheet shell: scrim, well ground with 24px top corners, grabber and
 * eyebrow. Rows butt against the sheet edges, so the shell carries no side
 * padding; children inset themselves.
 *
 * The Modal stays mounted through the exit animation, which is why `shown`
 * lags `visible` on the way out.
 */
export const Sheet: React.FC<SheetProps> = ({
  visible,
  onClose,
  title,
  children,
  scroll,
  maxHeight = '74%',
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [shown, setShown] = useState(visible);
  // A shown sheet is a new window, and React Native gives it the system night
  // mode's navigation-bar icons. Once it exists, tell it what the app wants.
  useEffect(() => {
    if (shown) {
      void reapplySystemBars();
    }
  }, [shown]);
  const scrim = useRef(new Animated.Value(0)).current;
  const sheet = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShown(true);
      scrim.setValue(0);
      sheet.setValue(0);
      const enter = Animated.parallel([
        Animated.timing(scrim, {
          toValue: 1,
          duration: 160,
          easing: CSS_EASE,
          useNativeDriver: true,
        }),
        Animated.timing(sheet, {
          toValue: 1,
          duration: 240,
          easing: EASE,
          useNativeDriver: true,
        }),
      ]);
      enter.start();
      return () => enter.stop();
    }
    const exit = Animated.parallel([
      Animated.timing(scrim, {
        toValue: 0,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(sheet, {
        toValue: 0,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    exit.start(({ finished }) => {
      // A re-open mid-exit cancels this run; only a completed exit unmounts.
      // Stopping it on unmount takes the same branch, so a screen torn down
      // while its sheet is closing never sets state on a gone component.
      if (finished) {
        setShown(false);
      }
    });
    return () => exit.stop();
  }, [visible, scrim, sheet]);

  /**
   * Mounted, but on the way out.
   *
   * The Modal has to stay up for the exit animation, and every control in it
   * stayed live for those 160ms: a second tap on a confirm sheet's Remove ran
   * the action twice, and a stab at the scrim after picking an option was a
   * press on a sheet that is visibly leaving. Nothing in a closing sheet
   * should answer a touch.
   */
  const exiting = shown && !visible;

  /*
   * Held across renders.
   *
   * `Animated.View` memoises its `AnimatedProps` on the identity of the
   * animated nodes it is given, so a fresh `interpolate()` on every render
   * dropped the sheet's node graph and built another one — four calls into the
   * native animation module — every time the screen behind the sheet
   * re-rendered. That is not rare: picking a language writes a pref, and the
   * screen's re-render lands inside the sheet's own 160ms exit.
   */
  const lift = useMemo(
    () => sheet.interpolate({ inputRange: [0, 1], outputRange: [34, 0] }),
    [sheet],
  );

  return (
    <Modal
      visible={shown}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View
        pointerEvents={exiting ? 'none' : 'auto'}
        style={[styles.fill, { backgroundColor: theme.scrim, opacity: scrim }]}
      >
        <Pressable
          style={styles.fill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        />
      </Animated.View>
      <Animated.View
        pointerEvents={exiting ? 'none' : 'box-none'}
        style={[
          styles.host,
          {
            opacity: sheet,
            transform: [{ translateY: lift }],
          },
        ]}
      >
        <View style={[styles.sheet, { backgroundColor: theme.well, maxHeight }]}>
          <View style={styles.grabberRow}>
            <View style={[styles.grabber, { backgroundColor: theme.borderHi }]} />
          </View>
          {title ? (
            <View style={styles.eyebrow}>
              <Text style={[type.eyebrowBlock, { color: theme.textFaint }]}>
                {title}
              </Text>
            </View>
          ) : null}
          {scroll ? (
            <ScrollView
              style={styles.scroll}
              bounces={false}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          ) : (
            children
          )}
          <View style={{ height: Math.max(insets.bottom, space.huge) }} />
        </View>
      </Animated.View>
    </Modal>
  );
};

export interface SheetOption<T extends string> {
  value: T;
  label: string;
}

export interface OptionSheetProps<T extends string> {
  visible: boolean;
  title: string;
  options: Array<SheetOption<T>>;
  selected: T;
  onSelect: (value: T) => void;
  onClose: () => void;
  /** Language sheet: scrollable at 74% height with 15px option rows. */
  scroll?: boolean;
}

/** Single-choice list in a Sheet. Picking closes, and so does the scrim. */
export function OptionSheet<T extends string>({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
  scroll,
}: OptionSheetProps<T>) {
  const { theme } = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} title={title} scroll={scroll}>
      {options.map(option => {
        const on = option.value === selected;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              onSelect(option.value);
              onClose();
            }}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: on, checked: on }}
            style={({ pressed }) => [
              scroll ? styles.optionDense : styles.option,
              { borderTopColor: theme.hairline },
              pressedStyle(pressed),
            ]}
          >
            <Text
              style={[type.option, { color: on ? theme.text : theme.textMuted }]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
            {on ? <Icon name="check" size={16} color={theme.accent} strokeWidth={2.6} /> : null}
          </Pressable>
        );
      })}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject },
  // Fills the screen so the sheet's percentage maxHeight has something to
  // resolve against; taps outside the sheet fall through to the scrim.
  host: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingTop: 10,
  },
  grabberRow: { alignItems: 'center', paddingTop: 2, paddingBottom: space.row },
  grabber: { width: size.grabberW, height: size.grabberH, borderRadius: 2 },
  eyebrow: { paddingHorizontal: space.xl, paddingBottom: space.sm },
  // RN defaults flexShrink to 0, which would let the list push past maxHeight.
  scroll: { flexGrow: 0, flexShrink: 1 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.lg,
    paddingHorizontal: space.xl,
    borderTopWidth: 1,
  },
  /** Language sheet rows sit one pixel tighter in the prototype. */
  optionDense: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: space.xl,
    borderTopWidth: 1,
  },
});

export default Sheet;
