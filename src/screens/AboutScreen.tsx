import React, { useEffect, useRef } from 'react';
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
  ScreenHeader,
  pressedStyle,
} from '../components/ui';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { TOAST_BOTTOM, useToastBottom } from '../context/FeedbackContext';
import { space, type } from '../theme/tokens';
import { APP_VERSION, BRAND_FULL } from '../appInfo';
import type { TranslationKey } from '../i18n';

export interface AboutScreenProps {
  onClose: () => void;
}

const SECTIONS: Array<{ heading: TranslationKey; body: TranslationKey }> = [
  { heading: 'about.privacyHeading', body: 'about.privacyBody' },
  { heading: 'about.dataHeading', body: 'about.dataBody' },
  { heading: 'about.termsHeading', body: 'about.termsBody' },
];

/** Same chrome as Settings: header, brand card, eyebrows, 16px cards. */
const AboutScreen: React.FC<AboutScreenProps> = ({ onClose }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

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

  return (
    <Animated.View
      style={[styles.screen, { backgroundColor: theme.bg, opacity: fade }]}
    >
      <ScreenHeader
        title={t('about.title')}
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
        <View style={styles.block}>
          <Card padded>
            <Text style={[type.brandCard, styles.brand, { color: theme.text }]}>
              {t('brand.name')}
            </Text>
            <Text style={[type.body, { color: theme.textMuted }]}>
              {t('about.tagline')}
            </Text>
          </Card>
        </View>

        {SECTIONS.map(section => (
          <React.Fragment key={section.heading}>
            <Eyebrow>{t(section.heading)}</Eyebrow>
            <View style={styles.block}>
              <Card padded>
                <Text style={[type.body, { color: theme.textMuted }]}>
                  {t(section.body)}
                </Text>
              </Card>
            </View>
          </React.Fragment>
        ))}

        <View style={styles.footer}>
          <Text style={[type.small, styles.disclaimer, { color: theme.textFaint }]}>
            {t('about.disclaimer')}
          </Text>
          <Text style={[type.monoLight, { color: theme.textFaint }]}>
            {`${BRAND_FULL} ${APP_VERSION}`}
          </Text>
        </View>
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
  brand: { marginBottom: space.gap },
  footer: {
    paddingTop: 20,
    paddingHorizontal: space.xl,
    paddingBottom: space.huge,
    alignItems: 'center',
    gap: space.xs,
  },
  disclaimer: { textAlign: 'center', marginBottom: space.sm },
});

export default AboutScreen;
