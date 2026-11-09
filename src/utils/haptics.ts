import { Vibration } from 'react-native';

/**
 * The two taps the app answers a gesture with, and nothing else.
 *
 * Both are deliberately shorter than a notification buzz: they exist to
 * confirm that a long-press was recognised, and that a save landed, at the
 * moment the finger is still down. The durations are the design's own — 15ms
 * for "selection mode opened", 10ms for "saved".
 *
 * Android needs the VIBRATE permission (a normal, install-time one) for the
 * motor to run; where it is missing, or the device has no motor at all, the
 * platform module returns without vibrating, so this is silent rather than
 * broken. The try/catch covers the remaining case — a build where the native
 * Vibration module is not linked at all, which would otherwise throw on a
 * gesture the user cannot retry differently.
 */
export const HAPTIC_SELECT_MS = 15;
export const HAPTIC_SAVE_MS = 10;

const tick = (ms: number): void => {
  try {
    Vibration.vibrate(ms);
  } catch {
    // Haptics are a garnish; never let one fail a gesture.
  }
};

/** A long-press opened selection mode. */
export const hapticSelect = (): void => tick(HAPTIC_SELECT_MS);

/** A status was written to the gallery or the vault. */
export const hapticSave = (): void => tick(HAPTIC_SAVE_MS);
