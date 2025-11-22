import React, { useState } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Text,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { StatusFile } from '../types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface StatusCardProps {
  status: StatusFile;
  onPress: () => void;
  onSave: () => void;
  isSaving?: boolean;
}

const StatusCard: React.FC<StatusCardProps> = ({
  status,
  onPress,
  onSave,
  isSaving,
}) => {
  const [imageError, setImageError] = useState(false);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.card}>
        {!imageError ? (
          <Image
            source={{ uri: status.uri }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={[styles.image, styles.errorContainer]}>
            <Text style={styles.errorText}>Unable to load</Text>
          </View>
        )}

        {status.type === 'video' && (
          <View style={styles.videoIndicator}>
            <LinearGradient
              colors={['rgba(0,0,0,0.7)', 'transparent']}
              style={styles.gradient}
            >
              <Text style={styles.videoIcon}>▶</Text>
            </LinearGradient>
          </View>
        )}

        <TouchableOpacity
          style={styles.saveButton}
          onPress={onSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.saveGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.saveIcon}>⬇</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>

        {status.isSaved && (
          <View style={styles.savedBadge}>
            <Text style={styles.savedText}>✓ Saved</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    marginBottom: 16,
  },
  card: {
    width: '100%',
    height: CARD_WIDTH * 1.5,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
  },
  errorText: {
    color: '#666',
    fontSize: 12,
  },
  videoIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 50,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoIcon: {
    fontSize: 24,
    color: '#fff',
    marginTop: 8,
  },
  saveButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  saveGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveIcon: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  savedBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: '#4caf50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  savedText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});

export default StatusCard;
