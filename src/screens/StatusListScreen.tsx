import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
  Text,
  TouchableOpacity,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/AntDesign';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { StatusFile } from '../types';
import StatusViewer from '../components/StatusViewer';
import { getStatusFiles, saveStatusToGallery } from '../utils/statusManager';
import {
  requestStoragePermission,
  checkStoragePermission,
} from '../utils/permissions';
import { hasFolderAccess, requestFolderAccess } from '../utils/folderPicker';
import { useTheme } from '../context/ThemeContext';

const statusCache = new Map<string, StatusFile[]>();
const savedCache = new Map<string, StatusFile[]>();

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const getOverlayIconColors = (
  isSaved: boolean,
  primaryColor: string,
): { backgroundColor: string; borderColor: string } => {
  if (isSaved) {
    return {
      backgroundColor: primaryColor,
      borderColor: 'rgba(255, 255, 255, 0.4)',
    };
  }

  return {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderColor: 'rgba(255, 255, 255, 0.35)',
  };
};

interface StatusListScreenProps {
  type: 'whatsapp' | 'business';
  mediaFilter?: 'images' | 'videos';
  activeTab?: 'status' | 'saved';
  reloadSignal?: number;
}

const StatusListScreen: React.FC<StatusListScreenProps> = ({
  type,
  mediaFilter = 'images',
  activeTab = 'status',
  reloadSignal,
}) => {
  const { theme } = useTheme();
  const cacheKey = `${type}-statuses`;
  const savedCacheKey = `${type}-saved`;

  const [statuses, setStatuses] = useState<StatusFile[]>(
    () => statusCache.get(cacheKey) ?? [],
  );
  const [savedStatuses, setSavedStatuses] = useState<StatusFile[]>(
    () => savedCache.get(savedCacheKey) ?? [],
  );
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<StatusFile | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const savedStatusesRef = useRef<StatusFile[]>(savedStatuses);
  const hasCompletedInitialLoad = useRef(false);

  const markSavedStatuses = useCallback((files: StatusFile[]) => {
    const savedIds = savedStatusesRef.current.map(s => s.id);
    return files.map(file => ({
      ...file,
      isSaved: savedIds.includes(file.id),
    }));
  }, []);

  useEffect(() => {
    savedStatusesRef.current = savedStatuses;
  }, [savedStatuses]);

  const loadSavedStatuses = useCallback(async () => {
    try {
      const savedData = await AsyncStorage.getItem('savedStatuses');
      if (savedData) {
        const saved = JSON.parse(savedData);
        setSavedStatuses(saved);
        savedCache.set(savedCacheKey, saved);
        console.log(`✅ Loaded ${saved.length} saved statuses from storage`);
      }
    } catch (error) {
      console.error('❌ Error loading saved statuses:', error);
    }
  }, [savedCacheKey]);

  useEffect(() => {
    if (savedStatuses.length > 0) {
      AsyncStorage.setItem('savedStatuses', JSON.stringify(savedStatuses))
        .then(() =>
          console.log(`💾 Persisted ${savedStatuses.length} saved statuses`),
        )
        .catch(err =>
          console.error('❌ Error persisting saved statuses:', err),
        );
    }
  }, [savedStatuses]);

  useEffect(() => {
    loadSavedStatuses();
  }, [loadSavedStatuses]);

  useEffect(() => {
    statusCache.set(cacheKey, statuses);
  }, [cacheKey, statuses]);

  useEffect(() => {
    savedCache.set(savedCacheKey, savedStatuses);
  }, [savedCacheKey, savedStatuses]);

  const loadStatuses = useCallback(
    async (force = false) => {
      if (!force) {
        const cached = statusCache.get(cacheKey);
        if (cached && cached.length > 0) {
          const filesWithSavedState = markSavedStatuses(cached);
          setStatuses(filesWithSavedState);
          statusCache.set(cacheKey, filesWithSavedState);
          return;
        }
      }

      try {
        setLoading(true);

        let files: StatusFile[] = [];

        if (Platform.OS === 'android' && Platform.Version >= 30) {
          const safUri = await hasFolderAccess(type);

          if (!safUri) {
            setLoading(false);
            Alert.alert(
              '📁 Select WhatsApp Status Folder',
              `You'll now select the ${
                type === 'business' ? 'WhatsApp Business' : 'WhatsApp'
              } status folder.\n\n` +
                `The folder picker will open near the correct location.\n\n` +
                `📝 Steps:\n` +
                `1. Look for ".Statuses" folder\n` +
                `2. If not visible, navigate up to find:\n` +
                `   Android → media → com.${
                  type === 'business' ? 'whatsapp.w4b' : 'whatsapp'
                }\n` +
                `   → WhatsApp → Media → .Statuses\n` +
                `3. Tap "Use this folder" at the bottom\n\n` +
                `This grants access to view statuses.`,
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                  onPress: () => setLoading(false),
                },
                {
                  text: 'Open Picker',
                  onPress: async () => {
                    setLoading(true);
                    const uri = await requestFolderAccess(type);
                    if (uri) {
                      const grantedFiles = await getStatusFiles(type);
                      console.log(
                        `📊 Loaded ${grantedFiles.length} status files`,
                      );
                      const filesWithSavedState =
                        markSavedStatuses(grantedFiles);
                      setStatuses(filesWithSavedState);
                      statusCache.set(cacheKey, filesWithSavedState);
                    }
                    setLoading(false);
                  },
                },
              ],
            );
            return;
          }

          console.log('✅ SAF access granted, loading statuses...');
          files = await getStatusFiles(type);
          console.log(`📊 Loaded ${files.length} status files`);
        } else {
          const hasPermission = await checkStoragePermission();

          if (!hasPermission) {
            const granted = await requestStoragePermission();
            if (!granted) {
              setLoading(false);
              return;
            }
          }

          console.log('✅ Permission granted, loading statuses...');
          files = await getStatusFiles(type);
          console.log(`📊 Loaded ${files.length} status files`);
        }

        const filesWithSavedState = markSavedStatuses(files);
        setStatuses(filesWithSavedState);
        statusCache.set(cacheKey, filesWithSavedState);
      } catch (error) {
        console.error('❌ Error loading statuses:', error);
        Alert.alert('Error', 'Failed to load statuses');
      } finally {
        setLoading(false);
      }
    },
    [cacheKey, markSavedStatuses, type],
  );

  useEffect(() => {
    const force = hasCompletedInitialLoad.current;
    hasCompletedInitialLoad.current = true;
    loadStatuses(force);
  }, [loadStatuses, reloadSignal]);

  const handleRefresh = useCallback(() => {
    loadStatuses(true);
  }, [loadStatuses]);

  const handleSave = async (status: StatusFile) => {
    setSavingId(status.id);
    try {
      const success = await saveStatusToGallery(status);
      if (success) {
        Alert.alert('✓ Saved', 'Status saved to gallery!');
        const savedStatus = { ...status, isSaved: true };
        setStatuses(prev =>
          prev.map(s => (s.id === status.id ? savedStatus : s)),
        );
        setSavedStatuses(prev => {
          const exists = prev.find(s => s.id === status.id);
          if (!exists) {
            return [savedStatus, ...prev];
          }
          return prev;
        });
      } else {
        Alert.alert('Error', 'Failed to save status');
      }
    } catch (error) {
      console.error('Error saving status:', error);
      Alert.alert('Error', 'Failed to save status');
    } finally {
      setSavingId(null);
    }
  };

  const filteredStatuses = useMemo(() => {
    const sourceStatuses = activeTab === 'saved' ? savedStatuses : statuses;
    return sourceStatuses.filter(status => {
      return mediaFilter === 'images'
        ? status.type === 'image'
        : status.type === 'video';
    });
  }, [activeTab, savedStatuses, statuses, mediaFilter]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes.toString().padStart(2, '0');
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  };

  const renderItem = useCallback(
    ({ item }: { item: StatusFile }) => (
      <View style={styles.card}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setSelectedStatus(item)}
        >
          <Image source={{ uri: item.uri }} style={styles.cardImage} />
          {item.type === 'video' && (
            <View style={styles.playIconContainer}>
              <View style={styles.playIcon}>
                <MaterialIcon name="play" size={32} color="#FFFFFF" />
              </View>
            </View>
          )}
        </TouchableOpacity>
        <LinearGradient
          colors={['transparent', 'rgba(0, 0, 0, 0.35)', 'rgba(0, 0, 0, 0.7)']}
          style={styles.overlayGradient}
          pointerEvents="box-none"
        >
          <View style={styles.overlayContent}>
            <Text style={styles.overlayText}>{formatTime(item.timestamp)}</Text>
            <TouchableOpacity
              style={styles.overlayButton}
              onPress={() => handleSave(item)}
              disabled={savingId === item.id || item.isSaved}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              accessibilityRole="button"
            >
              <View
                style={[
                  styles.overlayIcon,
                  getOverlayIconColors(item.isSaved ?? false, theme.primary),
                ]}
              >
                {item.isSaved ? (
                  <Icon name="check" size={18} color="#FFFFFF" />
                ) : (
                  <Icon name="download" size={16} color="#FFFFFF" />
                )}
              </View>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    ),
    [savingId, theme],
  );

  if (filteredStatuses.length === 0 && !loading) {
    return (
      <View
        style={[styles.emptyContainer, { backgroundColor: theme.background }]}
      >
        <Icon
          name="inbox"
          size={64}
          color={theme.textSecondary}
          style={styles.emptyIcon}
        />
        <Text style={[styles.emptyText, { color: theme.text }]}>
          No {mediaFilter} found
        </Text>
        <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
          Pull down to refresh or view someone's status on WhatsApp
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={filteredStatuses}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={6}
        updateCellsBatchingPeriod={100}
        initialNumToRender={4}
        windowSize={3}
        getItemLayout={(data, index) => ({
          length: CARD_WIDTH * 1.3 + 16,
          offset: (CARD_WIDTH * 1.3 + 16) * Math.floor(index / 2),
          index,
        })}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={handleRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
            progressBackgroundColor={theme.surface}
          />
        }
      />
      <StatusViewer
        visible={selectedStatus !== null}
        status={selectedStatus}
        onClose={() => setSelectedStatus(null)}
        onSave={() => selectedStatus && handleSave(selectedStatus)}
        isSaving={savingId === selectedStatus?.id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'space-between',
  },
  card: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    width: CARD_WIDTH,
    position: 'relative',
  },
  cardImage: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.3,
    resizeMode: 'cover',
  },
  playIconContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  overlayContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  overlayText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginRight: 12,
  },
  overlayButton: {
    marginLeft: 'auto',
    paddingVertical: 2,
  },
  overlayIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default React.memo(StatusListScreen, (prevProps, nextProps) => {
  return (
    prevProps.mediaFilter === nextProps.mediaFilter &&
    prevProps.activeTab === nextProps.activeTab &&
    prevProps.type === nextProps.type &&
    prevProps.reloadSignal === nextProps.reloadSignal
  );
});
