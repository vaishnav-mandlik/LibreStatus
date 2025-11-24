import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/AntDesign';
import { useTheme } from '../context/ThemeContext';

interface AboutScreenProps {
  onClose?: () => void;
}

const AboutScreen: React.FC<AboutScreenProps> = ({ onClose }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>About</Text>
        {onClose && (
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close about"
          >
            <Icon name="close" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { backgroundColor: theme.surface }]}>
          <View
            style={[
              styles.heroIconContainer,
              { backgroundColor: theme.primary },
            ]}
          >
            <Icon name="mobile1" size={28} color="#fff" />
          </View>
          <Text style={[styles.heroTitle, { color: theme.text }]}>
            Status Downloader
          </Text>
          <Text style={[styles.heroVersion, { color: theme.textSecondary }]}>
            Version 1.0.0
          </Text>
        </View>

        <View style={styles.content}>
          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            <View style={styles.sectionHeader}>
              <View
                style={[
                  styles.sectionIconContainer,
                  { backgroundColor: theme.surfaceVariant },
                ]}
              >
                <Icon name="staro" size={16} color={theme.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Features
              </Text>
            </View>
            <Text style={[styles.sectionText, { color: theme.textSecondary }]}>
              • View all available statuses{'\n'}• Download images and videos to
              your gallery{'\n'}• Beautiful and intuitive user interface
              {'\n'}• Share statuses with friends{'\n'}• Automatic status
              detection
            </Text>
          </View>

          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            <View style={styles.sectionHeader}>
              <View
                style={[
                  styles.sectionIconContainer,
                  { backgroundColor: theme.surfaceVariant },
                ]}
              >
                <Icon name="book" size={16} color={theme.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                How to Use
              </Text>
            </View>
            <Text style={[styles.sectionText, { color: theme.textSecondary }]}>
              1. Make sure the app is installed on your device{'\n'}
              2. Grant storage permissions when prompted{'\n'}
              3. View someone's status first{'\n'}
              4. Open this app to see all available statuses{'\n'}
              5. Tap any status to view it in full screen{'\n'}
              6. Tap the download button to save it to your gallery
            </Text>
          </View>

          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            <View style={styles.sectionHeader}>
              <View
                style={[
                  styles.sectionIconContainer,
                  { backgroundColor: theme.surfaceVariant },
                ]}
              >
                <Icon
                  name="exclamationcircleo"
                  size={16}
                  color={theme.primary}
                />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Important Notes
              </Text>
            </View>
            <Text style={[styles.sectionText, { color: theme.textSecondary }]}>
              • This app only shows statuses that are currently available on
              your device{'\n'}• Statuses disappear after 24 hours
              {'\n'}• You must view a status first for it to appear here{'\n'}•
              Storage permission is required for the app to function
              {'\n'}• Respect others' privacy when downloading statuses
            </Text>
          </View>

          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            <View style={styles.sectionHeader}>
              <View
                style={[
                  styles.sectionIconContainer,
                  { backgroundColor: theme.surfaceVariant },
                ]}
              >
                <Icon name="lock" size={16} color={theme.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Privacy
              </Text>
            </View>
            <Text style={[styles.sectionText, { color: theme.textSecondary }]}>
              This app does not collect any personal data. All operations are
              performed locally on your device. We do not upload any data to
              external servers.
            </Text>
          </View>

          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            <View style={styles.sectionHeader}>
              <View
                style={[
                  styles.sectionIconContainer,
                  { backgroundColor: theme.surfaceVariant },
                ]}
              >
                <Icon name="bulb1" size={16} color={theme.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Tips
              </Text>
            </View>
            <Text style={[styles.sectionText, { color: theme.textSecondary }]}>
              • Pull down to refresh the status list{'\n'}• Saved statuses are
              marked with a green checkmark{'\n'}• Use the tabs to switch
              between different sources{'\n'}• Videos can be played directly in
              the viewer
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>
              Made with ❤️ by Vaishnav
            </Text>
            <Text style={[styles.disclaimer, { color: theme.textSecondary }]}>
              This is an independent app.
            </Text>
          </View>
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
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  hero: {
    padding: 32,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  heroIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  heroVersion: {
    fontSize: 13,
    opacity: 0.7,
  },
  content: {
    paddingHorizontal: 16,
  },
  section: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 14,
    marginBottom: 8,
  },
  disclaimer: {
    fontSize: 12,
    textAlign: 'center',
  },
});

export default AboutScreen;
