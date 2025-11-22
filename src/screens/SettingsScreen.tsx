import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface SettingsScreenProps {
  onClose: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onClose }) => {
  const { theme, themeMode, setThemeMode, isDark } = useTheme();

  const handleThemeChange = () => {
    if (themeMode === 'light') {
      setThemeMode('dark');
    } else if (themeMode === 'dark') {
      setThemeMode('system');
    } else {
      setThemeMode('light');
    }
  };

  const getThemeLabel = () => {
    if (themeMode === 'system') return 'Auto (System)';
    return themeMode === 'dark' ? 'Dark Mode' : 'Light Mode';
  };

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
        >
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Theme Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            APPEARANCE
          </Text>

          <TouchableOpacity
            style={[styles.settingRow, { backgroundColor: theme.surface }]}
            onPress={handleThemeChange}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🎨</Text>
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

        {/* About Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            ABOUT
          </Text>

          <View style={[styles.settingRow, { backgroundColor: theme.surface }]}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>ℹ️</Text>
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: theme.text }]}>
                  Version
                </Text>
                <Text
                  style={[
                    styles.settingSubtitle,
                    { color: theme.textSecondary },
                  ]}
                >
                  1.0.0
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.settingRow,
              styles.settingRowSpaced,
              { backgroundColor: theme.surface },
            ]}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>💚</Text>
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: theme.text }]}>
                  Made with Love
                </Text>
                <Text
                  style={[
                    styles.settingSubtitle,
                    { color: theme.textSecondary },
                  ]}
                >
                  For easy status saving
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            Simple, beautiful, and safe
          </Text>
          <Text style={styles.footerEmoji}>✨</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  settingRowSpaced: {
    marginTop: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 24,
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
