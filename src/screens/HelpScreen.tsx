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
import {
  CSS_EASE,
  Card,
  Eyebrow,
  Row,
  ScreenHeader,
  pressedStyle,
} from '../components/ui';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { TOAST_BOTTOM, useFeedback, useToastBottom } from '../context/FeedbackContext';
import { space, type } from '../theme/tokens';
import { requestFolderAccess } from '../utils/folderPicker';
import { needsFolderPicker } from '../utils/permissions';
import type { TranslationKey } from '../i18n';

export interface HelpScreenProps {
  onClose: () => void;
}

const FAQ: Array<{ q: TranslationKey; a: TranslationKey }> = [
  { q: 'help.q1', a: 'help.a1' },
  { q: 'help.q2', a: 'help.a2' },
  { q: 'help.q3', a: 'help.a3' },
  { q: 'help.q4', a: 'help.a4' },
  { q: 'help.q5', a: 'help.a5' },
];

/**
 * The design has no Help screen, so it borrows Settings' chrome: the same
 * header, eyebrows, card and row metrics, with the answers folded away.
 */
const HelpScreen: React.FC<HelpScreenProps> = ({ onClose }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { showToast } = useFeedback();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState<number | null>(0);

  // An overlay like Settings: no bottom nav for the toast to clear.
  useToastBottom(TOAST_BOTTOM.settings);

  // Settings' chrome, including its `animation: fadeIn .2s both`.
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

  const repickFolder = useCallback(() => {
    requestFolderAccess('whatsapp')
      .then(uri => {
        if (!uri) {
          return;
        }
        showToast({
          message: t('toast.folderGranted'),
          meta: t('toast.metaSetup'),
          type: 'success',
        });
      })
      .catch((error: { code?: string }) => {
        // Backing out of the system picker is a choice, not a failure.
        if (error?.code === 'CANCELLED') {
          return;
        }
        showToast({
          message: t('onboard.failed'),
          meta: t('toast.metaSetup'),
          type: 'error',
        });
      });
  }, [showToast, t]);

  return (
    <Animated.View
      style={[styles.screen, { backgroundColor: theme.bg, opacity: fade }]}
    >
      <ScreenHeader
        title={t('help.title')}
        right={
          <Pressable
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            style={({ pressed }) => [styles.close, pressedStyle(pressed)]}
          >
            <Icon name="close" size={19} color={theme.textMuted} strokeWidth={1.9} />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <Eyebrow>{t('help.gettingStarted')}</Eyebrow>
        <View style={styles.block}>
          <Card>
            {FAQ.map((entry, index) => {
              const expanded = open === index;
              return (
                <View
                  key={entry.q}
                  style={[
                    styles.faq,
                    index < FAQ.length - 1 && styles.faqDivider,
                    { borderBottomColor: theme.hairline },
                  ]}
                >
                  {/* The question is the button; the answer is its own element.
                      With the whole row as one labelled Pressable, TalkBack
                      announced only the question and could never reach the
                      answer it had just expanded. */}
                  <Pressable
                    onPress={() => setOpen(expanded ? null : index)}
                    accessibilityRole="button"
                    accessibilityLabel={t(entry.q)}
                    accessibilityState={{ expanded }}
                    style={styles.faqHead}
                  >
                    <Text style={[type.rowTitle, styles.question, { color: theme.text }]}>
                      {t(entry.q)}
                    </Text>
                    <View style={expanded ? styles.chevronOpen : undefined}>
                      <Icon
                        name="chevronRight"
                        size={15}
                        color={theme.textFaint}
                        strokeWidth={2}
                      />
                    </View>
                  </Pressable>
                  {expanded ? (
                    <Text
                      accessibilityLiveRegion="polite"
                      style={[type.body, styles.answer, { color: theme.textMuted }]}
                    >
                      {t(entry.a)}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </Card>
        </View>

        {/* Only where a folder grant exists to reset — below Android 11 the
            picker takes an access the app never reads. */}
        {needsFolderPicker() ? (
          <>
            <Eyebrow>{t('help.troubleshooting')}</Eyebrow>
            <View style={[styles.list, { borderTopColor: theme.hairline }]}>
              <Row
                title={t('help.resetFolder')}
                subtitle={t('help.resetFolderBody')}
                onPress={repickFolder}
              />
            </View>
          </>
        ) : null}
      </ScrollView>
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
  faq: { padding: space.lg },
  faqDivider: { borderBottomWidth: 1 },
  faqHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  question: { flex: 1 },
  /** The prototype ships one chevron; open rows point it down. */
  chevronOpen: { transform: [{ rotate: '90deg' }] },
  answer: { marginTop: space.sm },
  list: { borderTopWidth: 1 },
});

export default HelpScreen;
