import React, { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/AntDesign';
import * as RNLocalize from 'react-native-localize';
import { useTheme } from '../context/ThemeContext';
import { getDefaultDialCode } from '../utils/countryDialCodes';
import { LanguageCode, useLanguage } from '../context/LanguageContext';
import { useFeedback } from '../context/FeedbackContext';

interface SettingsScreenProps {
  onClose: () => void;
  onNavigateToAbout?: () => void;
  onNavigateToHelp?: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onClose,
  onNavigateToAbout,
  onNavigateToHelp,
}) => {
  const { theme, themeMode, setThemeMode } = useTheme();
  const { language, setLanguage, t, options } = useLanguage();
  const { showMessage } = useFeedback();
  const [countryCode, setCountryCode] = useState(() =>
    getDefaultDialCode(RNLocalize.getCountry()),
  );
  const [dmPhone, setDmPhone] = useState('');
  const [dmMessage, setDmMessage] = useState('');
  const [isLanguageModalVisible, setLanguageModalVisible] = useState(false);

  const sanitizedCountryCode = useMemo(
    () => countryCode.replace(/[^\d]/g, ''),
    [countryCode],
  );
  const cleanedNumber = useMemo(() => dmPhone.replace(/[^\d]/g, ''), [dmPhone]);
  const fullPhoneNumber = useMemo(
    () => sanitizedCountryCode + cleanedNumber,
    [sanitizedCountryCode, cleanedNumber],
  );
  const canSendDirectMessage =
    sanitizedCountryCode.length >= 1 && cleanedNumber.length >= 6;

  const cycleThemeMode = useCallback(() => {
    if (themeMode === 'light') {
      setThemeMode('dark');
      return;
    }
    if (themeMode === 'dark') {
      setThemeMode('system');
      return;
    }
    setThemeMode('light');
  }, [setThemeMode, themeMode]);

  const themeLabel = useMemo(() => {
    if (themeMode === 'system') return t('settings.themeFollowSystem');
    if (themeMode === 'dark') return t('settings.themeDark');
    return t('settings.themeLight');
  }, [t, themeMode]);

  const themeChipText = useMemo(() => {
    if (themeMode === 'system') return t('settings.themeSystemShort');
    if (themeMode === 'dark') return t('settings.themeDarkShort');
    return t('settings.themeLightShort');
  }, [t, themeMode]);

  const selectedLanguageOption = useMemo(() => {
    return options.find(option => option.code === language) || options[0];
  }, [language, options]);

  const handleShareApp = useCallback(async () => {
    try {
      const downloadUrl =
        'https://f-droid.org/packages/com.vaishnavmandlik.librestatus/';
      const shareMessage = `${t(
        'settings.shareAppAlertMessage',
      )}\n\n${downloadUrl}`;

      await Share.share({
        message: shareMessage,
        title: t('settings.shareAppAlertTitle'),
      });
    } catch {
      showMessage({
        title: t('settings.shareAppAlertTitle'),
        message: t('settings.shareAppAlertMessage'),
        type: 'info',
      });
    }
  }, [showMessage, t]);

  const handleCountryCodeChange = useCallback((value: string) => {
    const digitsOnly = value.replace(/[^\d]/g, '');
    setCountryCode(digitsOnly ? `+${digitsOnly}` : '+');
  }, []);

  const handlePhoneNumberChange = useCallback((value: string) => {
    const digitsOnly = value.replace(/[^\d]/g, '');
    setDmPhone(digitsOnly);
  }, []);

  const handleDirectMessage = useCallback(async () => {
    if (!canSendDirectMessage) {
      showMessage({
        title: t('settings.directMessageAlertTitle'),
        message: t('settings.directMessageAlertMessage'),
        type: 'warning',
      });
      return;
    }

    const message = dmMessage.trim();
    const encodedMessage = encodeURIComponent(message);
    const nativeUrl = `whatsapp://send?phone=${fullPhoneNumber}&text=${encodedMessage}`;
    const webUrl = `https://wa.me/${fullPhoneNumber}?text=${encodedMessage}`;

    try {
      const supported = await Linking.canOpenURL(nativeUrl);
      if (supported) {
        await Linking.openURL(nativeUrl);
        return;
      }
      await Linking.openURL(webUrl);
    } catch {
      showMessage({
        title: t('settings.directMessageAlertTitle'),
        message: t('settings.directMessageWhatsappError'),
        type: 'error',
      });
    }
  }, [canSendDirectMessage, dmMessage, fullPhoneNumber, showMessage, t]);

  const handleLanguageSelect = useCallback(
    (code: LanguageCode) => {
      setLanguage(code);
      setLanguageModalVisible(false);
    },
    [setLanguage],
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {t('settings.title')}
        </Text>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('settings.accessibility.close')}
        >
          <Icon name="close" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.grow}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        <ScrollView
          style={styles.grow}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.row, { backgroundColor: theme.surface }]}
              onPress={cycleThemeMode}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('settings.accessibility.changeTheme')}
            >
              <View style={styles.rowLeft}>
                <View
                  style={[
                    styles.rowIcon,
                    { backgroundColor: theme.surfaceVariant },
                  ]}
                >
                  <Icon name="skin" size={18} color={theme.primary} />
                </View>
                <View style={styles.flexOne}>
                  <Text style={[styles.rowTitle, { color: theme.text }]}>
                    {t('settings.themeTitle')}
                  </Text>
                  <Text
                    style={[styles.rowSubtitle, { color: theme.textSecondary }]}
                  >
                    {themeLabel}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.valueChip,
                  { backgroundColor: theme.surfaceVariant },
                ]}
              >
                <Text style={[styles.valueChipText, { color: theme.primary }]}>
                  {themeChipText}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.rowIcon,
                    { backgroundColor: theme.surfaceVariant },
                  ]}
                >
                  <Icon name="earth" size={18} color={theme.primary} />
                </View>
                <View style={styles.flexOne}>
                  <Text
                    style={[
                      styles.cardSubtitle,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {t('settings.languageDescription')}
                  </Text>
                </View>
              </View>
              <View>
                <Text
                  style={[styles.dropdownLabel, { color: theme.textSecondary }]}
                >
                  {t('settings.languageSelectLabel')}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.dropdownField,
                    {
                      backgroundColor: theme.surfaceVariant,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => setLanguageModalVisible(true)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={t('settings.languageModalTitle')}
                >
                  <Text style={[styles.dropdownValue, { color: theme.text }]}>
                    {selectedLanguageOption.label}
                  </Text>
                  <Icon name="down" size={16} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.rowIcon,
                    { backgroundColor: theme.surfaceVariant },
                  ]}
                >
                  <Icon name="message1" size={18} color={theme.primary} />
                </View>
                <View style={styles.flexOne}>
                  <Text
                    style={[
                      styles.cardSubtitle,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {t('settings.directMessageCardSubtitle')}
                  </Text>
                </View>
              </View>

              <View style={styles.phoneRow}>
                <TextInput
                  style={[
                    styles.input,
                    styles.countryInput,
                    {
                      backgroundColor: theme.surfaceVariant,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  value={countryCode}
                  onChangeText={handleCountryCodeChange}
                  placeholder={t('settings.directMessageCountryPlaceholder')}
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="phone-pad"
                  returnKeyType="next"
                  maxLength={6}
                  accessibilityLabel="Country dial code"
                />

                <TextInput
                  style={[
                    styles.input,
                    styles.subscriberInput,
                    {
                      backgroundColor: theme.surfaceVariant,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  value={dmPhone}
                  onChangeText={handlePhoneNumberChange}
                  placeholder={t('settings.directMessageNumberPlaceholder')}
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="phone-pad"
                  returnKeyType="next"
                  maxLength={15}
                  accessibilityLabel="Phone number"
                />
              </View>

              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: theme.surfaceVariant,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                value={dmMessage}
                onChangeText={setDmMessage}
                placeholder={t('settings.directMessageMessagePlaceholder')}
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: canSendDirectMessage
                      ? theme.primary
                      : theme.border,
                  },
                ]}
                onPress={handleDirectMessage}
                disabled={!canSendDirectMessage}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSendDirectMessage }}
              >
                <View style={styles.primaryButtonContent}>
                  <Text style={styles.primaryButtonText}>
                    {t('settings.directMessageButton')}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.row, { backgroundColor: theme.surface }]}
              onPress={handleShareApp}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('settings.aboutShare')}
            >
              <View style={styles.rowLeft}>
                <View
                  style={[
                    styles.rowIcon,
                    { backgroundColor: theme.surfaceVariant },
                  ]}
                >
                  <Icon name="sharealt" size={18} color={theme.primary} />
                </View>
                <Text style={[styles.rowTitle, { color: theme.text }]}>
                  {t('settings.aboutShare')}
                </Text>
              </View>
              <Icon name="right" size={16} color={theme.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.row, { backgroundColor: theme.surface }]}
              onPress={onNavigateToHelp}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('settings.aboutHelp')}
            >
              <View style={styles.rowLeft}>
                <View
                  style={[
                    styles.rowIcon,
                    { backgroundColor: theme.surfaceVariant },
                  ]}
                >
                  <Icon
                    name="questioncircleo"
                    size={18}
                    color={theme.primary}
                  />
                </View>
                <Text style={[styles.rowTitle, { color: theme.text }]}>
                  {t('settings.aboutHelp')}
                </Text>
              </View>
              <Icon name="right" size={16} color={theme.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.row, { backgroundColor: theme.surface }]}
              onPress={() =>
                Linking.openURL('https://forms.gle/r5iuiKeWxaCe2T347')
              }
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Feedback"
            >
              <View style={styles.rowLeft}>
                <View
                  style={[
                    styles.rowIcon,
                    { backgroundColor: theme.surfaceVariant },
                  ]}
                >
                  <Icon name="message1" size={18} color={theme.primary} />
                </View>
                <Text style={[styles.rowTitle, { color: theme.text }]}>
                  Feedback
                </Text>
              </View>
              <Icon name="right" size={16} color={theme.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.row, { backgroundColor: theme.surface }]}
              onPress={onNavigateToAbout}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('settings.aboutTitle')}
            >
              <View style={styles.rowLeft}>
                <View
                  style={[
                    styles.rowIcon,
                    { backgroundColor: theme.surfaceVariant },
                  ]}
                >
                  <Icon name="infocirlceo" size={18} color={theme.primary} />
                </View>
                <Text style={[styles.rowTitle, { color: theme.text }]}>
                  {t('settings.aboutTitle')}
                </Text>
              </View>
              <Icon name="right" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>
              {t('settings.versionLabel')}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={isLanguageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <TouchableWithoutFeedback
          onPress={() => setLanguageModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View
                style={[styles.modalCard, { backgroundColor: theme.surface }]}
              >
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {t('settings.languageModalTitle')}
                </Text>
                {options.map(option => {
                  const isSelected = option.code === language;
                  return (
                    <TouchableOpacity
                      key={option.code}
                      style={[
                        styles.modalOption,
                        isSelected && {
                          backgroundColor: theme.surfaceVariant,
                        },
                      ]}
                      onPress={() => handleLanguageSelect(option.code)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[styles.modalOptionText, { color: theme.text }]}
                      >
                        {option.label}
                      </Text>
                      {isSelected && (
                        <Icon name="check" size={16} color={theme.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grow: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  section: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 8,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  rowSubtitle: {
    fontSize: 13,
    marginTop: 2,
    opacity: 0.8,
  },
  valueChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  valueChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    borderRadius: 14,
    padding: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 14,
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
    opacity: 0.8,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  countryInput: {
    width: 100,
    marginRight: 12,
    marginBottom: 0,
    textAlign: 'center',
  },
  subscriberInput: {
    flex: 1,
    marginBottom: 0,
  },
  textArea: {
    minHeight: 88,
  },
  primaryButton: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 6,
  },
  primaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonIcon: {
    marginLeft: 8,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 2,
  },
  footerText: {
    fontSize: 12,
    opacity: 0.5,
  },
  flexOne: {
    flex: 1,
  },
  dropdownLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  dropdownField: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 30, 0.45)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  modalCard: {
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    gap: 6,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  modalOptionText: {
    fontSize: 15,
    fontWeight: '500',
  },
});

export default SettingsScreen;
