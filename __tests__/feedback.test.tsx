/**
 * @format
 *
 * The toast is the app's only confirmation for a save, a delete or an undo,
 * so how long it stays is behaviour, not decoration.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import {
  FeedbackProvider,
  TOAST_BOTTOM,
  useFeedback,
  useToastBottom,
  type FeedbackContextValue,
} from '../src/context/FeedbackContext';
import { ThemeProvider } from '../src/context/ThemeContext';
import { LanguageProvider } from '../src/context/LanguageContext';

jest.useFakeTimers();

let api: FeedbackContextValue;

const Probe: React.FC = () => {
  api = useFeedback();
  return null;
};

const mounted: ReactTestRenderer.ReactTestRenderer[] = [];

afterEach(async () => {
  for (const tree of mounted.splice(0)) {
    await act(async () => {
      tree.unmount();
    });
  }
});

const render = async () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <ThemeProvider>
        <LanguageProvider>
          <FeedbackProvider>
            <Probe />
          </FeedbackProvider>
        </LanguageProvider>
      </ThemeProvider>,
    );
  });
  mounted.push(tree);
  return tree;
};

/** The toast's own host view; the wrappers around it carry the same props. */
const toasts = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAll(
    n => typeof n.type === 'string' && n.props.accessibilityRole === 'alert',
  );

const tick = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};

describe('toast lifetime', () => {
  it('dismisses itself after its duration', async () => {
    const tree = await render();
    await act(async () => {
      api.showToast({ message: 'Saved' });
    });
    expect(toasts(tree)).toHaveLength(1);

    await tick(2600 + 400);
    expect(toasts(tree)).toHaveLength(0);
  });

  it('keeps counting across a provider re-render', async () => {
    // Entering selection moves the toast up, which re-renders the provider.
    // The countdown must not start over: a toast that is re-parented every
    // time the screen changes state would never leave.
    const tree = await render();
    await act(async () => {
      api.showToast({ message: 'Saved' });
    });

    await tick(2000);
    await act(async () => {
      api.setToastBottom(TOAST_BOTTOM.selecting);
    });
    expect(toasts(tree)).toHaveLength(1);

    await tick(600 + 400);
    expect(toasts(tree)).toHaveLength(0);
  });
});

describe('the Undo pill', () => {
  it('stays its own node for a screen reader', async () => {
    /*
     * `accessible` collapses a view's children into a single node on Android.
     * Set unconditionally on the toast card it took the Undo pill out of
     * TalkBack's reach entirely — the only control a toast ever offers, and
     * the only way back from a delete, could be read out but never focused or
     * activated. With an action present the announcement moves to the message
     * text and the pill keeps its own node.
     */
    const tree = await render();
    await act(async () => {
      api.showToast({
        message: 'Removed from library',
        action: { label: 'Undo', onPress: () => undefined },
      });
    });

    const card = toasts(tree)[0];
    expect(card.props.accessible).not.toBe(true);
    expect(
      tree.root.findAll(
        n =>
          typeof n.type === 'string' &&
          n.props.accessibilityRole === 'button' &&
          n.props.accessibilityLabel === 'Undo',
      ).length,
    ).toBeGreaterThan(0);

    // A toast with nothing to press is still announced as one unit.
    await act(async () => {
      api.showToast({ message: 'Saved', meta: 'gallery' });
    });
    const plain = toasts(tree)[0];
    expect(plain.props.accessible).toBe(true);
    expect(plain.props.accessibilityLabel).toBe('Saved, gallery');
  });

  it('runs its handler once when the pill is tapped twice', async () => {
    /*
     * The card stays mounted, and the pill stays pressable, for the whole
     * 170ms fade-out, so a second tap lands on a control that is still there.
     * Undo is real file work: deleting the gallery copies a save has just
     * made, or putting a vault move back. Running it twice meant a second
     * delete of files that were already gone, behind a second Android
     * confirmation dialog nobody asked for.
     */
    const tree = await render();
    const onPress = jest.fn();
    await act(async () => {
      api.showToast({
        message: 'Saved to Gallery',
        action: { label: 'Undo', onPress },
      });
    });

    // Keyed on `onPress`: a Pressable hands its accessibility props down to
    // the views it renders, so the label alone matches the pill several times
    // over and only the outermost of them is the control.
    const pill = tree.root.find(
      n =>
        n.props.accessibilityRole === 'button' &&
        n.props.accessibilityLabel === 'Undo' &&
        typeof n.props.onPress === 'function',
    );
    await act(async () => {
      pill.props.onPress();
    });
    await act(async () => {
      pill.props.onPress();
    });

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

/** Screens claim a toast position for as long as they are on screen. */
const Screen: React.FC<{ px: number }> = ({ px }) => {
  useToastBottom(px);
  return null;
};

const bottomOf = (tree: ReactTestRenderer.ReactTestRenderer): number => {
  const host = tree.root.findAll(
    n => typeof n.type === 'string' && n.props.pointerEvents === 'box-none',
  )[0];
  return StyleSheet.flatten(host.props.style).bottom as number;
};

describe('toast position', () => {
  const Layers: React.FC<{ inner: boolean }> = ({ inner }) => (
    <FeedbackProvider>
      <Probe />
      <Screen px={TOAST_BOTTOM.settings} />
      {inner ? <Screen px={TOAST_BOTTOM.viewer} /> : null}
    </FeedbackProvider>
  );

  it('hands the position back to the screen underneath, not to the nav', async () => {
    // Help opens over Settings, then closes. Settings has no bottom nav, so a
    // toast that snapped back to the nav offset would float mid-screen.
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = ReactTestRenderer.create(
        <ThemeProvider>
          <LanguageProvider>
            <Layers inner />
          </LanguageProvider>
        </ThemeProvider>,
      );
    });
    mounted.push(tree);

    await act(async () => {
      api.showToast({ message: 'Saved', duration: 0 });
    });
    expect(bottomOf(tree)).toBe(TOAST_BOTTOM.viewer);

    await act(async () => {
      tree.update(
        <ThemeProvider>
          <LanguageProvider>
            <Layers inner={false} />
          </LanguageProvider>
        </ThemeProvider>,
      );
    });
    expect(bottomOf(tree)).toBe(TOAST_BOTTOM.settings);
  });
});
