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
  Text,
  TouchableOpacity,
  Platform,
  Image,
  Dimensions,
  DeviceEventEmitter,
} from 'react-native';
import Icon from 'react-native-vector-icons/AntDesign';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { StatusFile } from '../types';
import StatusViewer from '../components/StatusViewer';
import PermissionGuideModal from '../components/PermissionGuideModal';
import {
  getStatusFiles,
  saveStatusToGallery,
  getSavedStatusFiles,
  syncSavedStatusIds,
} from '../utils/statusManager';
import {
  requestStoragePermission,
  checkStoragePermission,
} from '../utils/permissions';
import { hasFolderAccess, requestFolderAccess } from '../utils/folderPicker';
import { useTheme } from '../context/ThemeContext';
import { useFeedback } from '../context/FeedbackContext';
import { useLanguage } from '../context/LanguageContext';

const statusCache = new Map<string, StatusFile[]>();
const savedCache = new Map<string, StatusFile[]>();

const safPermissionState: { grantedUri: string | null } = {
  grantedUri: null,
};

const SAF_PERMISSION_GRANTED_EVENT = 'saf-permission-granted';

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
  const { showMessage } = useFeedback();
  const { t } = useLanguage();
  const cacheKey = `${type}-statuses`;
  const savedCacheKey = `${type}-saved`;

  const [statuses, setStatuses] = useState<StatusFile[]>(
    () => statusCache.get(cacheKey) ?? [],
  );
  const [savedStatuses, setSavedStatuses] = useState<StatusFile[]>(
    () => savedCache.get(savedCacheKey) ?? [],
  );
  const [statusLoading, setStatusLoading] = useState(false);
  const [savedLoading, setSavedLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<StatusFile | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showPermissionGuide, setShowPermissionGuide] = useState(false);
  const isAwaitingPermission = useRef(false);
  const loadStatusesRef = useRef<((force?: boolean) => Promise<void>) | null>(
    null,
  );
  const savedStatusesRef = useRef<StatusFile[]>(savedStatuses);
  const savedIdsRef = useRef<Set<string>>(new Set());
  const hasCompletedInitialLoad = useRef(false);
  const isRefreshing = useRef(false);
  const statusLoadingRef = useRef(false);
  const savedLoadingRef = useRef(false);
  const [refreshing, setRefreshing] = useState(false);

  const markSavedStatuses = useCallback((files: StatusFile[]) => {
    return files.map(file => {
      // Check if file is saved by matching the filename
      const isSaved =
        savedIdsRef.current.has(file.id) ||
        savedIdsRef.current.has(file.filename);
      return {
        ...file,
        isSaved,
      };
    });
  }, []);

  useEffect(() => {
    savedStatusesRef.current = savedStatuses;
  }, [savedStatuses]);

  const loadSavedStatuses = useCallback(
    async (force = false) => {
      if (!force && savedLoadingRef.current) {
        return;
      }

      if (!force) {
        const cached = savedCache.get(savedCacheKey);
        if (cached && cached.length > 0) {
          setSavedStatuses(cached);
          return;
        }
      }

      try {
        savedLoadingRef.current = true;
        setSavedLoading(true);
        const saved = await getSavedStatusFiles();
        setSavedStatuses(saved);
        savedCache.set(savedCacheKey, saved);
      } catch (error) {
        console.error('❌ Error loading saved statuses:', error);
      } finally {
        savedLoadingRef.current = false;
        setSavedLoading(false);
      }
    },
    [savedCacheKey],
  );

  // Load and sync saved status IDs on mount
  useEffect(() => {
    const loadSavedIds = async () => {
      const savedIds = await syncSavedStatusIds();
      savedIdsRef.current = new Set(savedIds);
      // Update statuses with synced saved state
      if (statuses.length > 0) {
        const updated = markSavedStatuses(statuses);
        setStatuses(updated);
        statusCache.set(cacheKey, updated);
      }
    };
    loadSavedIds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync saved IDs when switching tabs or refreshing
  useEffect(() => {
    if (activeTab === 'status') {
      const syncIds = async () => {
        const savedIds = await syncSavedStatusIds();
        savedIdsRef.current = new Set(savedIds);
        if (statuses.length > 0) {
          const updated = markSavedStatuses(statuses);
          setStatuses(updated);
          statusCache.set(cacheKey, updated);
        }
      };
      syncIds();
    } else if (activeTab === 'saved') {
      // Sync saved files when switching to saved tab
      const syncSaved = async () => {
        const savedIds = await syncSavedStatusIds();
        savedIdsRef.current = new Set(savedIds);
        await loadSavedStatuses(true);
      };
      syncSaved();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, reloadSignal]);

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
      if (!force && statusLoadingRef.current) {
        return;
      }

      // Don't reload if we're waiting for user to grant permission
      if (isAwaitingPermission.current) {
        return;
      }

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
        statusLoadingRef.current = true;
        setStatusLoading(true);

        let files: StatusFile[] = [];
        const isPrimaryInstance = mediaFilter === 'images';

        if (Platform.OS === 'android' && Platform.Version >= 30) {
          let safUri = await hasFolderAccess(type);

          if (safUri) {
            safPermissionState.grantedUri = safUri;
          } else if (safPermissionState.grantedUri) {
            safUri = safPermissionState.grantedUri;
          }

          if (!safUri) {
            statusLoadingRef.current = false;
            setStatusLoading(false);

            if (!isPrimaryInstance) {
              return;
            }

            // Show permission guide modal and mark that we're waiting
            if (!showPermissionGuide) {
              isAwaitingPermission.current = true;
              setShowPermissionGuide(true);
            }
            return;
          }

          files = await getStatusFiles(type);
        } else {
          const hasPermission = await checkStoragePermission();

          if (!hasPermission) {
            const granted = await requestStoragePermission();
            if (!granted) {
              statusLoadingRef.current = false;
              setStatusLoading(false);
              return;
            }
          }

          files = await getStatusFiles(type);
        }

        const filesWithSavedState = markSavedStatuses(files);
        setStatuses(filesWithSavedState);
        statusCache.set(cacheKey, filesWithSavedState);
      } catch (error) {
        console.error('❌ Error loading statuses:', error);
        showMessage({
          title: t('status.errorLoadTitle'),
          message: t('status.errorLoadMessage'),
          type: 'error',
        });
      } finally {
        statusLoadingRef.current = false;
        setStatusLoading(false);
      }
    },
    [
      cacheKey,
      markSavedStatuses,
      mediaFilter,
      showMessage,
      showPermissionGuide,
      type,
      t,
    ],
  );

  useEffect(() => {
    loadStatusesRef.current = loadStatuses;
  }, [loadStatuses]);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      SAF_PERMISSION_GRANTED_EVENT,
      (payload: { type: 'whatsapp' | 'business'; uri: string }) => {
        if (payload?.type === type && loadStatusesRef.current) {
          loadStatusesRef.current(true);
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [type]);

  useEffect(() => {
    const force = hasCompletedInitialLoad.current;
    hasCompletedInitialLoad.current = true;
    loadStatuses(force);
  }, [loadStatuses, reloadSignal]);

  const handleRefresh = useCallback(async () => {
    // Prevent multiple simultaneous refresh operations
    if (isRefreshing.current) {
      return;
    }

    isRefreshing.current = true;
    setRefreshing(true);

    try {
      // Sync saved IDs with gallery to remove deleted files
      const savedIds = await syncSavedStatusIds();
      savedIdsRef.current = new Set(savedIds);

      if (activeTab === 'saved') {
        await loadSavedStatuses(true);
      } else {
        await loadStatuses(true);
      }
    } finally {
      isRefreshing.current = false;
      setRefreshing(false);
    }
  }, [loadStatuses, loadSavedStatuses, activeTab]);

  const handleSave = useCallback(
    async (status: StatusFile): Promise<boolean> => {
      setSavingId(status.id);
      try {
        const success = await saveStatusToGallery(status);
        if (success) {
          // Sync saved IDs from AsyncStorage immediately
          const savedIds = await syncSavedStatusIds();
          savedIdsRef.current = new Set(savedIds);

          // Update status with saved flag immediately
          const savedStatus = { ...status, isSaved: true };
          setStatuses(prev => {
            const updated = prev.map(s =>
              s.id === status.id ? savedStatus : s,
            );
            statusCache.set(cacheKey, updated);
            return updated;
          });

          showMessage({
            title: t('status.savedTitle'),
            message: t('status.savedMessage'),
            type: 'success',
          });

          // Reload saved statuses from gallery to sync
          await loadSavedStatuses(true);
          return true;
        } else {
          showMessage({
            title: t('status.errorSaveTitle'),
            message: t('status.errorSaveMessage'),
            type: 'error',
          });
          return false;
        }
      } catch (error) {
        console.error('Error saving status:', error);
        showMessage({
          title: t('status.errorSaveTitle'),
          message: t('status.errorSaveMessage'),
          type: 'error',
        });
        return false;
      } finally {
        setSavingId(null);
      }
    },
    [showMessage, loadSavedStatuses, cacheKey, t],
  );

  const filteredStatuses = useMemo(() => {
    const sourceStatuses = activeTab === 'saved' ? savedStatuses : statuses;
    return sourceStatuses.filter(status => {
      return mediaFilter === 'images'
        ? status.type === 'image'
        : status.type === 'video';
    });
  }, [activeTab, savedStatuses, statuses, mediaFilter]);

  useEffect(() => {
    if (!selectedStatus) {
      return;
    }

    const nextIndex = filteredStatuses.findIndex(
      status => status.id === selectedStatus.id,
    );

    if (nextIndex === -1) {
      setSelectedStatus(null);
      return;
    }

    if (nextIndex !== selectedIndex) {
      setSelectedIndex(nextIndex);
    }
  }, [filteredStatuses, selectedIndex, selectedStatus]);

  const listLoading = activeTab === 'saved' ? savedLoading : statusLoading;

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes.toString().padStart(2, '0');
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  };

  const handleStatusPress = useCallback((status: StatusFile, index: number) => {
    setSelectedStatus(status);
    setSelectedIndex(index);
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: StatusFile; index: number }) => (
      <View style={styles.card}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => handleStatusPress(item, index)}
          style={styles.cardPressable}
        >
          <Image source={{ uri: item.uri }} style={styles.cardImage} />
          {item.type === 'video' && (
            <View style={styles.playIconContainer}>
              <View style={styles.playIcon}>
                <MaterialIcon name="play" size={32} color="#FFFFFF" />
              </View>
            </View>
          )}
          <LinearGradient
            colors={[
              'transparent',
              'rgba(0, 0, 0, 0.35)',
              'rgba(0, 0, 0, 0.7)',
            ]}
            style={styles.overlayGradient}
            pointerEvents="box-none"
          >
            <View style={styles.overlayContent} pointerEvents="box-none">
              <Text style={styles.overlayText}>
                {formatTime(item.timestamp)}
              </Text>
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
        </TouchableOpacity>
      </View>
    ),
    [handleSave, handleStatusPress, savingId, theme],
  );

  const handleViewerClose = useCallback(() => {
    setSelectedStatus(null);
    setSelectedIndex(0);
  }, []);

  const handlePermissionGuideContinue = useCallback(() => {
    setShowPermissionGuide(false);
    statusLoadingRef.current = true;
    setStatusLoading(true);

    (async () => {
      try {
        const uri = await requestFolderAccess(type);
        if (uri) {
          safPermissionState.grantedUri = uri;
          isAwaitingPermission.current = false;
          DeviceEventEmitter.emit(SAF_PERMISSION_GRANTED_EVENT, {
            type,
            uri,
          });
          if (loadStatusesRef.current) {
            await loadStatusesRef.current(true);
          }
        }
      } catch (error: any) {
        console.error('❌ Error requesting folder access:', error);

        // Show appropriate error message
        if (error.code !== 'CANCELLED') {
          const errorMessage = error.message?.includes('Invalid folder')
            ? 'The selected folder does not contain a .Statuses folder. Please select Android/media or a folder containing WhatsApp status files.'
            : t('status.errorPermissionMessage');

          showMessage({
            title: t('status.errorPermissionTitle'),
            message: errorMessage,
            type: 'error',
          });

          // If invalid folder, show the permission guide again after a delay
          if (error.message?.includes('Invalid folder')) {
            setTimeout(() => {
              setShowPermissionGuide(true);
            }, 2500);
          }
        }
      } finally {
        isAwaitingPermission.current = false;
        statusLoadingRef.current = false;
        setStatusLoading(false);
      }
    })();
  }, [type, showMessage, t]);

  const handlePermissionGuideCancel = useCallback(() => {
    isAwaitingPermission.current = false;
    setShowPermissionGuide(false);
  }, []);

  const viewerVisible = selectedStatus !== null && filteredStatuses.length > 0;

  if (filteredStatuses.length === 0 && !listLoading && !refreshing) {
    return (
      <>
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
            {mediaFilter === 'images'
              ? t('status.emptyImages')
              : t('status.emptyVideos')}
          </Text>
          <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
            {activeTab === 'saved'
              ? mediaFilter === 'images'
                ? t('status.emptySavedImages')
                : t('status.emptySavedVideos')
              : mediaFilter === 'images'
              ? t('status.emptyImagesSubtitle')
              : t('status.emptyVideosSubtitle')}
          </Text>
        </View>
        <PermissionGuideModal
          visible={showPermissionGuide}
          type={type}
          onContinue={handlePermissionGuideContinue}
          onCancel={handlePermissionGuideCancel}
        />
      </>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={filteredStatuses}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        extraData={statuses}
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
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
            progressBackgroundColor={theme.surface}
          />
        }
      />
      <StatusViewer
        visible={viewerVisible}
        statuses={filteredStatuses}
        initialIndex={selectedIndex}
        savingId={savingId}
        onClose={handleViewerClose}
        onSave={handleSave}
      />
      <PermissionGuideModal
        visible={showPermissionGuide}
        type={type}
        onContinue={handlePermissionGuideContinue}
        onCancel={handlePermissionGuideCancel}
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
    paddingBottom: 20,
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
  cardPressable: {
    flex: 1,
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
