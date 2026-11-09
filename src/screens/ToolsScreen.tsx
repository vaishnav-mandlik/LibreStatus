import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import * as RNLocalize from 'react-native-localize';
import {
  Card,
  Chip,
  Eyebrow,
  PrimaryButton,
  ScreenHeader,
  Toggle,
  pressedStyle,
} from '../components/ui';
import {
  TOAST_BOTTOM,
  useFeedback,
  useToastBottom,
} from '../context/FeedbackContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { radius, size, space, type } from '../theme/tokens';
import { useKeyboardHeight, useKeyboardOverlap } from '../utils/keyboard';
import {
  formatDialCode,
  getDefaultDialCode,
  longestDialCodePrefix,
} from '../utils/countryDialCodes';
import { openSaveFolder, savesUnderDcim } from '../utils/native';
import { getStorageStats } from '../utils/statusManager';
import { formatBytesMB, formatBytesUniform } from '../utils/format';
import type { Prefs } from '../utils/prefs';
import type { AutoMode, StorageStats } from '../types';

export interface ToolsScreenProps {
  /**
   * Unused and optional: the design has no settings button on Tools. Kept so
   * the shell can keep wiring every screen the same way.
   */
  onOpenSettings?: () => void;
  /**
   * Prefs are owned by the app shell. This screen must not load or persist
   * them itself: three components each holding a full copy and writing it
   * whole meant the last writer silently reverted the others' changes.
   */
  prefs: Prefs;
  onPrefsChange: (patch: Partial<Prefs>) => void;
}

const AUTO_MODES: AutoMode[] = ['both', 'photos', 'videos'];

const MODE_KEYS = {
  both: 'tools.modeBoth',
  photos: 'tools.modePhotos',
  videos: 'tools.modeVideos',
} as const;

/** A WhatsApp link is only worth opening once a subscriber number is plausible. */
const MIN_PHONE_DIGITS = 6;

const digitsOnly = (raw: string): string => raw.replace(/\D/g, '');

/**
 * Dial codes whose national numbers keep their leading zero.
 *
 * Italy is the standing exception to the trunk-prefix rule below: +39 numbers
 * are written and dialled with the 0 in place.
 */
const KEEPS_LEADING_ZERO = new Set(['39']);

/**
 * The subscriber digits as `wa.me` needs them.
 *
 * Almost everywhere a number is written down with a trunk prefix — 07911… in
 * the UK, 0812… in Indonesia — that is dropped in front of the country code.
 * Pasting one in as typed produced `wa.me/4407911…`, which is not a number at
 * all: WhatsApp answers "the phone number shared via url is invalid" and the
 * user has no way to tell what went wrong.
 */
export const toSubscriberDigits = (dial: string, phone: string): string =>
  KEEPS_LEADING_ZERO.has(dial) ? phone : phone.replace(/^0+/, '');

/** CSS `animation: fadeIn .2s both`: 200ms on the default `ease` curve. */
const FADE_EASE = Easing.bezier(0.25, 0.1, 0.25, 1);

/** The prototype's `animation: fadeIn .2s both`. */
const FadeIn: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}> = ({ children, style }) => {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const run = Animated.timing(value, {
      toValue: 1,
      duration: 200,
      easing: FADE_EASE,
      useNativeDriver: true,
    });
    run.start();
    // The auto-save detail block fades in on a toggle and is unmounted by the
    // very next one, so an unstopped run outlives its view.
    return () => run.stop();
  }, [value]);
  return (
    <Animated.View style={[style, { opacity: value }]}>
      {children}
    </Animated.View>
  );
};

/**
 * The device's region, or undefined when it cannot be had.
 *
 * `getCountry` reads a native constant, and every other call into this library
 * is wrapped for the same reason: the module can be missing from a build and
 * the constant can be unset. This one runs inside Tools' first render, so a
 * throw took the whole tab down instead of leaving the code field empty —
 * which is a state the screen already handles and explains at the button.
 */
const deviceCountry = (): string | undefined => {
  try {
    return RNLocalize.getCountry();
  } catch {
    return undefined;
  }
};

