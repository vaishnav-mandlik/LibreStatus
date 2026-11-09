import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/icons';
import { EASE, pressedStyle } from '../components/ui';
import { useTheme } from './ThemeContext';
import { radius, space, type } from '../theme/tokens';

export type FeedbackType = 'info' | 'success' | 'warning' | 'error';

export interface ToastOptions {
  message: string;
  /** Mono tag on the right ("scan", "2.4 MB"). Hidden while an action shows. */
  meta?: string;
  type?: FeedbackType;
  /** ms; 0 or less keeps it until dismissed. Defaults to 2600, 4200 with an action. */
  duration?: number;
  /** The Undo pill. */
  action?: { label: string; onPress: () => void };
  /** One-off override of the provider's toast bottom. */
  bottom?: number;
}

interface Toast extends ToastOptions {
  id: number;
  type: FeedbackType;
  duration: number;
}

/**
 * Where the toast floats, measured from the bottom edge as the prototype
 * does: over the nav, over the selection tray, above the viewer's sheet, and
 * near the bottom on Settings where there is no nav.
 */
export const TOAST_BOTTOM = {
  nav: 112,
  selecting: 110,
  viewer: 300,
  settings: 30,
} as const;

export interface FeedbackContextValue {
  showToast: (options: ToastOptions) => number;
  dismissToast: (id?: number) => void;
  /** Moves the toast (and any toast already showing) to `px` from the bottom. */
  setToastBottom: (px: number) => void;
  /**
   * Claims `px` for as long as the caller holds the returned release. Screens
   * stack (Help over Settings, the viewer over a selecting Feed), so releasing
   * has to hand the position back to whoever is still underneath.
   */
  claimToastBottom: (px: number) => () => void;
}

const FeedbackContext = createContext<FeedbackContextValue | undefined>(undefined);

/**
 * Every mounted provider, so anything can find the one whose window is on top.
 *
 * Two callers need that: the imperative escape hatch below (modules that
 * cannot use hooks, such as the permission helpers) and the providers
 * themselves. An Android Modal is a window of its own, so a toast rendered by
 * a provider *behind* an open Modal paints underneath it and the user never
 * sees it — the viewer's save toast is exactly that case, raised by the screen
 * behind the viewer. A provider nested inside another one is by construction
 * inside that Modal, so the deepest mounted provider is the visible one.
 *
 * Depth, not mount order: React runs a child's effects before its parent's, so
 * "registered last" is not "innermost" when both mount in the same commit.
 */
interface ToastHost {
  depth: number;
  show: (options: ToastOptions) => number;
  dismiss: (id?: number) => void;
}

const hosts: ToastHost[] = [];

const topmostHost = (): ToastHost | undefined =>
  hosts.reduce<ToastHost | undefined>(
    (best, host) => (!best || host.depth > best.depth ? host : best),
    undefined,
  );

export const showToast = (options: ToastOptions): number | undefined =>
  topmostHost()?.show(options);

export const dismissToast = (id?: number): void => topmostHost()?.dismiss(id);

/** Depth of the provider above this one, so each one can know its own. */
const ToastDepthContext = createContext(-1);

