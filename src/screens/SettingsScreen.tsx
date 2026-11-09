import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/icons';
import {
  CSS_EASE,
  Card,
  Eyebrow,
  Row,
  ScreenHeader,
  SegmentedControl,
  pressedStyle,
  type SegmentOption,
} from '../components/ui';
import { OptionSheet } from '../components/Sheet';
import { useTheme, type ThemeMode } from '../context/ThemeContext';
import { useLanguage, type LanguageCode } from '../context/LanguageContext';
import {
  TOAST_BOTTOM,
  useFeedback,
  useToastBottom,
} from '../context/FeedbackContext';
import {
  feedbackReport,
  openFeedbackMail,
  openStoreListing,
  STORE_WEB_URL,
} from '../utils/outbound';
import { needsFolderPicker } from '../utils/permissions';
import { space, type } from '../theme/tokens';
import { APP_VERSION, BRAND_FULL } from '../appInfo';
import type { Prefs } from '../utils/prefs';
import { setSecureFlag } from '../utils/native';
import type { MediaAccess } from '../utils/permissions';
import {
  peekGalleryAccess,
  requestGalleryAccess,
} from '../utils/statusManager';
import {
  hasFolderAccess,
  requestFolderAccess,
  subscribeFolderAccess,
} from '../utils/folderPicker';

