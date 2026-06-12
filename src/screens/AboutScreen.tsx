import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/AntDesign';
import { useTheme } from '../context/ThemeContext';

interface AboutScreenProps {
  onClose?: () => void;
}

interface LegalSection {
  title: string;
  body: string;
}

interface LegalDocument {
  title: string;
  updated: string;
  sections: LegalSection[];
}

const LEGAL_UPDATED = 'June 2026';
const CONTACT_EMAIL = 'vaishnavmandlik@duck.com';

const PRIVACY_POLICY: LegalDocument = {
  title: 'Privacy Policy',
  updated: LEGAL_UPDATED,
  sections: [
    {
      title: 'Overview',
      body: 'LibreStatus is a free, open-source application that lets you view, save and share the statuses you have already seen in WhatsApp. Your privacy is fundamental to how the app is built: LibreStatus works entirely on your device and does not collect, store or transmit any personal information.',
    },
    {
      title: 'No Internet Access',
      body: 'LibreStatus does not request the internet permission. The app cannot and does not send any of your data anywhere. Everything happens locally on your phone, even when you are offline.',
    },
    {
      title: 'Information We Collect',
      body: 'None. There are no user accounts, no sign-in, no analytics, no advertising, no trackers and no advertising identifiers. We do not collect your name, email, contacts, location or any usage data.',
    },
    {
      title: 'Storage and Media Access',
      body: 'To show you available statuses, the app reads WhatsApp’s status media folder. On Android 11 and newer this is done through the system folder picker, where you grant access to that folder once. On older versions a storage permission is used. When you save a status, a copy is written to your device gallery. All of this happens locally; the files never leave your device through the app.',
    },
    {
      title: 'Data Sharing',
      body: 'Because the app collects no data, there is nothing to sell, rent or share with third parties. When you choose to share or repost a status, your phone’s normal share sheet is used and you remain in full control of where it goes.',
    },
    {
      title: 'Children’s Privacy',
      body: 'LibreStatus does not knowingly collect any information from anyone, including children.',
    },
    {
      title: 'Third-Party Content',
      body: 'Statuses you view and save belong to the people who posted them. Please respect their privacy and intellectual property rights, and only save or re-share content you are allowed to.',
    },
    {
      title: 'Changes to This Policy',
      body: 'If this policy changes, the updated version will be included in a new release of the app. Continued use of the app after an update means you accept the revised policy.',
    },
    {
      title: 'Contact',
      body: `If you have any questions about this policy, contact the developer at ${CONTACT_EMAIL}.`,
    },
  ],
};

const TERMS_AND_CONDITIONS: LegalDocument = {
  title: 'Terms & Conditions',
  updated: LEGAL_UPDATED,
  sections: [
    {
      title: 'Acceptance of Terms',
      body: 'By installing or using LibreStatus you agree to these Terms & Conditions. If you do not agree, please do not use the app.',
    },
    {
      title: 'License',
      body: 'LibreStatus is free and open-source software released under the MIT License. You are free to use, study, modify and redistribute it under the terms of that license.',
    },
    {
      title: 'Acceptable Use',
      body: 'You agree to use LibreStatus only for lawful purposes. You must have the right to download, save and re-share any status you handle with the app, and you must respect other people’s privacy and intellectual property as well as the laws of your country.',
    },
    {
      title: 'No Affiliation with WhatsApp',
      body: 'LibreStatus is an independent, third-party app. It is not affiliated with, endorsed by, sponsored by or connected to WhatsApp or Meta in any way. WhatsApp is a trademark of its respective owner.',
    },
    {
      title: 'Your Responsibility',
      body: 'You are solely responsible for how you use the content you save. Do not redistribute or publish other people’s statuses without their permission. The developer is not responsible for any misuse of saved content.',
    },
    {
      title: 'Disclaimer of Warranty',
      body: 'LibreStatus is provided “as is”, without warranty of any kind, express or implied. The developer does not guarantee that the app will be error-free or that it will detect every status on your device.',
    },
    {
      title: 'Limitation of Liability',
      body: 'To the maximum extent permitted by law, the developer shall not be liable for any damages or loss arising from the use of, or inability to use, this app.',
    },
    {
      title: 'Content Ownership',
      body: 'All statuses remain the property of their original creators. LibreStatus claims no ownership over any content you view or save.',
    },
    {
      title: 'Changes to These Terms',
      body: 'These terms may be updated in future releases. Continued use of the app after an update means you accept the revised terms.',
    },
  ],
};

