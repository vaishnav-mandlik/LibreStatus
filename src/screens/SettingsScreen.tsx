import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
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
  const { theme, themeMode, setThemeMode } = useTheme();
  const [dmPhone, setDmPhone] = useState('');
  const [dmMessage, setDmMessage] = useState('');

  const cleanedPhone = useMemo(() => dmPhone.replace(/[^\d]/g, ''), [dmPhone]);
  const canSendDirectMessage = cleanedPhone.length >= 8;

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
    if (themeMode === 'system') return 'Follow system theme';
    if (themeMode === 'dark') return 'Dark mode';
    return 'Light mode';
  }, [themeMode]);

  const themeChipText = useMemo(() => {
    if (themeMode === 'system') return 'System';
    if (themeMode === 'dark') return 'Dark';
    return 'Light';
  }, [themeMode]);

  const openExternalLink = useCallback(
    async (url: string, fallback: string) => {
      try {
        const supported = await Linking.canOpenURL(url);
        if (!supported) {
          Alert.alert('Unavailable', fallback);
          return;
        }
        await Linking.openURL(url);
      } catch {
        Alert.alert('Unavailable', fallback);
      }
    },
    [],
  );

  const handleShareApp = useCallback(() => {
    Alert.alert('Share app', 'Tell your friends about this app!');
  }, []);

  const handleDirectMessage = useCallback(async () => {
    if (!canSendDirectMessage) {
      Alert.alert(
        'Phone number required',
        'Please enter a valid phone number with country code.',
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
        'Please check if WhatsApp is installed.',
      );
    }
  }, [canSendDirectMessage, cleanedPhone, dmMessage]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Settings
        </Text>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close settings"
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
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              Appearance
            </Text>

            <TouchableOpacity
              style={[styles.row, { backgroundColor: theme.surface }]}
              onPress={cycleThemeMode}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Change theme"
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
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: theme.text }]}>
                    Theme
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
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              Direct Message
            </Text>

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
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>
                    Chat without saving contact
                  </Text>
                  <Text
                    style={[
                      styles.cardSubtitle,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Send messages instantly with country code
                  </Text>
                </View>
              </View>

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surfaceVariant,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                value={dmPhone}
                onChangeText={setDmPhone}
                placeholder="e.g., 919876543210"
                placeholderTextColor={theme.textSecondary}
                keyboardType="phone-pad"
                returnKeyType="next"
              />

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
                placeholder="Optional message..."
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
                <Text style={styles.primaryButtonText}>Open in WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              About
            </Text>

            <TouchableOpacity
              style={[styles.row, { backgroundColor: theme.surface }]}
              onPress={handleShareApp}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Share this app"
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
                  Share app
                </Text>
              </View>
              <Icon name="right" size={16} color={theme.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.row, { backgroundColor: theme.surface }]}
              onPress={() =>
                openExternalLink(
                  'https://faq.whatsapp.com/',
                  'Unable to open help center',
                )
              }
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Open help"
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
                  Help
                </Text>
              </View>
              <Icon name="right" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>
              Version 1.0.0
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingTop: 32,
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
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
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
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  footerText: {
    fontSize: 12,
    opacity: 0.5,
  },
});

export default SettingsScreen;
