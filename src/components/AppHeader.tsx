import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface AppHeaderProps {
  onSettingsPress: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ onSettingsPress }) => {
  const { theme, isDark } = useTheme();

  return (
    <>
      <StatusBar
        backgroundColor={theme.surface}
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />
      <View style={[styles.container, { backgroundColor: theme.surface }]}>
        <View style={styles.content}>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: theme.text }]}>
              WhatsApp Status
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Downloader
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.settingsButton,
              { backgroundColor: theme.surfaceVariant },
            ]}
            onPress={onSettingsPress}
            activeOpacity={0.7}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIcon: {
    fontSize: 22,
  },
});

export default AppHeader;
