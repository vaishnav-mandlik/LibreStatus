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
  Pressable,
  Platform,
  StatusBar,
  Linking,
  Dimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import type {
  GestureResponderEvent,
  LayoutChangeEvent,
  ListRenderItemInfo,
} from 'react-native';
import Video from 'react-native-video';
import type { OnLoadData, OnProgressData } from 'react-native-video';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { StatusFile } from '../types';
import { useFeedback, FeedbackProvider } from '../context/FeedbackContext';

const SCREEN = Dimensions.get('window');
const SCREEN_WIDTH = SCREEN.width;

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
  statuses: StatusFile[];
  initialIndex: number;
  savingId?: string | null;
  onClose: () => void;
  onSave: (status: StatusFile) => Promise<boolean>;
}

const StatusViewer: React.FC<StatusViewerProps> = ({
  visible,
  statuses,
  initialIndex,
  savingId,
  onClose,
  onSave,
}) => {
  if (!visible || statuses.length === 0) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <FeedbackProvider>
        <StatusViewerContent
          statuses={statuses}
          initialIndex={initialIndex}
          savingId={savingId}
          visible={visible}
          onClose={onClose}
          onSave={onSave}
        />
      </FeedbackProvider>
    </Modal>
  );
};

interface StatusViewerContentProps
  extends Omit<StatusViewerProps, 'visible'> {
  visible: boolean;
}