let nextId = 1;

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<Toast | null>(null);
  const [bottom, setBottom] = useState<number>(TOAST_BOTTOM.nav);

  const dismiss = useCallback((id?: number) => {
    setToast(prev => (prev && (id === undefined || prev.id === id) ? null : prev));
  }, []);

  const show = useCallback((options: ToastOptions) => {
    const id = nextId++;
    setToast({
      ...options,
      id,
      type: options.type ?? 'info',
      duration: options.duration ?? (options.action ? 4200 : 2600),
    });
    return id;
  }, []);

  /**
   * Every screen currently asking for a position, innermost last. A screen
   * that unmounts drops its own claim and the one below it takes over again;
   * the nav offset is what is left when nobody is asking.
   *
   * A screen that changes its own claim re-enters at the top of the stack.
   * That is the right answer wherever it can happen: only the screen the user
   * is touching changes its mind (Feed and Library do it on entering
   * selection), and anything stacked above them — the viewer, Settings — is a
   * full-screen window they cannot reach past.
   */
  const claims = useRef<Array<{ px: number }>>([]);

  const applyTopClaim = useCallback(() => {
    const top = claims.current[claims.current.length - 1];
    setBottom(top ? top.px : TOAST_BOTTOM.nav);
  }, []);

  const claimBottom = useCallback(
    (px: number) => {
      const claim = { px };
      claims.current.push(claim);
      applyTopClaim();
      return () => {
        const at = claims.current.indexOf(claim);
        if (at >= 0) {
          claims.current.splice(at, 1);
        }
        applyTopClaim();
      };
    },
    [applyTopClaim],
  );

  const depth = useContext(ToastDepthContext) + 1;

  useEffect(() => {
    const host: ToastHost = { depth, show, dismiss };
    hosts.push(host);
    return () => {
      const at = hosts.indexOf(host);
      if (at >= 0) {
        hosts.splice(at, 1);
      }
    };
  }, [depth, show, dismiss]);

  /*
   * Toasts go to the innermost provider, whatever raised them: see `hosts`.
   * The hand-over is one hop and cannot recurse, because a host holds the local
   * handlers and never these forwarding ones.
   */
  const showTopmost = useCallback(
    (options: ToastOptions) => {
      const host = topmostHost();
      return host && host.show !== show ? host.show(options) : show(options);
    },
    [show],
  );

  const dismissTopmost = useCallback(
    (id?: number) => {
      const host = topmostHost();
      return host && host.dismiss !== dismiss ? host.dismiss(id) : dismiss(id);
    },
    [dismiss],
  );

  const value = useMemo<FeedbackContextValue>(
    () => ({
      showToast: showTopmost,
      dismissToast: dismissTopmost,
      setToastBottom: setBottom,
      claimToastBottom: claimBottom,
    }),
    [showTopmost, dismissTopmost, claimBottom],
  );

  return (
    <ToastDepthContext.Provider value={depth}>
      <FeedbackContext.Provider value={value}>
        {children}
        {toast ? (
          <ToastView
            key={toast.id}
            toast={toast}
            bottom={toast.bottom ?? bottom}
            onDismiss={() => dismiss(toast.id)}
          />
        ) : null}
      </FeedbackContext.Provider>
    </ToastDepthContext.Provider>
  );
};

export const useFeedback = (): FeedbackContextValue => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
};

/**
 * Holds the toast at `px` while the calling screen is mounted and hands it
 * back to whatever screen is still underneath on unmount. Pass undefined to
 * leave the position alone.
 */
export const useToastBottom = (px: number | undefined): void => {
  const { claimToastBottom } = useFeedback();
  useEffect(() => {
    if (px === undefined) {
      return undefined;
    }
    return claimToastBottom(px);
  }, [px, claimToastBottom]);
};

/** The prototype frame's home-indicator row, already counted in TOAST_BOTTOM. */
const FRAME_HOME_ROW = 22;