const ToolsScreen: React.FC<ToolsScreenProps> = ({
  prefs,
  onPrefsChange: update,
}) => {
  const { theme, isDark } = useTheme();
  // The light theme's green top bar, matching the Feed; see FeedScreen.
  const tinted = !isDark;
  const { t, tp } = useLanguage();
  const { showToast } = useFeedback();

  const [phone, setPhone] = useState('');

  /** Resolved once: the SIM/locale country cannot change mid-session. */
  const [detectedDial] = useState(() => getDefaultDialCode(deviceCountry()));

  /** Guards the seed below so it can only ever run on the first render. */
  const seeded = useRef(false);

  /*
   * A stored dial code always wins; otherwise seed the field once from the
   * device country so the common case needs no typing.
   *
   * The one-shot guard is what keeps this from fighting the user: an effect
   * keyed on the value it writes re-seeds the field the instant it is cleared,
   * so the digits could never be deleted.
   */
  useEffect(() => {
    if (seeded.current) {
      return;
    }
    seeded.current = true;
    // A detected code with no digits ("+" — the device region is not in the
    // table) is nothing to seed: writing it would spend a prefs write on every
    // visit to this screen and still leave the field where it started.
    // Only a code that was never set. A field the user cleared is stored as
    // "+" (formatDialCode's empty form) and must stay cleared: seeding it
    // again on every visit to Tools put back the digits they had just deleted.
    if (prefs.dialCode === '' && digitsOnly(detectedDial)) {
      update({ dialCode: detectedDial });
    }
  }, [prefs.dialCode, detectedDial, update]);

  /**
   * Storage figures for the section below. Read once per mount and after any
   * action that changes them; the read walks the album and the vault, so it
   * must never sit in the render path.
   */
  const [stats, setStats] = useState<StorageStats | null>(null);
  const mounted = useRef(true);

  /*
   * The number field is the last thing on this screen, so the keyboard lands
   * squarely on it. `scrollBox` is what the overlap is measured against (the
   * tab bar below it is already behind the keyboard and must not be counted
   * twice), and the list is scrolled to its end once the padding is in place.
   */
  const scrollBox = useRef<View>(null);
  const scroller = useRef<ScrollView>(null);
  const keyboardOverlap = useKeyboardOverlap(scrollBox);
  const keyboardHeight = useKeyboardHeight();

  /*
   * Scrolled when the content has actually grown, not when the padding is
   * committed: `scrollToEnd` works off the native content size, which is a
   * layout pass behind, so scrolling straight from the effect stopped about
   * 45px short and left the button's bottom edge under the keyboard.
   */
  const scrollToFieldIfCovered = useCallback(() => {
    if (keyboardOverlap > 0) {
      scroller.current?.scrollToEnd({ animated: true });
    }
  }, [keyboardOverlap]);

  /*
   * Every toast this screen raises is about the number being typed, so it has
   * to clear the keyboard too. "Add a country code first" was landing behind
   * it, which made Open chat look like a dead button.
   */
  useToastBottom(TOAST_BOTTOM.nav + keyboardHeight);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** Photos and videos share one unit so the legend reads as a single bar. */
  const [photoLabel, videoLabel] = formatBytesUniform([
    stats?.photoBytes ?? 0,
    stats?.videoBytes ?? 0,
  ]);

  const readStats = useCallback(async () => {
    try {
      const next = await getStorageStats();
      if (mounted.current) {
        setStats(next);
      }
    } catch {
      // Storage figures are informational; a failed read just leaves the card
      // showing what it had.
    }
  }, []);

  useEffect(() => {
    void readStats();
  }, [readStats]);

  const toggleAuto = useCallback(() => {
    const next = !prefs.autoSave;
    update({ autoSave: next });
    showToast({
      message: t(next ? 'toast.autoOn' : 'toast.autoOff'),
      meta: t('toast.metaTools'),
    });
  }, [prefs.autoSave, showToast, t, update]);

  const toggleAutoVault = useCallback(() => {
    update({ autoVault: !prefs.autoVault });
  }, [prefs.autoVault, update]);

  /** Anything but digits is dropped; `formatDialCode` puts the "+" back. */
  const changeDial = useCallback(
    (next: string) => update({ dialCode: formatDialCode(next) }),
    [update],
  );

  /**
   * The number field. A number pasted in international form — "+44 7911
   * 123456" from Contacts, or "0044…" — carries its country code, which
   * belongs in the field beside this one: folded into the digits it was
   * dialled twice ("+44 44 7911…") and opened a chat with nobody.
   */
  const changePhone = useCallback(
    (next: string) => {
      const trimmed = next.trim();
      const international = trimmed.startsWith('+') || trimmed.startsWith('00');
      const digits = digitsOnly(
        trimmed.startsWith('00') ? trimmed.slice(2) : trimmed,
      );
      if (!international) {
        setPhone(digits);
        return;
      }
      const dial = digitsOnly(prefs.dialCode);
      if (dial && digits.startsWith(dial)) {
        setPhone(digits.slice(dial.length));
        return;
      }
      const known = longestDialCodePrefix(digits);
      if (known) {
        update({ dialCode: `+${known}` });
        setPhone(digits.slice(known.length));
        return;
      }
      setPhone(digits);
    },
    [prefs.dialCode, update],
  );

  const changeFolder = useCallback(async () => {
    // No file manager answered the album intent: point the user at Files
    // rather than leaving the tap looking broken.
    if (!(await openSaveFolder())) {
      showToast({
        message: t('toast.chooseFolder'),
        meta: t('toast.metaStorage'),
      });
    }
  }, [showToast, t]);

  const phoneDigits = digitsOnly(phone);
  const dialDigits = digitsOnly(prefs.dialCode);
  /**
   * What the button *looks* like is the phone field alone, exactly as the
   * prototype has it (`logic.js:588` — `dmBg`/`dmFg` key off
   * `phone.length >= 6` and nothing else). The missing-dial-code case is a
   * guard inside `openChat`, not a second reason to grey the button out:
   * making it part of this expression repainted the button in a state the
   * design paints accent.
   */
  const phoneReady = phoneDigits.length >= MIN_PHONE_DIGITS;

  const openChat = useCallback(async () => {
    if (!phoneReady) {
      showToast({ message: t('toast.needDigits'), meta: t('toast.metaCheck') });
      return;
    }
    /*
     * Without a country code `wa.me` resolves the number against whatever
     * country the recipient's own account is in, which silently opens a chat
     * with a stranger. The number is long enough, so the button is painted
     * live; this explains the one thing still missing.
     */
    if (!dialDigits) {
      showToast({
        message: t('toast.needDialCode'),
        meta: t('toast.metaCheck'),
      });
      return;
    }
    // Nothing but a trunk prefix was typed, so there is no number to open.
    const subscriber = toSubscriberDigits(dialDigits, phoneDigits);
    if (!subscriber) {
      showToast({ message: t('toast.needDigits'), meta: t('toast.metaCheck') });
      return;
    }
    showToast({
      message: t('toast.openingChat', {
        number: `${prefs.dialCode} ${subscriber}`,
      }),
      meta: t('toast.metaChat'),
    });
    const target = `${dialDigits}${subscriber}`;
    try {
      const deepLink = `whatsapp://send?phone=${target}`;
      if (!(await Linking.canOpenURL(deepLink))) {
        throw new Error('scheme unavailable');
      }
      await Linking.openURL(deepLink);
    } catch {
      // The wa.me handoff still works where the custom scheme is unregistered.
      try {
        await Linking.openURL(`https://wa.me/${target}`);
      } catch {
        showToast({
          message: t('toast.whatsappMissing'),
          meta: t('toast.metaCheck'),
        });
      }
    }
  }, [phoneReady, dialDigits, phoneDigits, prefs.dialCode, showToast, t]);

  return (
    <FadeIn style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScreenHeader title={t('nav.tools')} subtitle={t('tools.subtitle')} tinted={tinted} />

      {/*
        The keyboard is drawn over this box, not under it: from Android 15 the
        system ignores `adjustResize` for apps that draw edge to edge, so the
        window no longer shrinks. The list carries the overlap as padding and
        scrolls the field it covers back into sight.
      */}
      <View style={styles.scroll} ref={scrollBox}>
        <ScrollView
          ref={scroller}
          style={styles.scroll}
          contentContainerStyle={{
            // A little more than the overlap: `scrollToEnd` lands a few points
            // short of the very end, which left the button's bottom edge
            // tucked under the keyboard.
            paddingBottom: keyboardOverlap > 0 ? keyboardOverlap + space.xl : 0,
          }}
          onContentSizeChange={scrollToFieldIfCovered}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Eyebrow>{t('tools.autoSave')}</Eyebrow>
          <View style={styles.block}>
            <Card>
              <Pressable
                onPress={toggleAuto}
                accessibilityRole="switch"
                accessibilityLabel={t('tools.autoTitle')}
                accessibilityHint={t('tools.autoSub')}
                accessibilityState={{ checked: prefs.autoSave }}
                style={({ pressed }) => [styles.cardRow, pressedStyle(pressed)]}
              >
                <View style={styles.cardRowText}>
                  <Text style={[type.rowTitle, { color: theme.text }]}>
                    {t('tools.autoTitle')}
                  </Text>
                  <Text style={[type.small, { color: theme.textMuted }]}>
                    {t('tools.autoSub')}
                  </Text>
                </View>
                {/* The whole row is the switch; the pill is only its indicator. */}
                <Toggle value={prefs.autoSave} />
              </Pressable>

              {prefs.autoSave ? (
                <FadeIn
                  style={[
                    styles.autoDetail,
                    { borderTopColor: theme.hairline },
                  ]}
                >
                  <Text style={[type.eyebrowSm, { color: theme.textFaint }]}>
                    {t('tools.whatToKeep')}
                  </Text>
                  <View style={styles.modes}>
                    {AUTO_MODES.map(mode => (
                      <Chip
                        key={mode}
                        grow
                        label={t(MODE_KEYS[mode])}
                        active={prefs.autoMode === mode}
                        onPress={() => update({ autoMode: mode })}
                      />
                    ))}
                  </View>
                  <Pressable
                    onPress={toggleAutoVault}
                    accessibilityRole="switch"
                    accessibilityLabel={t('tools.autoVault')}
                    accessibilityState={{ checked: prefs.autoVault }}
                    style={({ pressed }) => [
                      styles.vaultRow,
                      { borderTopColor: theme.hairline },
                      pressedStyle(pressed),
                    ]}
                  >
                    <Text style={[type.subRow, { color: theme.textSoft }]}>
                      {t('tools.autoVault')}
                    </Text>
                    <Toggle small value={prefs.autoVault} />
                  </Pressable>
                </FadeIn>
              ) : null}
            </Card>
          </View>

          <Eyebrow>{t('tools.whereSaves')}</Eyebrow>
          <View style={styles.block}>
            <Card>
              <Pressable
                onPress={() => {
                  changeFolder();
                }}
                accessibilityRole="button"
                accessibilityLabel={t('tools.change')}
                accessibilityHint={t('tools.saveFolder')}
                // The path is the point of the row, and a labelled Pressable
                // reads nothing else out: this is how a screen reader hears it.
                accessibilityValue={{
                  text: t(
                    savesUnderDcim()
                      ? 'tools.savePath'
                      : 'tools.savePathLegacy',
                  ),
                }}
                style={({ pressed }) => [styles.cardRow, pressedStyle(pressed)]}
              >
                <View style={styles.folderText}>
                  <Text style={[type.rowTitle, { color: theme.text }]}>
                    {t('tools.saveFolder')}
                  </Text>
                  <Text
                    style={[type.monoMd, { color: theme.textMuted }]}
                    numberOfLines={1}
                  >
                    {t(
                      savesUnderDcim()
                        ? 'tools.savePath'
                        : 'tools.savePathLegacy',
                    )}
                  </Text>
                </View>
                <Text style={[type.chipActive, { color: theme.accent }]}>
                  {t('tools.change')}
                </Text>
              </Pressable>
            </Card>
          </View>

          <Eyebrow>{t('tools.storage')}</Eyebrow>
          <View style={styles.block}>
            <Card padded>
              <View style={styles.statRow}>
                {/* Until the read lands there is no figure to state. It
                    used to render a formatted zero, so a large library showed
                    "0.0 MB kept · 0 files" for as long as the album took to
                    read, next to a Library tab listing every one of them. */}
                <Text style={[type.cardTitle, { color: theme.text }]}>
                  {stats
                    ? t('tools.usedTotal', {
                        size: formatBytesMB(stats.totalBytes),
                      })
                    : t('tools.storageReading')}
                </Text>
                <Text style={[type.monoMeta, { color: theme.textFaint }]}>
                  {stats ? tp('tools.filesKept', stats.savedCount) : ''}
                </Text>
              </View>
              {/* Photos vs videos, as one bar: two flex weights, so an empty
                  library leaves the track showing rather than a stray sliver. */}
              <View style={[styles.meter, { backgroundColor: theme.surface }]}>
                <View
                  style={{
                    flex: stats?.photoBytes ?? 0,
                    backgroundColor: theme.accent,
                  }}
                />
                <View
                  style={{
                    flex: stats?.videoBytes ?? 0,
                    backgroundColor: theme.accentWashEdge,
                  }}
                />
              </View>
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.dot, { backgroundColor: theme.accent }]}
                  />
                  <Text style={[type.small, { color: theme.textMuted }]}>
                    {t('tools.photosShare', { size: photoLabel })}
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: theme.accentWashEdge },
                    ]}
                  />
                  <Text style={[type.small, { color: theme.textMuted }]}>
                    {t('tools.videosShare', { size: videoLabel })}
                  </Text>
                </View>
              </View>
            </Card>
          </View>

          <Eyebrow>{t('tools.message')}</Eyebrow>
          <View style={styles.dm}>
            <Text
              style={[
                type.paragraph,
                styles.dmBody,
                { color: theme.textMuted },
              ]}
            >
              {t('tools.dmBody')}
            </Text>
            <View style={[styles.field, { backgroundColor: theme.well }]}>
              <TextInput
                value={prefs.dialCode}
                onChangeText={changeDial}
                keyboardType="phone-pad"
                accessibilityLabel={t('tools.dialCode')}
                style={[
                  type.monoInput,
                  styles.dial,
                  { color: theme.textMuted },
                ]}
              />
              <View
                style={[styles.divider, { backgroundColor: theme.borderHi }]}
              />
              <TextInput
                value={phone}
                onChangeText={changePhone}
                keyboardType="phone-pad"
                placeholder={t('tools.phonePlaceholder')}
                placeholderTextColor={theme.placeholder}
                accessibilityLabel={t('tools.phonePlaceholder')}
                style={[
                  type.monoInput,
                  styles.phone,
                  { color: theme.textSoft },
                ]}
              />
            </View>
            {/* Stays pressable when short so the too-few-digits toast can explain. */}
            <PrimaryButton
              label={t('tools.openChat')}
              onPress={() => {
                openChat();
              }}
              inactive={!phoneReady}
              style={styles.openChat}
            />
          </View>
        </ScrollView>
      </View>
    </FadeIn>
  );
};

