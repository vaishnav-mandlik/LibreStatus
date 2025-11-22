import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/AntDesign';
import { useTheme } from '../context/ThemeContext';

interface SettingsScreenProps {
  onClose: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onClose }) => {
  const { theme, themeMode, setThemeMode, isDark } = useTheme();

  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [notifyOnNewStatus, setNotifyOnNewStatus] = useState(false);
  const [autoCleanEnabled, setAutoCleanEnabled] = useState(true);
  const [dmPhone, setDmPhone] = useState('');
  const [dmMessage, setDmMessage] = useState('');

  const cleanedPhone = useMemo(() => dmPhone.replace(/[^\d]/g, ''), [dmPhone]);
  const canSendDirectMessage = cleanedPhone.length >= 8;
  const primaryButtonDynamicStyle = useMemo(
    () => ({
      backgroundColor: canSendDirectMessage ? theme.primary : theme.border,
      opacity: canSendDirectMessage ? 1 : 0.7,
    }),
    [canSendDirectMessage, theme.border, theme.primary],
  );

  const handleThemeChange = useCallback(() => {
    if (themeMode === 'light') {
      setThemeMode('dark');
    } else if (themeMode === 'dark') {
      setThemeMode('system');
    } else {
      setThemeMode('light');
    }
  }, [setThemeMode, themeMode]);

  const getThemeLabel = useCallback(() => {
    if (themeMode === 'system') return 'Auto (System)';
    return themeMode === 'dark' ? 'Dark Mode' : 'Light Mode';
  }, [themeMode]);

  const openExternalLink = useCallback(
    async (url: string, fallbackMessage: string) => {
      try {
        const supported = await Linking.canOpenURL(url);
        if (!supported) {
          Alert.alert('Unavailable', fallbackMessage);
          return;
        }
        await Linking.openURL(url);
      } catch {
        Alert.alert('Unavailable', fallbackMessage);
      }
    },
    [],
  );

  const handleClearCache = useCallback(() => {
    Alert.alert(
      'Cleanup Scheduled',
      'Saved statuses will be tidied during the next maintenance cycle.',
    );
  }, []);

  const handleShareApp = useCallback(() => {
    Alert.alert(
      'Share Coming Soon',
      'Sharing options will be available in a future update.',
    );
  }, []);

  const handleDirectMessage = useCallback(async () => {
    if (!canSendDirectMessage) {
      Alert.alert(
        'Number Required',
        'Include a valid phone number with country code before sending.',
      );
      return;
    }

    const message = dmMessage.trim();
    const encodedMessage = encodeURIComponent(message);
    const nativeUrl = `whatsapp://send?phone=${cleanedPhone}&text=${encodedMessage}`;
    const webUrl = `https://wa.me/${cleanedPhone}?text=${encodedMessage}`;

    try {
      const supported = await Linking.canOpenURL(nativeUrl);
      if (supported) {
        await Linking.openURL(nativeUrl);
        return;
      }
      await Linking.openURL(webUrl);
    } catch {
      Alert.alert(
        'Unable to open WhatsApp',
        'Please install or update WhatsApp and try again.',
      );
    }
  }, [canSendDirectMessage, cleanedPhone, dmMessage]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: theme.surface, borderBottomColor: theme.border },
        ]}
      >
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Settings
        </Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Close settings"
        >
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              APPEARANCE
            </Text>

            <TouchableOpacity
              style={[styles.settingRow, { backgroundColor: theme.surface }]}
              onPress={handleThemeChange}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Change theme"
            >
              <View style={styles.settingLeft}>
                <Icon
                  name="skin"
                  size={20}
                  color={theme.primary}
                  style={styles.settingIcon}
                />
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>
                    Theme
                  </Text>
                  <Text
                    style={[
                      styles.settingSubtitle,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {getThemeLabel()}
                  </Text>
                </View>
              </View>
              <Switch
                value={isDark}
                onValueChange={handleThemeChange}
                trackColor={{ false: '#D1D5DB', true: theme.primary }}
                thumbColor="#FFFFFF"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              GENERAL
            </Text>

            <View
              style={[styles.settingRow, { backgroundColor: theme.surface }]}
              accessible
              accessibilityRole="switch"
              accessibilityLabel="Auto save new statuses"
              accessibilityState={{ checked: autoSaveEnabled }}
            >
              <View style={styles.settingLeft}>
                <Icon
                  name="save"
                  size={20}
                  color={theme.primary}
                  style={styles.settingIcon}
                />
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>
                    Auto-save new statuses
                  </Text>
                  <Text
                    style={[
                      styles.settingSubtitle,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Save new media as soon as it is detected.
                  </Text>
                </View>
              </View>
              <Switch
                value={autoSaveEnabled}
                onValueChange={setAutoSaveEnabled}
                trackColor={{ false: '#D1D5DB', true: theme.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View
              style={[
                styles.settingRow,
                styles.settingRowSpaced,
                { backgroundColor: theme.surface },
              ]}
              accessible
              accessibilityRole="switch"
              accessibilityLabel="Status reminders"
              accessibilityState={{ checked: notifyOnNewStatus }}
            >
              <View style={styles.settingLeft}>
                <Icon
                  name="bells"
                  size={20}
                  color={theme.primary}
                  style={styles.settingIcon}
                />
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>
                    Status reminders
                  </Text>
                  <Text
                    style={[
                      styles.settingSubtitle,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Get alerts when friends post a new status.
                  </Text>
                </View>
              </View>
              <Switch
                value={notifyOnNewStatus}
                onValueChange={setNotifyOnNewStatus}
                trackColor={{ false: '#D1D5DB', true: theme.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              STORAGE & CLEANUP
            </Text>

            <View
              style={[styles.settingRow, { backgroundColor: theme.surface }]}
              accessible
              accessibilityRole="switch"
              accessibilityLabel="Auto clean saved statuses"
              accessibilityState={{ checked: autoCleanEnabled }}
            >
              <View style={styles.settingLeft}>
                <Icon
                  name="delete"
                  size={20}
                  color={theme.primary}
                  style={styles.settingIcon}
                />
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>
                    Auto-clean saved media
                  </Text>
                  <Text
                    style={[
                      styles.settingSubtitle,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Remove items older than 7 days to free space.
                  </Text>
                </View>
              </View>
              <Switch
                value={autoCleanEnabled}
                onValueChange={setAutoCleanEnabled}
                trackColor={{ false: '#D1D5DB', true: theme.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: theme.border }]}
              onPress={handleClearCache}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Manually clear saved statuses"
            >
              <Text
                style={[styles.secondaryButtonText, { color: theme.primary }]}
              >
                Clear saved statuses now
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              MESSAGING TOOLS
            </Text>

            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                Direct message
              </Text>
              <Text
                style={[styles.cardSubtitle, { color: theme.textSecondary }]}
              >
                Message anyone on WhatsApp without saving their contact.
              </Text>

              <View style={styles.inputGroup}>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: theme.surfaceVariant,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  value={dmPhone}
                  onChangeText={setDmPhone}
                  placeholder="Country code + number"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="phone-pad"
                  returnKeyType="next"
                />
                <TextInput
                  style={[
                    styles.textArea,
                    {
                      backgroundColor: theme.surfaceVariant,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  value={dmMessage}
                  onChangeText={setDmMessage}
                  placeholder="Optional message"
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={3}
                  returnKeyType="done"
                />
              </View>
              <Text style={[styles.helperText, { color: theme.textSecondary }]}>
                Include your country code, for example 919876543210.
              </Text>

              <TouchableOpacity
                style={[styles.primaryButton, primaryButtonDynamicStyle]}
                onPress={handleDirectMessage}
                disabled={!canSendDirectMessage}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSendDirectMessage }}
              >
                <Text style={styles.primaryButtonText}>Open in WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              HELP & SUPPORT
            </Text>

            <TouchableOpacity
              style={[styles.settingRow, { backgroundColor: theme.surface }]}
              onPress={() =>
                openExternalLink(
                  'https://faq.whatsapp.com/',
                  'Unable to open the WhatsApp help center.',
                )
              }
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Open WhatsApp help center"
            >
              <View style={styles.settingLeft}>
                <Icon
                  name="book"
                  size={20}
                  color={theme.primary}
                  style={styles.settingIcon}
                />
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>
                    Help center
                  </Text>
                  <Text
                    style={[
                      styles.settingSubtitle,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Read tips, FAQs, and troubleshooting guides.
                  </Text>
                </View>
              </View>
              <Text style={[styles.chevron, { color: theme.textSecondary }]}>
                ›
              </Text>
            </TouchableOpacity>

            <View
              style={[
                styles.settingRow,
                styles.settingRowSpaced,
                { backgroundColor: theme.surface },
              ]}
              accessibilityRole="summary"
            >
              <View style={styles.settingLeft}>
                <Icon
                  name="customerservice"
                  size={20}
                  color={theme.primary}
                  style={styles.settingIcon}
                />
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>
                    Community tips
                  </Text>
                  <Text
                    style={[
                      styles.settingSubtitle,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Shortcuts, best practices, and hidden features.
                  </Text>
                </View>
              </View>
              <Text
                style={[
                  styles.badge,
                  {
                    backgroundColor: theme.surfaceVariant,
                    color: theme.textSecondary,
                  },
                ]}
              >
                Coming soon
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.settingRow,
                styles.settingRowSpaced,
                { backgroundColor: theme.surface },
              ]}
              onPress={() =>
                openExternalLink(
                  Platform.select({
                    ios: 'mailto:help@statussaver.app',
                    android: 'mailto:help@statussaver.app',
                  }) ?? 'mailto:help@statussaver.app',
                  'Unable to open your email client.',
                )
              }
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Contact support"
            >
              <View style={styles.settingLeft}>
                <Icon
                  name="mail"
                  size={20}
                  color={theme.primary}
                  style={styles.settingIcon}
                />
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>
                    Contact support
                  </Text>
                  <Text
                    style={[
                      styles.settingSubtitle,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Email us feedback or report a problem.
                  </Text>
                </View>
              </View>
              <Text style={[styles.chevron, { color: theme.textSecondary }]}>
                ›
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.settingRow,
                styles.settingRowSpaced,
                { backgroundColor: theme.surface },
              ]}
              onPress={() =>
                openExternalLink(
                  'https://www.whatsapp.com/legal/privacy-policy',
                  'Unable to open the privacy policy.',
                )
              }
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Open privacy policy"
            >
              <View style={styles.settingLeft}>
                <Icon
                  name="lock"
                  size={20}
                  color={theme.primary}
                  style={styles.settingIcon}
                />
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>
                    Privacy policy
                  </Text>
                  <Text
                    style={[
                      styles.settingSubtitle,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Learn how we keep your media secure and private.
                  </Text>
                </View>
              </View>
              <Text style={[styles.chevron, { color: theme.textSecondary }]}>
                ›
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: theme.border }]}
              onPress={handleShareApp}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Share this app"
            >
              <Text
                style={[styles.secondaryButtonText, { color: theme.primary }]}
              >
                Share the app
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>
              Simple, beautiful, and safe
            </Text>
            <Text style={styles.footerEmoji}>✨</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 24,
    color: '#8696A0',
  },
  scrollContent: {
    paddingBottom: 48,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
  },
  settingRowSpaced: {
    marginTop: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 16,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    gap: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  inputGroup: {
    gap: 12,
  },
  textInput: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  textArea: {
    minHeight: 92,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 13,
  },
  primaryButton: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 24,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  footerText: {
    fontSize: 14,
    marginBottom: 8,
  },
  footerEmoji: {
    fontSize: 24,
    opacity: 0.5,
  },
});

export default SettingsScreen;
