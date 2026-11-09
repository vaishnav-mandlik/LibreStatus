/**
 * @format
 *
 * How the shell's motion is *driven*, which is not the same question as what
 * it looks like. Three things are load-bearing for smoothness and invisible in
 * a snapshot:
 *
 *   1. A control must not animate to where it already is. The toggle's track
 *      tint cannot ride the native driver, so every frame of it is a JS frame
 *      callback and a view update — and a mount used to spend 200ms of them
 *      arriving at the colour it was already painted.
 *   2. `Animated.View` memoises its `AnimatedProps` on the *identity* of the
 *      animated nodes it is handed. An `interpolate()` rebuilt inside render
 *      therefore drops and rebuilds the whole node graph on every render,
 *      which for a native-driven value is four calls into the animation module
 *      — issued, by construction, while the animation is running.
 *   3. `contentOffset` is not a hint on Android: the view manager answers it
 *      with an immediate `scrollTo`. Rebuilt from the current page it raced
 *      the pager's own animated scroll.
 */

import React from 'react';
import { Animated, ScrollView, Text, View } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Pager, RoundButton, Toggle } from '../src/components/ui';
import { Sheet } from '../src/components/Sheet';
import { SelectionTray } from '../src/components/SelectionBar';
import { ThemeProvider } from '../src/context/ThemeContext';
import { LanguageProvider } from '../src/context/LanguageContext';

jest.useFakeTimers();

const METRICS = {
  frame: { x: 0, y: 0, width: 400, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const wrap = (node: React.ReactNode): React.ReactElement => (
  <SafeAreaProvider initialMetrics={METRICS}>
    <ThemeProvider>
      <LanguageProvider>{node}</LanguageProvider>
    </ThemeProvider>
  </SafeAreaProvider>
);

const mounted: ReactTestRenderer.ReactTestRenderer[] = [];

const render = async (node: React.ReactElement) => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(node);
  });
  mounted.push(tree);
  return tree;
};

afterEach(async () => {
  for (const tree of mounted.splice(0)) {
    await act(async () => {
      tree.unmount();
    });
  }
  jest.restoreAllMocks();
});

/**
 * A fresh `scrollTo` spy. `jest.spyOn` hands back the mock already installed on
 * the prototype when one is, so the history is cleared explicitly rather than
 * carried in from the test before.
 */
const spyScrollTo = (): jest.SpyInstance => {
  const spy = jest
    .spyOn(ScrollView.prototype, 'scrollTo')
    .mockImplementation(() => {});
  spy.mockClear();
  return spy;
};

/** Every `Animated.timing` started while the callback runs. */
const timings = async (
  run: () => Promise<void>,
): Promise<Array<{ native: boolean; to: number }>> => {
  const started: Array<{ native: boolean; to: number }> = [];
  const real = Animated.timing;
  const spy = jest
    .spyOn(Animated, 'timing')
    .mockImplementation((value, config) => {
      const animation = real(value, config);
      const start = animation.start.bind(animation);
      animation.start = callback => {
        started.push({
          native: config.useNativeDriver === true,
          to: Number(config.toValue),
        });
        return start(callback);
      };
      return animation;
    });
  try {
    await run();
  } finally {
    spy.mockRestore();
  }
  return started;
};

/**
 * Every `Animated` node the tree currently hands to a view, in tree order.
 *
 * `Animated.View` keys its `AnimatedProps` on the identity of these, so if the
 * same render produces new ones the whole node graph is dropped and rebuilt —
 * on a native-driven value, four calls into the animation module, made while
 * the animation is running. Identical references across a re-render is the
 * property that says it did not happen.
 */
