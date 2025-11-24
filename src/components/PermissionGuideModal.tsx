import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width, height } = Dimensions.get('window');

interface PermissionGuideModalProps {
  visible: boolean;
  type: 'whatsapp' | 'business';
  onContinue: () => void;
  onCancel: () => void;
}

const PermissionGuideModal: React.FC<PermissionGuideModalProps> = ({
  visible,
  type: _type,
  onContinue,
  onCancel,
}) => {
  const { theme, isDark } = useTheme();

  const containerStyles = [
    styles.container,
    isDark ? styles.containerDark : styles.containerLight,
  ];
  const mockDialogStyles = [
    styles.mockDialogBase,
    isDark ? styles.mockDialogDark : styles.mockDialogLight,
  ];
  const innerDialogStyles = [
    styles.innerDialogBase,
    isDark ? styles.innerDialogDark : styles.innerDialogLight,
  ];
  const titleStyles = [
    styles.title,
    isDark ? styles.titleDark : styles.titleLight,
  ];
  const dialogTitleStyles = [
    styles.dialogTitle,
    isDark ? styles.dialogTitleDark : styles.dialogTitleLight,
  ];
  const dialogMessageStyles = [
    styles.dialogMessage,
    isDark ? styles.dialogMessageDark : styles.dialogMessageLight,
  ];
  const cancelTextStyles = [
    styles.mockButtonTextSecondary,
    isDark ? styles.cancelTextDark : styles.cancelTextLight,
  ];
  const allowTextStyles = [
    styles.mockButtonTextPrimary,
    isDark ? styles.allowTextDark : styles.allowTextLight,
  ];
  const cancelButtonStyles = [
    styles.cancelButton,
    { borderColor: `${theme.textSecondary}30` },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={containerStyles}>
          <Text style={titleStyles}>Allow Permission</Text>

          <View style={styles.guideContainer}>
            <View style={mockDialogStyles}>
              <View style={styles.breadcrumbRow}>
                <Text style={styles.breadcrumbText}>Internal</Text>
                <Text style={styles.breadcrumbSeparator}>{'>'}</Text>
                <Text style={styles.breadcrumbText}>Android</Text>
                <Text style={styles.breadcrumbSeparator}>{'>'}</Text>
                <Text style={styles.breadcrumbActive}>media</Text>
              </View>

              <View style={innerDialogStyles}>
                <Text style={dialogTitleStyles}>
                  Allow Status Saver Pro to access files in media?
                </Text>
                <Text style={dialogMessageStyles}>
                  This will let Status Saver Pro access current and future
                  content stored in media.
                </Text>

                <View style={styles.dialogButtonsRow}>
                  <Text style={cancelTextStyles}>CANCEL</Text>
                  <View style={styles.allowButtonContainer}>
                    <Text style={allowTextStyles}>ALLOW</Text>
                    <View style={styles.stepIndicator}>
                      <Text style={styles.stepNumber}>2</Text>
                    </View>
                    <View style={styles.pointerAllow}>
                      <Icon
                        name="hand-pointing-right"
                        size={30}
                        color="#FFA726"
                      />
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.folderButtonWrapper}>
                <View style={styles.useThisFolderButton}>
                  <View style={styles.stepIndicator}>
                    <Text style={styles.stepNumber}>1</Text>
                  </View>
                  <Text style={styles.useThisFolderText}>Use this Folder</Text>
                  <View style={styles.pointerFolder}>
                    <Icon
                      name="hand-pointing-right"
                      size={30}
                      color="#FFA726"
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={cancelButtonStyles}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.cancelButtonText,
                  isDark
                    ? styles.cancelButtonTextDark
                    : styles.cancelButtonTextLight,
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={onContinue}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#26A69A', '#00897B']}
                style={styles.continueButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.continueButtonText}>CONTINUE</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: Math.min(width - 40, 440),
    maxHeight: height - 80,
    borderRadius: 16,
    padding: 28,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  containerDark: {
    backgroundColor: '#2B3E47',
  },
  containerLight: {
    backgroundColor: '#2B3E47',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'left',
    marginBottom: 20,
  },
  titleDark: {
    color: '#FFFFFF',
  },
  titleLight: {
    color: '#FFFFFF',
  },
  guideContainer: {
    marginBottom: 20,
  },
  mockDialogBase: {
    borderRadius: 8,
    padding: 0,
    overflow: 'hidden',
  },
  mockDialogDark: {
    backgroundColor: '#1C1C1E',
  },
  mockDialogLight: {
    backgroundColor: '#1C1C1E',
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  breadcrumbText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#B8B8B8',
  },
  breadcrumbSeparator: {
    fontSize: 13,
    fontWeight: '400',
    color: '#B8B8B8',
    marginHorizontal: 8,
  },
  breadcrumbActive: {
    fontSize: 13,
    fontWeight: '400',
    color: '#B8B8B8',
  },
  innerDialogBase: {
    borderRadius: 12,
    padding: 20,
    margin: 16,
    position: 'relative',
  },
  innerDialogDark: {
    backgroundColor: '#3C3C3E',
  },
  innerDialogLight: {
    backgroundColor: '#3C3C3E',
  },
  dialogTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 10,
    lineHeight: 22,
  },
  dialogTitleDark: {
    color: '#FFFFFF',
  },
  dialogTitleLight: {
    color: '#FFFFFF',
  },
  dialogMessage: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  dialogMessageDark: {
    color: '#B0B0B0',
  },
  dialogMessageLight: {
    color: '#B0B0B0',
  },
  dialogButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 24,
  },
  allowButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    position: 'relative',
  },
  mockButtonTextSecondary: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  cancelTextDark: {
    color: '#7C9AAA',
  },
  cancelTextLight: {
    color: '#7C9AAA',
  },
  mockButtonTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  allowTextDark: {
    color: '#7C9AAA',
  },
  allowTextLight: {
    color: '#7C9AAA',
  },
  pointerAllow: {
    position: 'absolute',
    right: 30,
    bottom: -22,
    transform: [{ rotate: '230deg' }],
  },
  folderButtonWrapper: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    position: 'relative',
  },
  useThisFolderButton: {
    width: '95%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 'auto',
    borderRadius: 6,
    gap: 12,
    backgroundColor: '#A4C2E4',
    position: 'relative',
  },
  useThisFolderText: {
    color: '#1C1C1E',
    fontSize: 16,
    fontWeight: '500',
  },
  pointerFolder: {
    position: 'absolute',
    left: 70,
    bottom: 38,
    transform: [{ rotate: '40deg' }],
  },
  stepIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFC107',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumber: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 0,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    // fontWeight: '400',
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '400',
  },
  cancelButtonTextDark: {
    color: '#26A69A',
  },
  cancelButtonTextLight: {
    color: '#26A69A',
  },
  continueButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  continueButtonGradient: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: 0.3,
  },
});

export default PermissionGuideModal;