const AboutScreen: React.FC<AboutScreenProps> = ({ onClose }) => {
  const { theme } = useTheme();
  const [legalDoc, setLegalDoc] = useState<LegalDocument | null>(null);

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
            LibreStatus
          </Text>
          <Text style={[styles.heroVersion, { color: theme.textSecondary }]}>
            Version 1.0.1
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
            <View style={styles.footerLinks}>
              <TouchableOpacity
                onPress={() => setLegalDoc(PRIVACY_POLICY)}
                style={styles.footerLink}
                accessibilityRole="button"
                accessibilityLabel="Open privacy policy"
              >
                <Icon name="lock" size={14} color={theme.primary} />
                <Text style={[styles.footerLinkText, { color: theme.primary }]}>
                  Privacy Policy
                </Text>
              </TouchableOpacity>

              <Text
                style={[styles.footerDivider, { color: theme.textSecondary }]}
              >
                •
              </Text>

              <TouchableOpacity
                onPress={() => setLegalDoc(TERMS_AND_CONDITIONS)}
                style={styles.footerLink}
                accessibilityRole="button"
                accessibilityLabel="Open terms and conditions"
              >
                <Icon name="filetext1" size={14} color={theme.primary} />
                <Text style={[styles.footerLinkText, { color: theme.primary }]}>
                  Terms & Conditions
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.footerText, { color: theme.textSecondary }]}>
              Made with ❤️ by Vaishnav
            </Text>
            <Text style={[styles.disclaimer, { color: theme.textSecondary }]}>
              LibreStatus is a third-party app and not connected to
              WhatsApp in any way.
            </Text>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={legalDoc !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setLegalDoc(null)}
      >
        <View style={styles.legalOverlay}>
          <View
            style={[styles.legalCard, { backgroundColor: theme.surface }]}
          >
            <View style={styles.legalHeader}>
              <Text style={[styles.legalTitle, { color: theme.text }]}>
                {legalDoc?.title}
              </Text>
              <TouchableOpacity
                onPress={() => setLegalDoc(null)}
                style={styles.legalClose}
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <Icon name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text
              style={[styles.legalUpdated, { color: theme.textSecondary }]}
            >
              Last updated: {legalDoc?.updated}
            </Text>
            <ScrollView
              style={styles.legalBody}
              contentContainerStyle={styles.legalBodyContent}
              showsVerticalScrollIndicator={true}
            >
              {legalDoc?.sections.map(section => (
                <View key={section.title} style={styles.legalSection}>
                  <Text
                    style={[styles.legalSectionTitle, { color: theme.text }]}
                  >
                    {section.title}
                  </Text>
                  <Text
                    style={[
                      styles.legalSectionBody,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {section.body}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.legalButton, { backgroundColor: theme.primary }]}
              onPress={() => setLegalDoc(null)}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <Text style={styles.legalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 12,
  },
  footerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerLinkText: {
    fontSize: 13,
    fontWeight: '600',
  },
  footerDivider: {
    fontSize: 12,
    opacity: 0.5,
  },
  footerText: {
    fontSize: 14,
    marginBottom: 8,
  },
  disclaimer: {
    fontSize: 12,
    textAlign: 'center',
  },
  legalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  legalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '82%',
    borderRadius: 18,
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  legalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legalTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  legalClose: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legalUpdated: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 12,
  },
  legalBody: {
    flexGrow: 0,
  },
  legalBodyContent: {
    paddingBottom: 8,
  },
  legalSection: {
    marginBottom: 16,
  },
  legalSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  legalSectionBody: {
    fontSize: 14,
    lineHeight: 21,
  },
  legalButton: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legalButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default AboutScreen;
