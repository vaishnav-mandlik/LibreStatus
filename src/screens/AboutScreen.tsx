import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const AboutScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.headerIcon}>📱</Text>
        <Text style={styles.headerTitle}>Status Downloader</Text>
        <Text style={styles.version}>Version 1.0.0</Text>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ Features</Text>
          <Text style={styles.sectionText}>
            • View all available statuses{'\n'}• Download images and videos to
            your gallery{'\n'}• Beautiful and intuitive user interface{'\n'}•
            Share statuses with friends{'\n'}• Automatic status detection
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📖 How to Use</Text>
          <Text style={styles.sectionText}>
            1. Make sure the app is installed on your device{'\n'}
            2. Grant storage permissions when prompted{'\n'}
            3. View someone's status first{'\n'}
            4. Open this app to see all available statuses{'\n'}
            5. Tap any status to view it in full screen{'\n'}
            6. Tap the download button to save it to your gallery
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Important Notes</Text>
          <Text style={styles.sectionText}>
            • This app only shows statuses that are currently available on your
            device{'\n'}• Statuses disappear after 24 hours
            {'\n'}• You must view a status first for it to appear here{'\n'}•
            Storage permission is required for the app to function
            {'\n'}• Respect others' privacy when downloading statuses
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔒 Privacy</Text>
          <Text style={styles.sectionText}>
            This app does not collect any personal data. All operations are
            performed locally on your device. We do not upload any data to
            external servers.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Tips</Text>
          <Text style={styles.sectionText}>
            • Pull down to refresh the status list{'\n'}• Saved statuses are
            marked with a green checkmark{'\n'}• Use the tabs to switch between
            different sources{'\n'}• Videos can be played directly in the viewer
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Made with ❤️ for users</Text>
          <Text style={styles.disclaimer}>This is an independent app.</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 40,
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  version: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  content: {
    padding: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  footer: {
    alignItems: 'center',
    padding: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  disclaimer: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

export default AboutScreen;