const ToastView: React.FC<{ toast: Toast; bottom: number; onDismiss: () => void }> = ({
  toast,
  bottom,
  onDismiss,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hiding = useRef(false);
  /** The running fade-out, so unmounting can stop it driving a gone node. */
  const exit = useRef<Animated.CompositeAnimation | null>(null);
  /**
   * Whether the action pill has already been fired.
   *
   * The card stays mounted and pressable for the whole 170ms fade-out, so a
   * double tap on Undo ran the handler twice — and an undo here is real file
   * work: two deletes of the copies a save had just made, or a vault restore
   * replayed on items that were already back. `hiding` cannot stand in for
   * this, because a tap during the fade the auto-dismiss started is a tap the
   * user still means.
   */
  const acted = useRef(false);
  /**
   * The provider hands a fresh `onDismiss` down on every one of its renders —
   * moving the toast for a selection tray is one — and a countdown that
   * restarted on each of those would keep a toast on screen for as long as the
   * screen behind it kept changing. Held in a ref so the lifetime below hangs
   * on the toast alone.
   */
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  const hide = useCallback(() => {
    if (hiding.current) {
      return;
    }
    hiding.current = true;
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const out = Animated.timing(anim, {
      toValue: 0,
      duration: 170,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    exit.current = out;
    // `stop()` calls this back too, with `finished` false. A toast torn down
    // mid-fade must not then report itself dismissed: the provider it would be
    // telling is the one that just went away.
    out.start(({ finished }) => {
      if (finished) {
        dismissRef.current();
      }
    });
  }, [anim]);

  useEffect(() => {
    const enter = Animated.timing(anim, {
      toValue: 1,
      duration: 260,
      easing: EASE,
      useNativeDriver: true,
    });
    enter.start();
    if (toast.duration > 0) {
      timer.current = setTimeout(hide, toast.duration);
    }
    return () => {
      enter.stop();
      // The fade-out outlives the card it is fading unless it is stopped here:
      // a toast replaced mid-hide, or a shell torn down under one, left a
      // timing driving a node that no longer exists.
      exit.current?.stop();
      exit.current = null;
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, [anim, hide, toast.duration]);

  /*
   * Held across renders, for the two nodes only.
   *
   * `Animated.View` memoises its `AnimatedProps` on the identity of the
   * animated nodes handed to it, but with no allowlist it also folds the raw
   * `children` *array* into that key by reference — and this card has several
   * children, so its props node is dropped and rebuilt on every render no
   * matter what these two do. Measured: three re-renders rebuild it three
   * times either way. What holding them buys is the two interpolation nodes
   * themselves, nothing more; the rebuild needs a structural fix (one child,
   * memoised) that is not worth the churn for a per-render cost that never
   * lands per frame.
   */
  const slide = useMemo(
    () => anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }),
    [anim],
  );
  const pop = useMemo(
    () => anim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }),
    [anim],
  );

  // Always the check glyph, as in the prototype; warning and error only
  // recolour the disc so a failure never reads as a success.
  const disc =
    toast.type === 'error'
      ? { bg: theme.dangerSoft, fg: theme.danger }
      : toast.type === 'warning'
      ? { bg: theme.warningSoft, fg: theme.warning }
      : { bg: theme.accentWash, fg: theme.accent };

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.host,
        // The prototype's offsets include its 22px home row; only a device
        // inset taller than that lifts the toast further.
        { bottom: bottom + Math.max(insets.bottom - FRAME_HOME_ROW, 0) },
      ]}
    >
      <Animated.View
        /*
         * A toast is the only confirmation a batch save or delete gives, so it
         * has to reach a screen reader rather than just appear. The live region
         * does that announcing; `accessible` is what makes the card one focus
         * stop, which is right only when there is nothing in it to press.
         *
         * With an Undo pill it was wrong: `accessible` collapses a view's
         * children into a single node on Android, so the one control a toast
         * ever offers — and the only way back from a delete — was read out and
         * then could not be focused or activated at all. Left off, the message
         * text is announced by the live region and the pill keeps its own node.
         */
        accessible={!toast.action}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${toast.message}${toast.meta ? `, ${toast.meta}` : ''}`}
        style={[
          styles.toast,
          {
            backgroundColor: theme.toastBg,
            shadowColor: theme.shadow,
            opacity: anim,
            transform: [{ translateY: slide }, { scale: pop }],
          },
        ]}
      >
        <View style={[styles.disc, { backgroundColor: disc.bg }]}>
          <Icon name="check" size={13} color={disc.fg} strokeWidth={3} />
        </View>

        <Text style={[type.toast, styles.message, { color: theme.textSoft }]} numberOfLines={2}>
          {toast.message}
        </Text>

        {toast.action ? (
          <Pressable
            onPress={() => {
              if (acted.current) {
                return;
              }
              acted.current = true;
              toast.action?.onPress();
              hide();
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={toast.action.label}
            style={({ pressed }) => [
              styles.action,
              { backgroundColor: theme.accentUndo },
              pressedStyle(pressed),
            ]}
          >
            <Text style={[type.smallStrong, { color: theme.accent }]}>{toast.action.label}</Text>
          </Pressable>
        ) : toast.meta ? (
          <Text style={[type.monoMeta, { color: theme.textFaint }]} numberOfLines={1}>
            {toast.meta}
          </Text>
        ) : null}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: space.bar,
    right: space.bar,
    zIndex: 9999,
    elevation: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 13,
    paddingHorizontal: space.lg,
    borderRadius: radius.toast,
    // box-shadow: 0 12px 30px -8px
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 8,
  },
  disc: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: { flex: 1 },
  action: {
    paddingVertical: space.xs,
    paddingHorizontal: 11,
    borderRadius: radius.undo,
  },
});
