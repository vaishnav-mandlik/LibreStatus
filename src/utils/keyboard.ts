import { useEffect, useRef, useState } from 'react';
import { Keyboard, type View } from 'react-native';

/**
 * How much of a container the on-screen keyboard is covering, in points.
 *
 * Android used to do this for us: `windowSoftInputMode="adjustResize"` shrank
 * the window and every scroll view resized with it. From Android 15 the system
 * draws edge to edge for apps targeting SDK 35 and up, and that flag became a
 * no-op — Android 16 ignores even the opt-out. The keyboard now slides over
 * the layout without moving anything, which left the number field and its
 * button on the Tools screen completely hidden behind it.
 *
 * The container is measured in window coordinates rather than assuming the
 * keyboard's height is the overlap: anything below the container (the tab bar,
 * a home indicator) is already behind the keyboard and must not be counted
 * twice.
 *
 * Returns 0 whenever the keyboard is down, so it can be applied as padding
 * unconditionally.
 */
export const useKeyboardOverlap = (
  ref: React.RefObject<View | null>,
): number => {
  const [overlap, setOverlap] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    // `did` rather than `will`: Android only ever emits the did-events, and
    // their end coordinates are the ones that have actually landed.
    const shown = Keyboard.addListener('keyboardDidShow', event => {
      const box = ref.current;
      const keyboardTop = event?.endCoordinates?.screenY;
      if (!box || typeof keyboardTop !== 'number') {
        return;
      }
      box.measureInWindow((_x, y, _width, height) => {
        if (!mounted.current) {
          return;
        }
        /*
         * Capped at the keyboard's own height. The measurement is in window
         * coordinates and `screenY` is in screen coordinates; those are the
         * same thing while the app is drawn edge to edge, which is exactly
         * when this hook is needed, but the cap keeps a device that offsets
         * its window from ever padding by more than the keyboard covers.
         */
        const covered = Math.min(
          Math.max(0, y + height - keyboardTop),
          event.endCoordinates.height ?? Number.POSITIVE_INFINITY,
        );
        setOverlap(covered);
      });
    });
    const hidden = Keyboard.addListener('keyboardDidHide', () => {
      if (mounted.current) {
        setOverlap(0);
      }
    });
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, [ref]);

  return overlap;
};

/**
 * How tall the on-screen keyboard is, in points, or 0 while it is down.
 *
 * This is the right measure for anything anchored to the whole window rather
 * than to a container: the toast host is absolutely positioned against the
 * window, so it has to clear the keyboard's full height. Use
 * `useKeyboardOverlap` instead for a scroll view, which already ends above
 * the tab bar.
 */
export const useKeyboardHeight = (): number => {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', event => {
      const next = event?.endCoordinates?.height;
      setHeight(typeof next === 'number' ? next : 0);
    });
    const hidden = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  return height;
};