const styles = StyleSheet.create({
  /** Storage card: the big figure and the "N files" tag share a baseline. */
  statRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: space.row,
  },
  meter: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    gap: 2,
  },
  legendRow: { flexDirection: 'row', gap: space.lg, marginTop: 13 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: space.tight },
  dot: { width: 7, height: 7, borderRadius: 2 },
  screen: { flex: 1 },
  scroll: { flex: 1 },

  block: { paddingHorizontal: space.xl, paddingBottom: space.xl },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: space.lg,
  },
  cardRowText: { flex: 1, minWidth: 0, gap: 3, paddingRight: space.row },

  autoDetail: {
    borderTopWidth: 1,
    paddingVertical: space.row,
    paddingHorizontal: space.lg,
  },
  modes: { flexDirection: 'row', gap: space.xs, marginTop: 11 },
  vaultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.lg,
    paddingTop: space.row,
    borderTopWidth: 1,
  },

  folderText: { flex: 1, minWidth: 0, gap: 5, paddingRight: space.row },

  dm: { paddingHorizontal: space.xl, paddingBottom: 30 },
  dmBody: { marginBottom: space.row },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: size.viewerBtn,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  dial: {
    width: 62,
    height: size.viewerBtn,
    paddingVertical: 0,
    paddingLeft: space.lg,
    paddingRight: 0,
    textAlignVertical: 'center',
  },
  divider: { width: 1, height: 22 },
  phone: {
    flex: 1,
    minWidth: 0,
    height: size.viewerBtn,
    paddingVertical: 0,
    paddingHorizontal: space.lg,
    textAlignVertical: 'center',
  },
  openChat: { marginTop: space.sm },
});

export default ToolsScreen;
