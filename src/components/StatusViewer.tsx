import React, { useState } from 'react';
import {
  Modal,
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Text,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import Video from 'react-native-video';
import LinearGradient from 'react-native-linear-gradient';
import { StatusFile } from '../types';

const { width, height } = Dimensions.get('window');

interface StatusViewerProps {
  visible: boolean;
  status: StatusFile | null;
  onClose: () => void;
  onSave: () => void;
  isSaving?: boolean;
}

const StatusViewer: React.FC<StatusViewerProps> = ({
  visible,
  status,
  onClose,
  onSave,
  isSaving,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);

  if (!status) return null;

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Check out this status!',
        url: status.uri,
      });
    } catch {
      Alert.alert('Error', 'Failed to share status');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.mediaContainer}>
          {status.type === 'image' ? (
            <Image
              source={{ uri: status.uri }}
              style={styles.media}
              resizeMode="contain"
            />
          ) : (
            <Video
              source={{ uri: status.uri }}
              style={styles.media}
              resizeMode="contain"
              paused={!isPlaying}
              repeat={true}
              controls={false}
            />
          )}
        </View>

        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'transparent']}
          style={styles.topBar}
        >
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.filename} numberOfLines={1}>
            {status.filename}
          </Text>
        </LinearGradient>

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.bottomBar}
        >
          <View style={styles.actionButtons}>
            {status.type === 'video' && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setIsPlaying(!isPlaying)}
              >
                <Text style={styles.actionIcon}>{isPlaying ? '⏸' : '▶'}</Text>
                <Text style={styles.actionLabel}>
                  {isPlaying ? 'Pause' : 'Play'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Text style={styles.actionIcon}>↗</Text>
              <Text style={styles.actionLabel}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.saveButtonMain]}
              onPress={onSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.actionIcon}>⬇</Text>
                  <Text style={styles.actionLabel}>Save</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  mediaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: width,
    height: height,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 40,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  closeIcon: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '300',
  },
  filename: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    justifyContent: 'flex-end',
    paddingBottom: 30,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  actionButton: {
    alignItems: 'center',
    padding: 10,
  },
  saveButtonMain: {
    backgroundColor: 'rgba(102, 126, 234, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 20,
  },
  actionIcon: {
    fontSize: 28,
    color: '#fff',
    marginBottom: 4,
  },
  actionLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default StatusViewer;