const StatusViewerContent: React.FC<StatusViewerContentProps> = ({
  statuses,
  initialIndex,
  savingId,
  visible,
  onClose,
  onSave,
}) => {
  const { showMessage } = useFeedback();
  const flatListRef = useRef<FlatList<StatusFile>>(null);
  const videoRef = useRef<any>(null);
  const progressBarWidth = useRef(0);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [localIsSaved, setLocalIsSaved] = useState(false);

  const currentStatus = statuses[currentIndex];

  useEffect(() => {
    StatusBar.setHidden(visible, 'fade');
    return () => {
      StatusBar.setHidden(false, 'fade');
    };
  }, [visible]);

  useEffect(() => {
    if (!visible || statuses.length === 0) {
      return;
    }

    const safeIndex = Math.min(
      Math.max(initialIndex, 0),
      Math.max(statuses.length - 1, 0),
    );
    setCurrentIndex(safeIndex);
    const targetStatus = statuses[safeIndex];
    setLocalIsSaved(targetStatus?.isSaved ?? false);
    setDuration(0);
    setCurrentTime(0);
    setIsBuffering(false);
    setIsPlaying(targetStatus?.type === 'video');

    const timer = requestAnimationFrame(() => {
      flatListRef.current?.scrollToIndex({ index: safeIndex, animated: false });
    });

    return () => cancelAnimationFrame(timer);
  }, [initialIndex, statuses, visible]);

  useEffect(() => {
    if (!currentStatus) {
      return;
    }

    setLocalIsSaved(currentStatus.isSaved ?? false);
    setDuration(0);
    setCurrentTime(0);
    setIsBuffering(false);
    setIsPlaying(currentStatus.type === 'video');
  }, [currentStatus]);

  const isSavingCurrent = useMemo(() => {
    if (!currentStatus || !savingId) {
      return false;
    }
    return savingId === currentStatus.id;
  }, [currentStatus, savingId]);

  const playbackProgress = useMemo(() => {
    if (duration <= 0) {
      return 0;
    }

    const ratio = currentTime / duration;
    return Math.min(Math.max(ratio, 0), 1);
  }, [currentTime, duration]);

  const metaInfo = useMemo(() => {
    if (!currentStatus) {
      return { date: '', size: '—' };
    }

    return {
      date: formatDateTime(currentStatus.timestamp),
      size: formatBytes(currentStatus.size),
    };
  }, [currentStatus]);

  const handleSaveClick = useCallback(async () => {
    if (!currentStatus || localIsSaved || isSavingCurrent) {
      return;
    }

    const success = await onSave(currentStatus);
    if (success) {
      setLocalIsSaved(true);
    } else {
      setLocalIsSaved(currentStatus.isSaved ?? false);
    }
  }, [currentStatus, localIsSaved, isSavingCurrent, onSave]);

  const handleShare = useCallback(async () => {
    if (!currentStatus) {
      return;
    }

    try {
      await Share.share({
        message: 'Check out this status!',
        url: currentStatus.uri,
        title: 'Share Status',
      });
    } catch {
      showMessage({
        title: 'Share failed',
        message: 'We could not share this status. Try again shortly.',
        type: 'error',
      });
    }
  }, [currentStatus, showMessage]);

  const handleRepost = useCallback(async () => {
    if (!currentStatus) {
      return;
    }

    try {
      const whatsappScheme =
        Platform.OS === 'ios' ? 'whatsapp://' : 'whatsapp://send';
      const hasWhatsapp = await Linking.canOpenURL(whatsappScheme);
      if (!hasWhatsapp) {
        showMessage({
          title: 'WhatsApp not installed',
          message: 'Install WhatsApp to repost this status.',
          type: 'warning',
        });
        return;
      }

      await Share.share({
        url: currentStatus.uri,
        message:
          'Sharing this status — tap My Status inside WhatsApp to repost.',
        title: 'Share to WhatsApp',
      });
    } catch {
      showMessage({
        title: 'Share failed',
        message: 'Could not share to WhatsApp. Try again shortly.',
        type: 'error',
      });
    }
  }, [currentStatus, showMessage]);

  const handleTogglePlayback = useCallback(() => {
    if (currentStatus?.type !== 'video') {
      return;
    }

    setIsPlaying(prev => !prev);
  }, [currentStatus]);

  const handleVideoLoad = useCallback(
    (index: number, data: OnLoadData) => {
      if (index !== currentIndex) {
        return;
      }

      setDuration(data.duration);
      setIsPlaying(true);
      setIsBuffering(false);
    },
    [currentIndex],
  );

  const handleVideoProgress = useCallback(
    (index: number, data: OnProgressData) => {
      if (index !== currentIndex) {
        return;
      }

      setCurrentTime(data.currentTime);
    },
    [currentIndex],
  );

  const handleVideoEnd = useCallback(
    (index: number) => {
      if (index !== currentIndex) {
        return;
      }

      videoRef.current?.seek(0);
      setCurrentTime(0);
      setIsPlaying(false);
    },
    [currentIndex],
  );

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

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const nextIndex = Math.round(offsetX / SCREEN_WIDTH);
      if (!Number.isFinite(nextIndex)) {
        return;
      }

      const clampedIndex = Math.min(
        Math.max(nextIndex, 0),
        Math.max(statuses.length - 1, 0),
      );

      if (clampedIndex !== currentIndex) {
        setCurrentIndex(clampedIndex);
      }
    },
    [currentIndex, statuses.length],
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<StatusFile> | null | undefined, index: number) => ({
      length: SCREEN_WIDTH,
      offset: SCREEN_WIDTH * index,
      index,
    }),
    [],
  );

  const renderMedia = useCallback(
    ({ item, index }: ListRenderItemInfo<StatusFile>) => {
      const isActive = index === currentIndex;
      const showVideoLayer = item.type === 'video';

      return (
        <View style={styles.mediaPagerItem}>
          {item.type === 'image' ? (
            <Image
              source={{ uri: item.uri }}
              style={styles.media}
              resizeMode="contain"
            />
          ) : (
            <>
              <Video
                ref={ref => {
                  if (isActive) {
                    videoRef.current = ref;
                  } else if (videoRef.current === ref) {
                    videoRef.current = null;
                  }
                }}
                source={{ uri: item.uri }}
                style={styles.media}
                resizeMode="contain"
                paused={!isActive || !isPlaying}
                repeat={false}
                controls={false}
                playInBackground={false}
                playWhenInactive={false}
                onLoadStart={() => {
                  if (isActive) {
                    setIsBuffering(true);
                  }
                }}
                onLoad={data => handleVideoLoad(index, data)}
                onProgress={data => handleVideoProgress(index, data)}
                onEnd={() => handleVideoEnd(index)}
                onBuffer={({ isBuffering: buffering }) => {
                  if (isActive) {
                    setIsBuffering(buffering);
                  }
                }}
              />
              {showVideoLayer && isActive && isBuffering && (
                <ActivityIndicator
                  style={styles.bufferingIndicator}
                  size="large"
                  color="#FFFFFF"
                />
              )}
              {showVideoLayer && isActive && !isPlaying && !isBuffering && (
                <TouchableOpacity
                  style={styles.centerPlayButton}
                  onPress={handleTogglePlayback}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcon
                    name="play"
                    size={36}
                    color="#000000"
                  />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      );
    },
    [currentIndex, handleTogglePlayback, handleVideoEnd, handleVideoLoad, handleVideoProgress, isBuffering, isPlaying],
  );

  const handleScrollToIndexFailed = useCallback(() => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToOffset({
        offset: currentIndex * SCREEN_WIDTH,
        animated: false,
      });
    });
  }, [currentIndex]);

  if (!currentStatus) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.mediaPagerContainer}>
        <FlatList
          ref={flatListRef}
          data={statuses}
          renderItem={renderMedia}
          keyExtractor={item => item.id}
          horizontal={true}
          pagingEnabled={true}
          showsHorizontalScrollIndicator={false}
          bounces={false}
          getItemLayout={getItemLayout}
          initialScrollIndex={Math.min(
            Math.max(initialIndex, 0),
            Math.max(statuses.length - 1, 0),
          )}
          onScrollToIndexFailed={handleScrollToIndexFailed}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          extraData={currentIndex}
          style={styles.mediaPager}
        />
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

      {currentStatus.type === 'video' && (
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
            (isSavingCurrent || localIsSaved) && styles.actionBubbleDisabled,
          ]}
          onPress={handleSaveClick}
          disabled={isSavingCurrent || localIsSaved}
          activeOpacity={0.8}
        >
          {isSavingCurrent ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : localIsSaved ? (
            <MaterialCommunityIcon name="check" size={22} color="#FFFFFF" />
          ) : (
            <MaterialCommunityIcon
              name="tray-arrow-down"
              size={22}
              color="#FFFFFF"
            />
          )}
          <Text style={styles.actionBubbleLabel} numberOfLines={1}>
            {isSavingCurrent ? 'Saving…' : localIsSaved ? 'Saved' : 'Download'}
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#040507',
  },
  mediaPagerContainer: {
    flex: 1,
  },
  mediaPager: {
    flexGrow: 0,
    backgroundColor: '#040507',
  },
  mediaPagerItem: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#040507',
  },
  media: {
    width: SCREEN_WIDTH,
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
