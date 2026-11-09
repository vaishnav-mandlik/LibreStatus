import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { radius, size, type } from '../theme/tokens';
import { Icon } from './icons';
import { CSS_EASE, pressedStyle } from './ui';
import type { GalleryContext } from './StatusGrid';

/** The prototype's `@keyframes sheetUp` starts 34px down. */
const SHEET_UP_FROM = 34;

/**
 * Runs one of the prototype's entrance keyframes once on mount, on CSS's
 * default `ease` curve: `fadeIn .18s both` for the header, `sheetUp .22s both`
 * for the tray.
 */
const useEnter = (duration: number): Animated.Value => {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const run = Animated.timing(value, {
      toValue: 1,
      duration,
      easing: CSS_EASE,
      useNativeDriver: true,
    });
    run.start();
    // Selection is left by a tap, a back press or a refresh landing, any of
    // which can unmount the tray a frame into its entrance.
    return () => run.stop();
  }, [value, duration]);
  return value;
};

export interface SelectionHeaderProps {
  count: number;
  /** Already formatted total of the selection ("10.1 MB"); shown once ≥1 is chosen. */
  sizeLabel: string;
  allSelected: boolean;
  onExit: () => void;
  onToggleAll: () => void;
}

/** Replaces the screen header while selecting: ×, count, size, Select all / Clear. */
export const SelectionHeader: React.FC<SelectionHeaderProps> = ({
  count,
  sizeLabel,
  allSelected,
  onExit,
  onToggleAll,
}) => {
  const { theme } = useTheme();
  const { t, tp } = useLanguage();
  const toggleLabel = allSelected ? t('select.clear') : t('select.all');
  const fade = useEnter(180);

  return (
    <Animated.View
      style={[styles.head, { borderBottomColor: theme.hairline, opacity: fade }]}
    >
      <View style={styles.headLeft}>
        <Pressable
          onPress={onExit}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.exitSelect')}
          style={({ pressed }) => [styles.close, pressedStyle(pressed)]}
        >
          <Icon name="close" size={19} color={theme.textSoft} strokeWidth={1.9} />
        </Pressable>
        <View style={styles.summary}>
          <Text style={[type.heading, { color: theme.text }]} numberOfLines={1}>
            {count > 0 ? tp('select.count', count) : t('select.title')}
          </Text>
          <Text style={[type.monoMd, { color: theme.textMuted }]} numberOfLines={1}>
            {count > 0 ? sizeLabel : t('select.hint')}
          </Text>
        </View>
      </View>
      <Pressable
        onPress={onToggleAll}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={toggleLabel}
        style={({ pressed }) => [pressedStyle(pressed)]}
      >
        <Text style={[type.chipActive, { color: theme.accent }]}>{toggleLabel}</Text>
      </Pressable>
    </Animated.View>
  );
};

export interface SelectionTrayProps {
  /** Feed saves, Library deletes. */
  context: GalleryContext;
  count: number;
  onPrimary: () => void;
  onVault: () => void;
  onShare: () => void;
  /**
   * Accessible name for the padlock button. The Library's Vault collection
   * sends the file back out to the gallery with it, so "Move to Vault" would
   * describe the opposite of what the tap does there; the glyph is the
   * design's either way.
   */
  vaultLabel?: string;
}

/**
 * Replaces the bottom nav while selecting. Every action stays disabled until
 * at least one item is chosen; Save and Delete also draw their empty state.
 */
export const SelectionTray: React.FC<SelectionTrayProps> = ({
  context,
  count,
  onPrimary,
  onVault,
  onShare,
  vaultLabel,
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const active = count > 0;
  const feed = context === 'feed';
  const rise = useEnter(220);
  /*
   * Held across renders: a fresh `interpolate()` each time would make
   * `Animated.View` drop and rebuild the tray's native transform graph, and
   * the tray re-renders on every tile tapped — including the taps that land
   * inside its own 220ms entrance.
   */
  const lift = useMemo(
    () => rise.interpolate({ inputRange: [0, 1], outputRange: [SHEET_UP_FROM, 0] }),
    [rise],
  );

  const primaryLabel = feed
    ? active
      ? t('select.saveN', { n: count })
      : t('select.save')
    : active
    ? t('select.deleteN', { n: count })
    : t('select.delete');
  const primaryFg = !active ? theme.textFaint : feed ? theme.onAccent : theme.dangerText;
  const primaryBg = !active ? theme.surface : feed ? theme.accent : theme.dangerSoft;

  return (
    <Animated.View
      style={[
        styles.tray,
        {
          backgroundColor: theme.well,
          paddingBottom: Math.max(insets.bottom, 14),
          opacity: rise,
          transform: [{ translateY: lift }],
        },
      ]}
    >
      <View style={styles.row}>
        <Pressable
          onPress={onPrimary}
          disabled={!active}
          accessibilityRole="button"
          accessibilityLabel={primaryLabel}
          accessibilityState={{ disabled: !active }}
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: primaryBg },
            !feed && {
              borderWidth: 1,
              borderColor: active ? theme.dangerEdge : theme.surface,
            },
            pressedStyle(pressed),
          ]}
        >
          <Icon
            name={feed ? 'download' : 'trash'}
            size={18}
            color={primaryFg}
            strokeWidth={feed ? 2.1 : 1.9}
          />
          <Text style={[type.action, { color: primaryFg }]} numberOfLines={1}>
            {primaryLabel}
          </Text>
        </Pressable>
        <Pressable
          onPress={onVault}
          disabled={!active}
          accessibilityRole="button"
          accessibilityLabel={vaultLabel ?? t('select.vault')}
          accessibilityState={{ disabled: !active }}
          style={({ pressed }) => [
            styles.square,
            { backgroundColor: theme.surface },
            pressedStyle(pressed),
          ]}
        >
          <Icon name="lock" size={18} color={theme.textSoft} strokeWidth={1.9} />
        </Pressable>
        <Pressable
          onPress={onShare}
          disabled={!active}
          accessibilityRole="button"
          accessibilityLabel={t('select.share')}
          accessibilityState={{ disabled: !active }}
          style={({ pressed }) => [
            styles.square,
            { backgroundColor: theme.surface },
            pressedStyle(pressed),
          ]}
        >
          <Icon name="share" size={18} color={theme.textSoft} strokeWidth={1.9} />
        </Pressable>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingHorizontal: 22,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  headLeft: { flexDirection: 'row', alignItems: 'center', gap: 15, flex: 1, minWidth: 0 },
  close: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  summary: { flex: 1, minWidth: 0, gap: 3 },
  tray: { paddingTop: 14, paddingHorizontal: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  primary: {
    flex: 1,
    height: size.trayBtn,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  square: {
    width: size.trayBtn,
    height: size.trayBtn,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
