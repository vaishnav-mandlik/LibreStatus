import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';

export type FeedbackType = 'info' | 'success' | 'warning' | 'error';

export interface FeedbackActionConfig {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}

export interface FeedbackOptions {
  title?: string;
  message: string;
  type?: FeedbackType;
  duration?: number; // ms, 0 or negative keeps the toast until dismissed
  actions?: FeedbackActionConfig[];
}

interface FeedbackAction extends FeedbackActionConfig {
  id: number;
}

interface FeedbackMessage extends FeedbackOptions {
  id: number;
  type: FeedbackType;
  duration: number;
  actions?: FeedbackAction[];
}

interface FeedbackContextValue {
  showMessage: (options: FeedbackOptions) => number;
  dismissMessage: (id: number) => void;
}

const DEFAULT_DURATION = 3600;

const FeedbackContext = createContext<FeedbackContextValue | undefined>(
  undefined,
);

const feedbackBridge: {
  showMessage?: (options: FeedbackOptions) => number;
  dismissMessage?: (id: number) => void;
} = {};

export const showFeedback = (options: FeedbackOptions): number | undefined =>
  feedbackBridge.showMessage?.(options);

export const dismissFeedback = (id: number) => {
  feedbackBridge.dismissMessage?.(id);
};

export const FeedbackProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);

  const dismissMessage = useCallback((id: number) => {
    setMessages(prev => prev.filter(message => message.id !== id));
  }, []);

  const showMessage = useCallback((options: FeedbackOptions) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const type: FeedbackType = options.type ?? 'info';
    const hasActions = (options.actions?.length ?? 0) > 0;
    const resolvedDuration = (() => {
      if (options.duration !== undefined) {
        return options.duration;
      }
      return hasActions ? 0 : DEFAULT_DURATION;
    })();

    const actions: FeedbackAction[] | undefined = options.actions?.map(
      (action, index, arr) => ({
        ...action,
        id: index,
        variant: action.variant ?? (index === arr.length - 1 ? 'primary' : 'secondary'),
      }),
    );

    setMessages(prev => [
      ...prev,
      {
        id,
        type,
        title: options.title,
        message: options.message,
        duration: resolvedDuration,
        actions,
      },
    ]);

    return id;
  }, []);

  useEffect(() => {
    feedbackBridge.showMessage = showMessage;
    feedbackBridge.dismissMessage = dismissMessage;
    return () => {
      feedbackBridge.showMessage = undefined;
      feedbackBridge.dismissMessage = undefined;
    };
  }, [dismissMessage, showMessage]);

  const contextValue = useMemo(
    () => ({ showMessage, dismissMessage }),
    [showMessage, dismissMessage],
  );

  return (
    <FeedbackContext.Provider value={contextValue}>
      {children}
      <FeedbackHost messages={messages} onDismiss={dismissMessage} />
    </FeedbackContext.Provider>
  );
};

export const useFeedback = (): FeedbackContextValue => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
};

interface FeedbackHostProps {
  messages: FeedbackMessage[];
  onDismiss: (id: number) => void;
}

const FeedbackHost: React.FC<FeedbackHostProps> = ({ messages, onDismiss }) => (
  <View pointerEvents="box-none" style={styles.host}>
    {messages.map((message, index) => (
      <FeedbackToast
        key={message.id}
        message={message}
        index={index}
        onDismiss={onDismiss}
      />
    ))}
  </View>
);

interface FeedbackToastProps {
  message: FeedbackMessage;
  index: number;
  onDismiss: (id: number) => void;
}

const TYPE_STYLES: Record<FeedbackType, { icon: string; accent: string }> = {
  info: { icon: 'information-outline', accent: '#4E8DFF' },
  success: { icon: 'check-circle-outline', accent: '#2ECC71' },
  warning: { icon: 'alert-circle-outline', accent: '#F2C94C' },
  error: { icon: 'close-circle-outline', accent: '#FF6B6B' },
};

