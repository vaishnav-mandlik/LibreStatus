import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface WelcomeBannerProps {
  statusCount: number;
  imageCount: number;
  videoCount: number;
}

const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  statusCount,
  imageCount,
  videoCount,
}) => {
  const { theme } = useTheme();
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulseAnim]);

  return (
    <View style={[styles.container, { backgroundColor: theme.surfaceVariant }]}>
      <Animated.View
        style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}
      >
        <Text style={styles.mainIcon}>📱</Text>
      </Animated.View>

      <View style={styles.textContainer}>
        <Text style={[styles.welcomeText, { color: theme.text }]}>
          {statusCount > 0 ? 'Ready to save!' : 'Welcome!'}
        </Text>
        <Text style={[styles.subText, { color: theme.textSecondary }]}>
          {statusCount > 0
            ? `${imageCount} photos • ${videoCount} videos`
            : 'Tap below to get started'}
        </Text>
      </View>

      {statusCount > 0 && (
        <View style={[styles.badge, { backgroundColor: theme.primary }]}>
          <Text style={styles.badgeText}>{statusCount}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  iconContainer: {
    marginRight: 16,
  },
  mainIcon: {
    fontSize: 48,
  },
  textContainer: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  subText: {
    fontSize: 14,
    fontWeight: '400',
  },
  badge: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default WelcomeBanner;
