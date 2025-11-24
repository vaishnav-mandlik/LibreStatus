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

interface HelpScreenProps {
  onClose: () => void;
}

const HelpScreen: React.FC<HelpScreenProps> = ({ onClose }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Help</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close help"
        >
          <Icon name="close" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
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
            <Icon name="questioncircleo" size={28} color="#fff" />
          </View>
          <Text style={[styles.heroTitle, { color: theme.text }]}>
            Need Help?
          </Text>
          <Text style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
            Find answers to common questions
          </Text>
        </View>

        <View style={styles.sectionsContainer}>
          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            <View style={styles.sectionHeader}>
              <View
                style={[
                  styles.sectionIconContainer,
                  { backgroundColor: theme.surfaceVariant },
                ]}
              >
                <Icon name="rocket1" size={16} color={theme.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Getting Started
              </Text>
            </View>
            <Text style={[styles.sectionText, { color: theme.textSecondary }]}>
              <Text style={[styles.bold, { color: theme.text }]}>
                1. Grant Permissions
              </Text>
              {'\n'}Allow storage access when prompted to view statuses.{'\n'}
              {'\n'}
              <Text style={[styles.bold, { color: theme.text }]}>
                2. View Statuses
              </Text>
              {'\n'}Open the messaging app and view someone's status first.
              {'\n'}
              {'\n'}
              <Text style={[styles.bold, { color: theme.text }]}>
                3. Return to App
              </Text>
              {'\n'}Come back to this app to see and download available
              statuses.
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
                <Icon name="question" size={16} color={theme.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Common Questions
              </Text>
            </View>
            <View style={styles.qaItem}>
              <Text style={[styles.question, { color: theme.text }]}>
                Why don't I see any statuses?
              </Text>
              <Text style={[styles.answer, { color: theme.textSecondary }]}>
                • Make sure you've granted storage permissions{'\n'}• View
                statuses in the messaging app first{'\n'}• Pull down to refresh
                the list
              </Text>
            </View>

            <View style={styles.qaItem}>
              <Text style={[styles.question, { color: theme.text }]}>
                Where are downloaded files saved?
              </Text>
              <Text style={[styles.answer, { color: theme.textSecondary }]}>
                Downloaded statuses are saved to your device's gallery/downloads
                folder. You can access them from your gallery app.
              </Text>
            </View>

            <View style={styles.qaItem}>
              <Text style={[styles.question, { color: theme.text }]}>
                Can I download someone's status without them knowing?
              </Text>
              <Text style={[styles.answer, { color: theme.textSecondary }]}>
                Yes, this app works locally on your device. However, please
                respect others' privacy and content rights.
              </Text>
            </View>

            <View style={styles.qaItem}>
              <Text style={[styles.question, { color: theme.text }]}>
                Why did a status disappear?
              </Text>
              <Text style={[styles.answer, { color: theme.textSecondary }]}>
                Statuses automatically expire after 24 hours. Make sure to
                download them before they disappear.
              </Text>
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            <View style={styles.sectionHeader}>
              <View
                style={[
                  styles.sectionIconContainer,
                  { backgroundColor: theme.surfaceVariant },
                ]}
              >
                <Icon name="tool" size={16} color={theme.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Troubleshooting
              </Text>
            </View>
            <View style={styles.qaItem}>
              <Text style={[styles.question, { color: theme.text }]}>
                App crashes or doesn't work
              </Text>
              <Text style={[styles.answer, { color: theme.textSecondary }]}>
                • Clear app cache from device settings{'\n'}• Restart the app
                {'\n'}• Check for app updates{'\n'}• Reinstall the app if issues
                persist
              </Text>
            </View>

            <View style={styles.qaItem}>
              <Text style={[styles.question, { color: theme.text }]}>
                Download fails
              </Text>
              <Text style={[styles.answer, { color: theme.textSecondary }]}>
                • Check available storage space{'\n'}• Verify storage
                permissions are granted{'\n'}• Try downloading again
              </Text>
            </View>
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
                Tips & Tricks
              </Text>
            </View>
            <Text style={[styles.sectionText, { color: theme.textSecondary }]}>
              • Pull down to refresh and see new statuses{'\n'}• Green checkmark
              indicates already saved statuses{'\n'}• Tap and hold on videos to
              see controls{'\n'}• Use the share button to share statuses with
              friends{'\n'}• Switch between image and video tabs with a swipe
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
                Privacy & Security
              </Text>
            </View>
            <Text style={[styles.sectionText, { color: theme.textSecondary }]}>
              This app operates entirely on your device. We do not:{'\n'}
              {'\n'}• Collect personal information{'\n'}• Upload your data to
              servers{'\n'}• Track your activity{'\n'}• Share data with third
              parties{'\n'}
              {'\n'}All operations are performed locally for your privacy and
              security.
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
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  hero: {
    padding: 28,
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
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  sectionsContainer: {
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
    marginBottom: 16,
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
  bold: {
    fontWeight: '600',
  },
  qaItem: {
    marginBottom: 20,
  },
  question: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  answer: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default HelpScreen;