const FeedbackToast: React.FC<FeedbackToastProps> = ({
  message,
  index,
  onDismiss,
}) => {
  const translateY = useRef(new Animated.Value(24)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHidingRef = useRef(false);

  const hide = useCallback(() => {
    if (isHidingRef.current) {
      return;
    }
    isHidingRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }),
      Animated.timing(translateY, {
        toValue: 24,
        duration: 180,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }),
    ]).start(() => onDismiss(message.id));
  }, [message.id, onDismiss, opacity, translateY]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();

    if (message.duration > 0) {
      timerRef.current = setTimeout(() => {
        hide();
      }, message.duration);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [hide, message.duration, opacity, translateY]);

  const accent = TYPE_STYLES[message.type].accent;
  const iconName = TYPE_STYLES[message.type].icon;
  const baseOffset = index * 76;

  const accentStyles = useMemo(
    () =>
      StyleSheet.create({
        actionPrimary: {
          backgroundColor: `${accent}24`,
          borderColor: `${accent}55`,
        },
        actionSecondary: {
          borderColor: 'rgba(255, 255, 255, 0.18)',
        },
        labelPrimary: {
          color: '#FFFFFF',
        },
        labelSecondary: {
          color: 'rgba(255, 255, 255, 0.8)',
        },
      }),
    [accent],
  );

  const handleActionPress = useCallback(
    (action: FeedbackAction) => {
      if (isHidingRef.current) {
        return;
      }
      try {
        action.onPress();
      } finally {
        hide();
      }
    },
    [hide],
  );

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.toast,
        {
          transform: [
            {
              translateY: translateY.interpolate({
                inputRange: [0, 24],
                outputRange: [baseOffset, baseOffset + 24],
              }),
            },
          ],
          opacity,
        },
      ]}
    >
      <View style={styles.toastCard}>
        <View style={[styles.iconBadge, { backgroundColor: `${accent}1A` }]}>
          <MaterialCommunityIcon name={iconName} size={20} color={accent} />
        </View>
        <View style={styles.toastContent}>
          {message.title ? (
            <Text style={styles.toastTitle}>{message.title}</Text>
          ) : null}
          <Text style={styles.toastMessage}>{message.message}</Text>
          {message.actions && message.actions.length > 0 ? (
            <View style={styles.toastActions}>
              {message.actions.map((action: FeedbackAction, actionIndex: number) => {
                const variantIsPrimary = action.variant === 'primary';
                const actionStyle = StyleSheet.compose(
                  StyleSheet.compose(
                    styles.toastAction,
                    variantIsPrimary
                      ? accentStyles.actionPrimary
                      : accentStyles.actionSecondary,
                  ),
                  actionIndex > 0 ? styles.toastActionSpacing : undefined,
                );
                const labelStyle = StyleSheet.compose(
                  styles.toastActionLabel,
                  variantIsPrimary
                    ? accentStyles.labelPrimary
                    : accentStyles.labelSecondary,
                );

                return (
                  <Pressable
                    key={action.id}
                    style={actionStyle}
                    onPress={() => handleActionPress(action)}
                  >
                    <Text style={labelStyle}>{action.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
        <Pressable
          style={styles.closeIcon}
          onPress={hide}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Dismiss message"
        >
          <MaterialCommunityIcon
            name="close"
            size={18}
            color="rgba(255, 255, 255, 0.6)"
          />
        </Pressable>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 32,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  toast: {
    width: '100%',
    paddingHorizontal: 20,
  },
  toastCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 20, 26, 0.92)',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  toastContent: {
    flex: 1,
  },
  toastTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  toastMessage: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    lineHeight: 18,
  },
  toastActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  toastAction: {
    flex: 1,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastActionLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  toastActionSpacing: {
    marginLeft: 10,
  },
  closeIcon: {
    marginLeft: 12,
    padding: 6,
  },
});
