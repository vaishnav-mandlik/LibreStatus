import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Modal,
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Text,
  ActivityIndicator,
  Share,
  Alert,
  Pressable,
  Platform,
  StatusBar,
  Linking,
} from 'react-native';
import Video from 'react-native-video';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { GestureResponderEvent, LayoutChangeEvent } from 'react-native';
import type { OnLoadData, OnProgressData } from 'react-native-video';
import type { StatusFile } from '../types';

const formatPlaybackTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '00:00';
  }

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      remainingSeconds.toString().padStart(2, '0'),
    ].join(':');
  }

  return [
    minutes.toString().padStart(2, '0'),
    remainingSeconds.toString().padStart(2, '0'),
  ].join(':');
};

const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

const formatDateTime = (timestamp: number): string => {
  if (!Number.isFinite(timestamp)) {
    return '';
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
};

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
  const videoRef = useRef<any>(null);
  const progressBarWidth = useRef(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);

  useEffect(() => {
    StatusBar.setHidden(visible, 'fade');
    return () => {
      StatusBar.setHidden(false, 'fade');
    };
  }, [visible]);

  useEffect(() => {
    if (!status) {
      setIsPlaying(false);
      setDuration(0);
      setCurrentTime(0);
      setIsBuffering(false);
      return;
    }

    setIsPlaying(status.type === 'video');
    setDuration(0);
    setCurrentTime(0);
    setIsBuffering(false);
  }, [status]);

  const playbackProgress = useMemo(() => {
    if (duration <= 0) {
      return 0;
    }
    const ratio = currentTime / duration;
    return Math.min(Math.max(ratio, 0), 1);
  }, [currentTime, duration]);

  const metaInfo = useMemo(() => {
    if (!status) {
      return { date: '', size: '—' };
    }

    return {
      date: formatDateTime(status.timestamp),
      size: formatBytes(status.size),
    };
  }, [status]);

  const handleShare = useCallback(async () => {
    if (!status) {
      return;
    }

    try {
      await Share.share({
        message: 'Check out this status!',
        url: status.uri,
        title: 'Share Status',
      });
    } catch {
      Alert.alert('Error', 'Failed to share status');
    }
  }, [status]);

  const handleRepost = useCallback(async () => {
    if (!status) {
      return;
    }

    try {
      const whatsappScheme =
        Platform.OS === 'ios' ? 'whatsapp://' : 'whatsapp://send';
      const hasWhatsapp = await Linking.canOpenURL(whatsappScheme);
      if (!hasWhatsapp) {
        Alert.alert(
          'WhatsApp not installed',
          'Install WhatsApp to repost this status.',
        );
        return;
      }

      await Share.share({
        url: status.uri,
        message:
          'Sharing this status — tap My Status inside WhatsApp to repost.',
        title: 'Share to WhatsApp',
      });
    } catch {
      Alert.alert('Error', 'Failed to share to WhatsApp.');
    }
  }, [status]);

  const handleTogglePlayback = useCallback(() => {
    if (status?.type !== 'video') {
      return;
    }

    setIsPlaying(prev => !prev);
  }, [status]);

  const handleVideoLoad = useCallback((data: OnLoadData) => {
    setDuration(data.duration);
    setIsPlaying(true);
    setIsBuffering(false);
  }, []);

  const handleVideoProgress = useCallback((data: OnProgressData) => {
    setCurrentTime(data.currentTime);
  }, []);

  const handleVideoEnd = useCallback(() => {
    videoRef.current?.seek(0);
    setCurrentTime(0);
    setIsPlaying(false);
  }, []);

  const handleProgressLayout = useCallback((event: LayoutChangeEvent) => {
    progressBarWidth.current = event.nativeEvent.layout.width;
  }, []);

  const handleProgressPress = useCallback(
    (event: GestureResponderEvent) => {
      if (duration <= 0 || !progressBarWidth.current) {
        return;
      }

      const ratio = event.nativeEvent.locationX / progressBarWidth.current;
      const clamped = Math.min(Math.max(ratio, 0), 1);
      videoRef.current?.seek(clamped * duration);
      setCurrentTime(clamped * duration);
    },
    [duration],
  );

  if (!status) {
    return null;
  }

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
              ref={videoRef}
              key={status.uri}
              source={{ uri: status.uri }}
              style={styles.media}
              resizeMode="contain"
              paused={!isPlaying}
              repeat={false}
              controls={false}
              playInBackground={false}
              playWhenInactive={false}
              onLoadStart={() => setIsBuffering(true)}
              onLoad={handleVideoLoad}
              onProgress={handleVideoProgress}
              onEnd={handleVideoEnd}
              onBuffer={({ isBuffering: buffering }) =>
                setIsBuffering(buffering)
              }
            />
          )}
          {status.type === 'video' && isBuffering && (
            <ActivityIndicator
              style={styles.bufferingIndicator}
              size="large"
              color="#FFFFFF"
            />
          )}
          {status.type === 'video' && !isPlaying && !isBuffering && (
            <TouchableOpacity
              style={styles.centerPlayButton}
              onPress={handleTogglePlayback}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcon name="play" size={36} color="#000000" />
            </TouchableOpacity>
          )}
        </View>

        <LinearGradient
          colors={['rgba(0,0,0,0.75)', 'rgba(0,0,0,0)']}
          style={styles.topBar}
          pointerEvents="box-none"
        >
          <View style={styles.topContent}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <View style={styles.closeButtonInner}>
                <MaterialCommunityIcon name="close" size={20} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <View style={styles.metaInfo}>
              <Text style={styles.filename} numberOfLines={1}>
                {status.filename}
              </Text>
              <View style={styles.metaRow}>
                {metaInfo.date ? (
                  <View style={styles.metaPill}>
                    <MaterialCommunityIcon
                      name="clock-outline"
                      size={13}
                      color="rgba(255, 255, 255, 0.9)"
                    />
                    <Text style={styles.metaPillText} numberOfLines={1}>
                      {metaInfo.date}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.metaPill}>
                  <MaterialCommunityIcon
                    name="file-outline"
                    size={13}
                    color="rgba(255, 255, 255, 0.9)"
                  />
                  <Text style={styles.metaPillText}>{metaInfo.size}</Text>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>

        {status.type === 'video' && (
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']}
            style={styles.videoControlsBar}
            pointerEvents="box-none"
          >
            <TouchableOpacity
              onPress={handleTogglePlayback}
              style={styles.videoToggle}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcon
                name={isPlaying ? 'pause' : 'play'}
                size={20}
                color="#FFFFFF"
              />
            </TouchableOpacity>
            <View style={styles.progressSection}>
              <Pressable
                onPress={handleProgressPress}
                onLongPress={handleProgressPress}
                onPressIn={handleProgressPress}
                onLayout={handleProgressLayout}
                style={styles.progressTouch}
              >
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.round(playbackProgress * 100)}%` },
                    ]}
                  />
                </View>
              </Pressable>
              <View style={styles.timeRow}>
                <Text style={styles.timeLabel}>
                  {formatPlaybackTime(currentTime)}
                </Text>
                <Text style={styles.timeLabel}>
                  {formatPlaybackTime(duration)}
                </Text>
              </View>
            </View>
          </LinearGradient>
        )}

        <View style={styles.bottomTray} pointerEvents="box-none">
          <TouchableOpacity
            style={[
              styles.actionBubble,
              isSaving && styles.actionBubbleDisabled,
            ]}
            onPress={onSave}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <MaterialCommunityIcon
                name="tray-arrow-down"
                size={22}
                color="#FFFFFF"
              />
            )}
            <Text style={styles.actionBubbleLabel} numberOfLines={1}>
              {isSaving ? 'Saving…' : 'Download'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBubble}
            onPress={handleShare}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcon
              name="share-variant"
              size={22}
              color="#FFFFFF"
            />
            <Text style={styles.actionBubbleLabel} numberOfLines={1}>
              Share
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryBubble}
            onPress={handleRepost}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcon name="whatsapp" size={22} color="#0B4D2B" />
            <Text style={styles.primaryBubbleLabel} numberOfLines={1}>
              Repost
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#040507',
  },
  mediaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  bufferingIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -12 }, { translateY: -12 }],
  },
  centerPlayButton: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -32 }, { translateY: -32 }],
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'android' ? 30 : 46,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  topContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    marginRight: 16,
  },
  closeButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  filename: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.25,
  },
  metaInfo: {
    flex: 1,
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    marginRight: 8,
    marginTop: 6,
  },
  metaPillText: {
    color: 'rgba(255, 255, 255, 0.92)',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 6,
    letterSpacing: 0.2,
  },
  videoControlsBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'android' ? 96 : 108,
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  progressSection: {
    flex: 1,
  },
  progressTouch: {
    paddingVertical: 6,
  },
  progressTrack: {
    height: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  timeLabel: {
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  bottomTray: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 30 : 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 20,
  },
  actionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minWidth: 118,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  actionBubbleDisabled: {
    opacity: 0.6,
  },
  actionBubbleLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  primaryBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minWidth: 118,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(37, 211, 102, 0.2)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(37, 211, 102, 0.5)',
  },
  primaryBubbleLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default StatusViewer;
