/**
 * WhatsApp Status Downloader
 * Beautiful dark UI with swipeable tabs
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Animated,
  AppState,
  AppStateStatus,
  BackHandler,
  Dimensions,
  Easing,
  PanResponder,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/AntDesign';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import StatusListScreen from './src/screens/StatusListScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import { FeedbackProvider } from './src/context/FeedbackContext';

type TabType = 'status' | 'saved' | 'settings';
type MediaType = 'images' | 'videos';

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.2;
const TAB_WIDTH = width / 2;
const SLIDE_DURATION = 340;

function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <FeedbackProvider>
            <AppContent />
          </FeedbackProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabType>('status');
  const [activeMedia, setActiveMedia] = useState<MediaType>('images');
  const [reloadTick, setReloadTick] = useState<number>(Date.now());
  const activeMediaRef = useRef<MediaType>(activeMedia);
  const mediaProgress = useRef(
    new Animated.Value(activeMedia === 'images' ? 1 : 0),
  ).current;
  const isAnimating = useRef(false);
  const insets = useSafeAreaInsets();
  const lastPrimaryTabRef = useRef<TabType>('status');
  const { theme, isDark } = useTheme();
  const activeColor = theme.primary;
  const inactiveColor = theme.textSecondary;
  const navIdleCircleColor = isDark
    ? 'rgba(134, 150, 160, 0.12)'
    : 'rgba(17, 27, 33, 0.06)';
  const navActiveCircleColor = isDark
    ? 'rgba(0, 168, 132, 0.2)'
    : 'rgba(37, 211, 102, 0.2)';
  const { t } = useLanguage();

  const imagesLabelColor = mediaProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [inactiveColor, activeColor],
  });

  const videosLabelColor = mediaProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [activeColor, inactiveColor],
  });

  const tabIndicatorTranslate = mediaProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [TAB_WIDTH, 0],
  });

  const contentTranslateX = useMemo(
    () =>
      mediaProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [-width, 0],
      }),
    [mediaProgress],
  );
  const imagePointerEvents = activeMedia === 'images' ? 'auto' : 'none';
  const videoPointerEvents = activeMedia === 'videos' ? 'auto' : 'none';

  useEffect(() => {
    activeMediaRef.current = activeMedia;
  }, [activeMedia]);

  useEffect(() => {
    if (activeTab !== 'settings') {
      lastPrimaryTabRef.current = activeTab;
    }
  }, [activeTab]);

  const animateProgressTo = (value: number, onComplete?: () => void) => {
    mediaProgress.stopAnimation();
    isAnimating.current = true;
    Animated.timing(mediaProgress, {
      toValue: value,
      duration: SLIDE_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      isAnimating.current = false;
      if (onComplete) {
        onComplete();
      }
    });
  };

  const shouldCaptureHorizontalSwipe = (gestureState: {
    dx: number;
    dy: number;
  }) => {
    const { dx, dy } = gestureState;
    const currentMedia = activeMediaRef.current;

    // Must be horizontal and significant
    if (Math.abs(dx) <= 10 || Math.abs(dy) > Math.abs(dx) * 0.5) {
      return false;
    }

    // Swipe left when on images (to videos)
    if (dx < 0 && currentMedia === 'images') {
      return true;
    }

    // Swipe right when on videos (to images)
    if (dx > 0 && currentMedia === 'videos') {
      return true;
    }

    return false;
  };

  const animateMediaChange = (nextMedia: MediaType) => {
    if (nextMedia === activeMediaRef.current || isAnimating.current) {
      return;
    }

    activeMediaRef.current = nextMedia;
    setActiveMedia(nextMedia);
    animateProgressTo(nextMedia === 'images' ? 1 : 0);
  };

  const handleMediaTabPress = (target: MediaType) => {
    animateMediaChange(target);
  };

  // Pan responder for smooth swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        shouldCaptureHorizontalSwipe(gestureState),
      onMoveShouldSetPanResponderCapture: (_, gestureState) =>
        shouldCaptureHorizontalSwipe(gestureState),
      onPanResponderGrant: () => {
        if (isAnimating.current) {
          mediaProgress.stopAnimation(() => {
            isAnimating.current = false;
          });
        }
      },
      onPanResponderMove: (_, gestureState) => {
        if (isAnimating.current) return;

        const { dx } = gestureState;
        const currentMedia = activeMediaRef.current;

        if (currentMedia === 'images' && dx < 0) {
          const progress = Math.min(Math.abs(dx) / width, 1);
          mediaProgress.setValue(Math.max(1 - progress, 0));
        }

        if (currentMedia === 'videos' && dx > 0) {
          const progress = Math.min(Math.abs(dx) / width, 1);
          mediaProgress.setValue(Math.min(progress, 1));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isAnimating.current) return;

        const { dx, vx } = gestureState;
        const currentMedia = activeMediaRef.current;
        const shouldSwipe =
          Math.abs(dx) > SWIPE_THRESHOLD || Math.abs(vx) > 0.5;

        if (shouldSwipe) {
          if (dx < 0 && currentMedia === 'images') {
            animateMediaChange('videos');
            return;
          }

          if (dx > 0 && currentMedia === 'videos') {
            animateMediaChange('images');
            return;
          }
        }

        animateProgressTo(currentMedia === 'images' ? 1 : 0);
      },
      onPanResponderTerminate: () => {
        animateProgressTo(activeMediaRef.current === 'images' ? 1 : 0);
      },
    }),
  ).current;

  // Auto reload when app becomes active (opened or returned to foreground)
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        setReloadTick(Date.now());
      }
    };
    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const onBackPress = () => {
      if (activeTab === 'settings') {
        setActiveTab(lastPrimaryTabRef.current);
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress,
    );

    return () => subscription.remove();
  }, [activeTab]);

  /*
   * Helper for opening WhatsApp when header shortcuts are re-enabled.
   * Uncomment the header section below to surface these actions again.
   */
  // const openWhatsApp = async () => {
  //   try {
  //     // Open WhatsApp home screen. This avoids "Invalid chat link" errors.
  //     const appScheme = 'whatsapp://app';
  //     const canOpenApp = await Linking.canOpenURL(appScheme);
  //     if (canOpenApp) {
  //       await Linking.openURL(appScheme);
  //       return;
  //     }
  //     // Fallback: open a compose screen with a blank message (encoded space)
  //     const composeScheme = 'whatsapp://send?text=%20';
  //     const canOpenCompose = await Linking.canOpenURL(composeScheme);
  //     if (canOpenCompose) {
  //       await Linking.openURL(composeScheme);
  //       return;
  //     }
  //     const playStoreUrl = 'market://details?id=com.whatsapp';
  //     const canOpenStore = await Linking.canOpenURL(playStoreUrl);
  //     if (canOpenStore) {
  //       await Linking.openURL(playStoreUrl);
  //       return;
  //     }
  //     Alert.alert(
  //       'WhatsApp not found',
  //       'Please install WhatsApp to continue.',
  //     );
  //   } catch {
  //     Alert.alert('Error', 'Unable to open WhatsApp.');
  //   }
  // };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
      edges={['top']}
    >
      <StatusBar
        backgroundColor={theme.background}
        barStyle={isDark ? 'light-content' : 'dark-content'}
        translucent={false}
      />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        {/* <View style={styles.header}>
          <Text style={styles.headerTitle}>Status Saver Pro</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton} onPress={openWhatsApp}>
              <Icon name="phone" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Icon name="pushpin" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setIsSettingsVisible(true)}
            >
              <Icon name="setting" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View> */}

        {activeTab !== 'settings' && (
          <>
            <View style={styles.mediaTabs}>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.tabIndicator,
                  {
                    width: TAB_WIDTH,
                    backgroundColor: activeColor,
                    transform: [{ translateX: tabIndicatorTranslate }],
                  },
                ]}
              />
              <TouchableOpacity
                style={styles.mediaTab}
                onPress={() => handleMediaTabPress('images')}
                accessibilityRole="button"
                accessibilityLabel={t('tabs.imagesAccessibility')}
              >
                <Icon
                  name="picture"
                  size={18}
                  color={activeMedia === 'images' ? activeColor : inactiveColor}
                  style={styles.tabIcon}
                />
                <Animated.Text
                  style={[styles.mediaTabText, { color: imagesLabelColor }]}
                >
                  {t('tabs.images')}
                </Animated.Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.mediaTab}
                onPress={() => handleMediaTabPress('videos')}
                accessibilityRole="button"
                accessibilityLabel={t('tabs.videosAccessibility')}
              >
                <Icon
                  name="playcircleo"
                  size={18}
                  color={activeMedia === 'videos' ? activeColor : inactiveColor}
                  style={styles.tabIcon}
                />
                <Animated.Text
                  style={[styles.mediaTabText, { color: videosLabelColor }]}
                >
                  {t('tabs.videos')}
                </Animated.Text>
              </TouchableOpacity>
            </View>

            <View style={styles.content} {...panResponder.panHandlers}>
              <Animated.View
                style={[
                  styles.contentSlider,
                  { transform: [{ translateX: contentTranslateX }] },
                ]}
              >
                <View
                  pointerEvents={imagePointerEvents}
                  style={styles.contentPage}
                >
                  <StatusListScreen
                    type="whatsapp"
                    mediaFilter="images"
                    activeTab={activeTab === 'saved' ? 'saved' : 'status'}
                    reloadSignal={reloadTick}
                  />
                </View>
                <View
                  pointerEvents={videoPointerEvents}
                  style={styles.contentPage}
                >
                  <StatusListScreen
                    type="whatsapp"
                    mediaFilter="videos"
                    activeTab={activeTab === 'saved' ? 'saved' : 'status'}
                    reloadSignal={reloadTick}
                  />
                </View>
              </Animated.View>
            </View>
          </>
        )}

        {activeTab === 'settings' && (
          <View style={styles.contentStandalone}>
            <SettingsScreen
              onClose={() => setActiveTab(lastPrimaryTabRef.current)}
            />
          </View>
        )}

        {/* Bottom Navigation */}
        <View
          style={[
            styles.bottomNav,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.navButton,
              activeTab === 'status' && styles.navButtonActive,
            ]}
            onPress={() => setActiveTab('status')}
            accessibilityRole="button"
            accessibilityLabel={t('tabs.statusAccessibility')}
          >
            <View
              style={[
                styles.navIconCircle,
                {
                  backgroundColor:
                    activeTab === 'status'
                      ? navActiveCircleColor
                      : navIdleCircleColor,
                },
              ]}
            >
              <MaterialIcon
                name="update"
                size={22}
                color={activeTab === 'status' ? activeColor : inactiveColor}
              />
            </View>
            <Text
              style={[
                styles.navText,
                { color: inactiveColor },
                activeTab === 'status' && { color: activeColor },
              ]}
            >
              {t('tabs.status')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.navButton,
              activeTab === 'saved' && styles.navButtonActive,
            ]}
            onPress={() => setActiveTab('saved')}
            accessibilityRole="button"
            accessibilityLabel={t('tabs.savedAccessibility')}
          >
            <View
              style={[
                styles.navIconCircle,
                {
                  backgroundColor:
                    activeTab === 'saved'
                      ? navActiveCircleColor
                      : navIdleCircleColor,
                },
              ]}
            >
              <Icon
                name="download"
                size={20}
                color={activeTab === 'saved' ? activeColor : inactiveColor}
              />
            </View>
            <Text
              style={[
                styles.navText,
                { color: inactiveColor },
                activeTab === 'saved' && { color: activeColor },
              ]}
            >
              {t('tabs.saved')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.navButton,
              activeTab === 'settings' && styles.navButtonActive,
            ]}
            onPress={() => setActiveTab('settings')}
            accessibilityRole="button"
            accessibilityLabel={t('tabs.settingsAccessibility')}
          >
            <View
              style={[
                styles.navIconCircle,
                {
                  backgroundColor:
                    activeTab === 'settings'
                      ? navActiveCircleColor
                      : navIdleCircleColor,
                },
              ]}
            >
              <Icon
                name="setting"
                size={20}
                color={activeTab === 'settings' ? activeColor : inactiveColor}
              />
            </View>
            <Text
              style={[
                styles.navText,
                { color: inactiveColor },
                activeTab === 'settings' && { color: activeColor },
              ]}
            >
              {t('tabs.settings')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1C2C33',
  },
  container: {
    flex: 1,
    backgroundColor: '#1C2C33',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#1C2C33',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '400',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  mediaTabs: {
    flexDirection: 'row',
    position: 'relative',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  mediaTab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  tabIcon: {
    marginRight: 4,
  },
  mediaTabText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 3,
    borderRadius: 3,
    pointerEvents: 'none',
  },
  content: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  contentStandalone: {
    flex: 1,
  },
  contentSlider: {
    flexDirection: 'row',
    flex: 1,
    width: width * 2,
    height: '100%',
  },
  contentPage: {
    width,
    height: '100%',
  },
  bottomNav: {
    flexDirection: 'row',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 18,
  },
  navButtonActive: {},
  navIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  navText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  navTextActive: {
    color: '#00A884',
  },
});

export default App;
