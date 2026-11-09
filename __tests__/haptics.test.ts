/**
 * @format
 *
 * The two haptic ticks. Short, specific, and never able to fail a gesture:
 * the vibrator is optional hardware and an unlinked native module used to
 * take the long-press down with it.
 */

import { Vibration } from 'react-native';
import {
  HAPTIC_SAVE_MS,
  HAPTIC_SELECT_MS,
  hapticSave,
  hapticSelect,
} from '../src/utils/haptics';
import { asMock } from '../test-support/testUtils';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('haptics', () => {
  it('ticks for 15ms when a long-press opens selection mode', () => {
    hapticSelect();
    expect(Vibration.vibrate).toHaveBeenCalledWith(15);
    expect(HAPTIC_SELECT_MS).toBe(15);
  });

  it('ticks for 10ms when a save lands', () => {
    hapticSave();
    expect(Vibration.vibrate).toHaveBeenCalledWith(10);
    expect(HAPTIC_SAVE_MS).toBe(10);
  });

  it('fires exactly one pulse per call, never a pattern', () => {
    hapticSelect();
    hapticSave();
    expect(asMock(Vibration.vibrate).mock.calls).toEqual([[15], [10]]);
  });

  it('stays silent when the platform has no vibrator to drive', () => {
    asMock(Vibration.vibrate).mockImplementationOnce(() => {
      throw new Error('Vibration module is not available');
    });
    expect(() => hapticSelect()).not.toThrow();
    expect(() => hapticSave()).not.toThrow();
  });
});