export interface SettingsScreenProps {
  onClose: () => void;
  onOpenHelp: () => void;
  onOpenAbout: () => void;
  /**
   * Owned by the app shell. This screen must not load or persist prefs itself:
   * every holder of a full copy writes the whole record, so the last writer
   * silently reverted whatever the others had changed.
   */
  prefs: Prefs;
  onPrefsChange: (patch: Partial<Prefs>) => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onClose,
  onOpenHelp,
  onOpenAbout,
  prefs,
  onPrefsChange: update,
}) => {
  const { theme, themeMode, setThemeMode } = useTheme();
  const { t, language, setLanguage, options } = useLanguage();
  const { showToast } = useFeedback();
  const insets = useSafeAreaInsets();

  // No bottom nav behind this screen, so the toast sits near the edge.
  useToastBottom(TOAST_BOTTOM.settings);

  const [folderUri, setFolderUri] = useState<string | null>(null);
  /** Photo and video access; null until the first check answers. */
  const [mediaAccess, setMediaAccess] = useState<MediaAccess | null>(null);
  const [langSheet, setLangSheet] = useState(false);

  // The prototype's `animation: fadeIn .2s both` on this screen.
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const run = Animated.timing(fade, {
      toValue: 1,
      duration: 200,
      easing: CSS_EASE,
      useNativeDriver: true,
    });
    run.start();
    // This screen is an overlay: closing it during the fade left the run
    // driving a node that no longer exists, and its completion callback
    // firing into an unmounted tree.
    return () => run.stop();
  }, [fade]);

  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /*
   * Re-read on every grant change, not only at mount.
   *
   * The grant can go away while this screen is open: a listing that comes back
   * with the tree revoked drops the stored URI and wakes the shell, which
   * re-routes the tab behind Settings to onboarding. Read once, the row went on
   * showing "Android/media · granted" with its green dot over an app that had
   * already decided it had no folder — and closing Settings dropped the user
   * onto the picker the row had just told them was unnecessary. The same
   * subscription is what refreshes the row when the picker stores a new grant.
   */
  useEffect(() => {
    const read = (): void => {
      hasFolderAccess('whatsapp').then(folder => {
        if (mounted.current) {
          setFolderUri(folder);
        }
      });
    };
    read();
    return subscribeFolderAccess(read);
  }, []);

  // A check, never a prompt: the row only asks when tapped.
  useEffect(() => {
    peekGalleryAccess().then(held => {
      if (mounted.current) {
        setMediaAccess(held);
      }
    });
  }, []);

  const onMediaAccess = useCallback(() => {
    void (async () => {
      const next = await requestGalleryAccess();
      if (mounted.current) {
        setMediaAccess(next);
      }
    })();
  }, []);

  // ── Appearance ─────────────────────────────────────────────────────────────

  const themeOptions = useMemo<Array<SegmentOption<ThemeMode>>>(
    () => [
      { key: 'light', label: t('settings.themeLight'), icon: 'sun' },
      { key: 'dark', label: t('settings.themeDark'), icon: 'moon' },
      { key: 'system', label: t('settings.themeSystem'), icon: 'monitor' },
    ],
    [t],
  );

  const onThemeChange = useCallback(
    (mode: ThemeMode) => {
      setThemeMode(mode);
      // Only Light is announced: it is the switch that looks like nothing
      // happened until the whole app repaints.
      if (mode === 'light') {
        showToast({
          message: t('toast.lightTheme'),
          meta: t('toast.metaTheme'),
        });
      }
    },
    [setThemeMode, showToast, t],
  );

  // ── Privacy ────────────────────────────────────────────────────────────────

  const onHideRecents = useCallback(
    (next: boolean) => {
      update({ hideFromRecents: next });
      setSecureFlag(next).then(applied => {
        /*
         * The native flag is the truth. A call that did not go through means
         * FLAG_SECURE is not on this window, whichever way the switch was
         * moved — so the honest reading is off, not the opposite of what was
         * asked for. Writing `!next` meant *turning the switch off* on a build
         * that cannot apply the flag put it straight back on, leaving the app
         * claiming a blank recents preview it does not have.
         *
         * Deliberately NOT gated on this screen still being mounted. `update`
         * is the shell's setter, not local state, so calling it late is safe —
         * and the native call outlives a quick tap-and-close, so the guard
         * meant closing Settings before it answered persisted `true` for a
         * flag that was never applied. The switch then read "on" on every
         * later launch, promising a blank recents preview over a window that
         * still showed the user's statuses.
         */
        if (!applied) {
          update({ hideFromRecents: false });
        }
      });
    },
    [update],
  );

  const onPickFolder = useCallback(() => {
    requestFolderAccess('whatsapp')
      .then(uri => {
        if (!mounted.current || !uri) {
          return;
        }
        setFolderUri(uri);
        showToast({
          message: t('toast.folderGranted'),
          meta: t('toast.metaSetup'),
          type: 'success',
        });
      })
      .catch((error: { code?: string }) => {
        // Backing out of the system picker is a choice, not a failure.
        if (error?.code === 'CANCELLED' || !mounted.current) {
          return;
        }
        showToast({
          message: t('onboard.failed'),
          meta: t('toast.metaSetup'),
          type: 'error',
        });
      });
  }, [showToast, t]);

  // ── General ────────────────────────────────────────────────────────────────

  const languageOptions = useMemo(
    () => options.map(option => ({ value: option.code, label: option.label })),
    [options],
  );

  const languageLabel =
    options.find(option => option.code === language)?.label ?? language;

  /*
   * Rate and Feedback both hand a URL to Android rather than fetching anything
   * — this app holds no internet permission and is not about to start. Either
   * can find nothing installed that claims the scheme (no Play Store, no mail
   * client), and both say so instead of leaving the row looking dead.
   */
  const onRate = useCallback(() => {
    void (async () => {
      if (!(await openStoreListing())) {
        showToast({
          message: t('toast.noStore'),
          meta: t('toast.metaLink'),
          type: 'error',
        });
      }
    })();
  }, [showToast, t]);

  const onFeedback = useCallback(() => {
    void (async () => {
      if (await openFeedbackMail(t('feedback.subject'))) {
        return;
      }
      // No mail client: the share sheet carries the same report to whatever
      // the user does have. A dismissed sheet rejects on some Android builds,
      // which is not a failure worth a toast.
      Share.share({ message: feedbackReport(t('feedback.subject')) }).catch(
        () => {},
      );
    })();
  }, [t]);

  const onShare = useCallback(() => {
    /*
     * The one string in the app that is assembled here rather than looked up,
     * and the only one that travels to other apps and other people. It joins
     * with the middot the rest of the copy uses: an em dash was slipping the
     * one punctuation mark this app never writes into someone else's chat.
     *
     * The Play listing goes on its own line, as the https address rather
     * than market://: the person receiving it may open it in a chat app or on
     * a computer, where only the web address works, and on a phone Android
     * still hands it to the Play Store. It is the same address "Rate this
     * app" falls back to. Until the app is published, and during the closed
     * test for anyone who is not a tester, Play answers it with "not found".
     *
     * A dismissed share sheet rejects on some Android builds; that is not an
     * error worth surfacing.
     */
    Share.share({
      message: `${BRAND_FULL} · ${t('about.tagline')}\n${STORE_WEB_URL}`,
    }).catch(() => {});
  }, [t]);

  return (
    <Animated.View
      style={[styles.screen, { backgroundColor: theme.bg, opacity: fade }]}
    >
      <ScreenHeader
        title={t('settings.title')}
        right={
          <Pressable
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            style={({ pressed }) => [styles.close, pressedStyle(pressed)]}
          >
            <Icon
              name="close"
              size={19}
              color={theme.textMuted}
              strokeWidth={1.9}
            />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.block}>
          <Card padded>
            <Text style={[type.brandCard, styles.brand, { color: theme.text }]}>
              {t('brand.name')}
            </Text>
            <Text style={[type.body, { color: theme.textMuted }]}>
              {t('settings.aboutCard')}
            </Text>
          </Card>
        </View>

        <Eyebrow>{t('settings.appearance')}</Eyebrow>
        <View style={styles.block}>
          <SegmentedControl<ThemeMode>
            options={themeOptions}
            value={themeMode}
            onChange={onThemeChange}
            boldKey="dark"
          />
        </View>

        <Eyebrow>{t('settings.privacy')}</Eyebrow>
        <View style={[styles.list, { borderTopColor: theme.hairline }]}>
          <Row
            title={t('settings.hideRecents')}
            subtitle={t('settings.hideRecentsSub')}
            toggle={{
              value: prefs.hideFromRecents,
              onValueChange: onHideRecents,
            }}
          />
          {/* Below Android 11 there is no folder picker and no grant to
              show: statuses are read straight off the card with the storage
              permission. The row stood there permanently amber, saying the
              folder was "Not chosen yet", and tapping it took a tree grant
              nothing on that version ever reads. */}
          {needsFolderPicker() ? (
            <Row
              title={t('settings.statusFolder')}
              subtitle={
                folderUri
                  ? t('settings.folderGranted')
                  : t('settings.folderMissing')
              }
              dot={folderUri ? theme.accent : theme.warning}
              onPress={onPickFolder}
              subTight
            />
          ) : null}
          {/* Android 11 and up need no photo or video permission: the app
              only ever touches the copies it wrote itself, and MediaStore
              hands an app its own files. There is nothing here to grant or
              revoke, so the row would be a switch that does nothing. */}
          {needsFolderPicker() ? null : (
            <Row
              title={t('settings.mediaAccess')}
              subtitle={
                mediaAccess === 'none'
                  ? t('settings.mediaMissing')
                  : t('settings.mediaGranted')
              }
              dot={mediaAccess === 'none' ? theme.warning : theme.accent}
              onPress={onMediaAccess}
              subTight
              flat
            />
          )}
        </View>

        <Eyebrow style={styles.eyebrowSpaced}>{t('settings.general')}</Eyebrow>
        <View style={[styles.list, { borderTopColor: theme.hairline }]}>
          <Row
            title={t('settings.language')}
            subtitle={t('settings.languagesAvailable', { n: options.length })}
            value={languageLabel}
            onPress={() => setLangSheet(true)}
            subTight
          />
          <Row title={t('settings.rate')} onPress={onRate} singleLine flat />
          <Row
            title={t('settings.feedback')}
            onPress={onFeedback}
            singleLine
            flat
          />
          <Row
            title={t('settings.shareApp')}
            onPress={onShare}
            singleLine
            flat
          />
          <Row
            title={t('settings.help')}
            onPress={onOpenHelp}
            singleLine
            flat
          />
          <Row
            title={t('settings.legal')}
            onPress={onOpenAbout}
            singleLine
            flat
          />
        </View>

        <View style={styles.footer}>
          <Text style={[type.monoLight, { color: theme.textFaint }]}>
            {`${BRAND_FULL} ${APP_VERSION}`}
          </Text>
          <Text style={[type.footer, { color: theme.textFooter }]}>
            {t('settings.footer')}
          </Text>
          <Text style={[type.footer, { color: theme.textFooter }]}>
            {t('settings.madeBy')}
          </Text>
        </View>
      </ScrollView>

      <OptionSheet<LanguageCode>
        visible={langSheet}
        title={t('settings.language')}
        options={languageOptions}
        selected={language}
        onSelect={setLanguage}
        onClose={() => setLangSheet(false)}
        scroll
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  close: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Eyebrow carries its own side inset, so the blocks under it carry theirs. */
  block: { paddingHorizontal: space.xl, paddingBottom: space.xl },
  brand: { marginBottom: space.gap },
  list: { borderTopWidth: 1 },
  eyebrowSpaced: { paddingTop: space.xl },
  footer: {
    paddingTop: 20,
    paddingHorizontal: space.xl,
    paddingBottom: space.huge,
    alignItems: 'center',
    gap: space.xs,
  },
});

export default SettingsScreen;