const animatedNodes = (
  tree: ReactTestRenderer.ReactTestRenderer,
): unknown[] => {
  const found: unknown[] = [];
  const walk = (value: unknown): void => {
    if (value == null) {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (typeof value === 'object') {
      const node = value as { __getValue?: unknown };
      if (typeof node.__getValue === 'function') {
        found.push(value);
        return;
      }
      Object.values(value as Record<string, unknown>).forEach(walk);
    }
  };
  tree.root
    .findAllByType(Animated.View)
    .forEach(view => walk(view.props.style));
  return found;
};

describe('Toggle', () => {
  it('does not animate on mount', async () => {
    const started = await timings(async () => {
      await render(
        wrap(
          <View>
            <Toggle value={false} />
            <Toggle value />
            <Toggle small value />
          </View>,
        ),
      );
    });
    // Each of these used to start two: a native transform and a JS-driven
    // colour, both from the resting value to the resting value.
    expect(started).toEqual([]);
  });

  it('still animates a real change, colour on the JS driver', async () => {
    const tree = await render(wrap(<Toggle value={false} />));
    const started = await timings(async () => {
      await act(async () => {
        tree.update(wrap(<Toggle value />));
      });
    });
    expect(started).toEqual([
      { native: true, to: 1 },
      { native: false, to: 1 },
    ]);
  });

  it('keeps its animated nodes across re-renders', async () => {
    const tree = await render(wrap(<Toggle value={false} />));
    const before = animatedNodes(tree);
    expect(before).toHaveLength(2);
    for (let i = 0; i < 3; i += 1) {
      await act(async () => {
        tree.update(wrap(<Toggle value={false} />));
      });
    }
    const after = animatedNodes(tree);
    expect(after).toHaveLength(before.length);
    after.forEach((node, i) => expect(node).toBe(before[i]));
  });
});

describe('animated node identity', () => {
  it('survives a re-render of the spinner, the sheet and the tray', async () => {
    const scene = (n: number) =>
      wrap(
        <View>
          <RoundButton icon="refresh" label="Refresh" spinning onPress={() => {}} />
          <Sheet visible onClose={() => {}} title="Sort by">
            <View testID={`sheet-${n}`} />
          </Sheet>
          <SelectionTray
            context="feed"
            count={n}
            onPrimary={() => {}}
            onVault={() => {}}
            onShare={() => {}}
          />
        </View>,
      );
    const tree = await render(scene(1));
    const before = animatedNodes(tree);
    expect(before.length).toBeGreaterThan(0);
    // Three tiles tapped while the tray is still arriving and the refresh
    // glyph is still turning.
    for (const n of [2, 3, 4]) {
      await act(async () => {
        tree.update(scene(n));
      });
    }
    const after = animatedNodes(tree);
    expect(after).toHaveLength(before.length);
    after.forEach((node, i) => expect(node).toBe(before[i]));
  });
});

describe('Pager', () => {
  const scene = (index: number, onIndexChange: (n: number) => void = () => {}) => (
    <Pager index={index} count={3} onIndexChange={onIndexChange}>
      <Text>all</Text>
      <Text>images</Text>
      <Text>videos</Text>
    </Pager>
  );

  it('places itself once, with no scroll command of its own', async () => {
    const scrollTo = spyScrollTo();
    const tree = await render(scene(0));
    const view = tree.root.findByType(ScrollView);
    expect(view.props.contentOffset).toEqual({ x: 0, y: 0 });
    // `contentOffset` has already placed the scroller; the width effect used
    // to send a second, redundant command in the same frame.
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('moves a page with one animated scroll, not a competing jump', async () => {
    const scrollTo = spyScrollTo();
    const tree = await render(scene(0));
    const before = tree.root.findByType(ScrollView).props.contentOffset;
    await act(async () => {
      tree.update(scene(1));
    });
    // Android answers every `contentOffset` it is handed with an instant
    // `scrollTo`, so the prop has to stay exactly where it was: the animated
    // scroll below is the move, and it must not be raced.
    expect(tree.root.findByType(ScrollView).props.contentOffset).toBe(before);
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ animated: true }),
    );
  });

  /*
   * A drag released with speed keeps travelling, and the page it settles on is
   * reported by `onMomentumScrollEnd`. Reporting the lift-point page as well
   * changed the filter twice on a reversed fling, so the underline flicked
   * through a tab the user never landed on and the record was written twice.
   */
  it('reports one page for a fling, from where it lands', async () => {
    const changes: number[] = [];
    const tree = await render(scene(0, n => changes.push(n)));
    const view = tree.root.findByType(ScrollView);
    const { width } = view.props.children[1].props.style;

    await act(async () => {
      view.props.onScrollEndDrag({
        nativeEvent: { contentOffset: { x: width * 0.6, y: 0 }, velocity: { x: -1.4, y: 0 } },
      });
    });
    expect(changes).toEqual([]);

    await act(async () => {
      view.props.onMomentumScrollEnd({
        nativeEvent: { contentOffset: { x: 0, y: 0 } },
      });
    });
    expect(changes).toEqual([]);
  });

  it('still reports a slow drag that is released without a fling', async () => {
    const changes: number[] = [];
    const tree = await render(scene(0, n => changes.push(n)));
    const view = tree.root.findByType(ScrollView);
    const { width } = view.props.children[1].props.style;

    await act(async () => {
      view.props.onScrollEndDrag({
        nativeEvent: { contentOffset: { x: width, y: 0 }, velocity: { x: 0, y: 0 } },
      });
    });

    expect(changes).toEqual([1]);
  });

  it('does not scroll when the index is an echo of a swipe it already made', async () => {
    const changes: number[] = [];
    const tree = await render(scene(0, n => changes.push(n)));
    const scrollTo = spyScrollTo();
    const view = tree.root.findByType(ScrollView);
    const { width } = view.props.children[1].props.style;
    await act(async () => {
      view.props.onMomentumScrollEnd({
        nativeEvent: { contentOffset: { x: width, y: 0 } },
      });
    });
    expect(changes).toEqual([1]);
    await act(async () => {
      tree.update(scene(1, n => changes.push(n)));
    });
    // The platform already put the scroller here. Answering the echo with a
    // scroll of our own is what used to cut a slow drag short.
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
