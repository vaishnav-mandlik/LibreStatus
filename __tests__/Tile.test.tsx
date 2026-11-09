/**
 * @format
 */

import React from 'react';
import { Animated, Image, StyleSheet, Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { LONG_PRESS_MS, Tile, type TileProps } from '../src/components/Tile';
import { Icon } from '../src/components/icons';
import { ThemeProvider } from '../src/context/ThemeContext';
import { LanguageProvider } from '../src/context/LanguageContext';
import { palettes, type } from '../src/theme/tokens';
import { getVideoMeta, type VideoMeta } from '../src/utils/native';
import { status } from '../test-support/testUtils';

/*
 * The tile asks native for a poster frame and a length in one call. Mocking
 * the wrapper keeps its module-level cache out of these tests, so each one
 * decides for itself what the file turns out to be.
 */
jest.mock('../src/utils/native', () => ({
  // Spread the real module: the theme provider these tiles render under also
  // reaches for it, and a partial mock made every tile test fail on a call
  // that has nothing to do with tiles.
  ...jest.requireActual('../src/utils/native'),
  getVideoMeta: jest.fn().mockResolvedValue(null),
}));

const askedNative = getVideoMeta as jest.MockedFunction<typeof getVideoMeta>;

const meta = (over: Partial<VideoMeta> = {}): VideoMeta => ({
  thumbnail: null,
  durationMs: null,
  width: null,
  height: null,
  ...over,
});

beforeEach(() => {
  askedNative.mockReset();
  askedNative.mockResolvedValue(null);
});

/** Jest's `useColorScheme` reports "light", so tiles paint the light palette. */
const theme = palettes.light;

const render = async (node: React.ReactElement) => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <ThemeProvider>
        <LanguageProvider>{node}</LanguageProvider>
      </ThemeProvider>,
    );
  });
  return tree;
};

/** The tile's own Pressable: the composite node that carries the handlers. */
const pressable = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAll(
    n =>
      n.props.accessibilityRole === 'imagebutton' && typeof n.props.onPress === 'function',
  )[0];

const icons = (tree: ReactTestRenderer.ReactTestRenderer, name: string) =>
  tree.root.findAllByType(Icon).filter(n => n.props.name === name);

/** jest.setup.js mocks react-native-linear-gradient to a host string. */
const gradients = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAll(n => String(n.type) === 'LinearGradient');

const texts = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .map(n => (Array.isArray(n.props.children) ? n.props.children.join('') : n.props.children))
    .filter((c): c is string => typeof c === 'string');

const at0930 = new Date(2026, 0, 2, 9, 30).getTime();

const base: Omit<TileProps, 'item'> = {
  variant: 'hero',
  width: 175,
  isSaved: false,
  isNew: false,
  selecting: false,
  selected: false,
  onPress: () => undefined,
  onLongPress: () => undefined,
};

describe('Tile labelling', () => {
  it('announces "<kind> <HH:MM>" for a photo', async () => {
    const tree = await render(<Tile {...base} item={status({ timestamp: at0930 })} />);
    expect(pressable(tree).props.accessibilityLabel).toBe('Photo 09:30');
  });

  it('announces a video as such', async () => {
    const tree = await render(
      <Tile {...base} item={status({ type: 'video', timestamp: at0930 })} />,
    );
    expect(pressable(tree).props.accessibilityLabel).toBe('Video 09:30');
  });

  it('enters selection after the prototype’s 420ms hold', async () => {
    const onPress = jest.fn();
    const onLongPress = jest.fn();
    const item = status({ filename: 'p.jpg' });
    const tree = await render(
      <Tile {...base} item={item} onPress={onPress} onLongPress={onLongPress} />,
    );
    const p = pressable(tree);
    expect(p.props.delayLongPress).toBe(LONG_PRESS_MS);
    expect(LONG_PRESS_MS).toBe(420);
    await act(async () => {
      p.props.onLongPress();
    });
    expect(onLongPress).toHaveBeenCalledWith(item);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('Tile hero vs small', () => {
  it('hero draws the stamp, the scrim and the glass play disc', async () => {
    const tree = await render(
      <Tile
        {...base}
        item={status({ type: 'video', timestamp: at0930, duration: 14 })}
        thumbnailUri="file:///thumbs/a.jpg"
      />,
    );
    expect(texts(tree)).toEqual(expect.arrayContaining(['09:30', '0:14']));
    expect(gradients(tree)).toHaveLength(1);
    expect(icons(tree, 'play')[0].props.size).toBe(15);
    // The poster frame, not the video itself, is what gets cover-cropped.
    expect(tree.root.findByType(Image).props.source).toEqual({ uri: 'file:///thumbs/a.jpg' });
    expect(tree.root.findByType(Image).props.resizeMode).toBe('cover');
  });

  it('small has no stamp, no scrim, a bare 14px play glyph and the duration pill', async () => {
    const tree = await render(
      <Tile
        {...base}
        variant="small"
        item={status({ type: 'video', timestamp: at0930, duration: 9 })}
      />,
    );
    expect(texts(tree)).toEqual(['0:09']);
    expect(gradients(tree)).toHaveLength(0);
    expect(icons(tree, 'play')[0].props.size).toBe(14);
  });

  it('shows the "new" badge on hero tiles only, and never while selecting', async () => {
    const hero = await render(<Tile {...base} item={status()} isNew />);
    expect(texts(hero)).toContain('new');

    const small = await render(<Tile {...base} variant="small" item={status()} isNew />);
    expect(texts(small)).not.toContain('new');

    const selecting = await render(<Tile {...base} item={status()} isNew selecting />);
    expect(texts(selecting)).not.toContain('new');
  });

  it('a video without a poster yet renders no image (dark well, never letterboxed)', async () => {
    const tree = await render(<Tile {...base} item={status({ type: 'video' })} />);
    expect(tree.root.findAllByType(Image)).toHaveLength(0);
  });
});

describe('Tile saved and selection states', () => {
  it('draws the saved tick at 21/11 on hero and 18/10 on small', async () => {
    const hero = await render(<Tile {...base} item={status()} isSaved />);
    expect(icons(hero, 'check')[0].props.size).toBe(11);
    expect(icons(hero, 'check')[0].props.strokeWidth).toBe(3.6);

    const small = await render(<Tile {...base} variant="small" item={status()} isSaved />);
    expect(icons(small, 'check')[0].props.size).toBe(10);
    expect(icons(small, 'check')[0].props.strokeWidth).toBe(3.8);
  });

  it('hides the saved tick while selecting and shows the empty box instead', async () => {
    const tree = await render(<Tile {...base} item={status()} isSaved selecting />);
    expect(icons(tree, 'check')).toHaveLength(0);
    expect(pressable(tree).props.accessibilityState).toEqual({ selected: false });
  });

  it('marks a selected tile with the accent check (12 on hero, 11 on small)', async () => {
    const hero = await render(<Tile {...base} item={status()} selecting selected />);
    expect(icons(hero, 'check')[0].props.size).toBe(12);
    expect(pressable(hero).props.accessibilityState).toEqual({ selected: true });

    const small = await render(
      <Tile {...base} variant="small" item={status()} selecting selected />,
    );
    expect(icons(small, 'check')[0].props.size).toBe(11);
  });

  it('carries no selection state outside selection mode', async () => {
    const tree = await render(<Tile {...base} item={status()} />);
    expect(pressable(tree).props.accessibilityState).toBeUndefined();
  });
});

describe('Tile duration pill', () => {
  const video = status({ type: 'video', filename: 'v.mp4', timestamp: at0930 });

  const pillsOf = (tree: ReactTestRenderer.ReactTestRenderer) =>
    tree.root.findAll(
      n =>
        typeof n.type === 'string' &&
        StyleSheet.flatten(n.props.style)?.backgroundColor === theme.pillOnMedia,
    );

  it('takes the length from the same call as the poster', async () => {
    askedNative.mockResolvedValue(
      meta({ thumbnail: 'file:///thumbs/v.jpg', durationMs: 14_400 }),
    );
    const tree = await render(<Tile {...base} item={video} />);

    expect(askedNative).toHaveBeenCalledTimes(1);
    expect(askedNative).toHaveBeenCalledWith(video.uri, video.id);
    expect(texts(tree)).toContain('0:14');
    expect(tree.root.findByType(Image).props.source).toEqual({
      uri: 'file:///thumbs/v.jpg',
    });
  });

  it('never rounds a real clip down to nothing', async () => {
    askedNative.mockResolvedValue(meta({ durationMs: 400 }));
    const tree = await render(<Tile {...base} item={video} />);
    expect(texts(tree)).toContain('0:01');
  });

  it('falls back to the length a CameraRoll item already carries', async () => {
    askedNative.mockResolvedValue(meta({ thumbnail: 'file:///thumbs/v.jpg' }));
    const tree = await render(
      <Tile {...base} item={status({ ...video, duration: 9 })} />,
    );
    expect(texts(tree)).toContain('0:09');
  });

  it('does not cross the bridge when the screen already knows both', async () => {
    const tree = await render(
      <Tile
        {...base}
        item={status({ ...video, duration: 9 })}
        thumbnailUri="file:///thumbs/v.jpg"
      />,
    );
    expect(askedNative).not.toHaveBeenCalled();
    expect(texts(tree)).toContain('0:09');
  });

  it('hides the pill when nothing knows the length', async () => {
    const tree = await render(<Tile {...base} item={video} />);
    expect(pillsOf(tree)).toHaveLength(0);
    expect(texts(tree)).not.toContain('0:00');
  });

  it('draws the hero pill at the metrics the template gives it', async () => {
    askedNative.mockResolvedValue(meta({ durationMs: 14_000 }));
    const tree = await render(<Tile {...base} item={video} />);
    expect(StyleSheet.flatten(pillsOf(tree)[0].props.style)).toMatchObject({
      position: 'absolute',
      bottom: 10,
      right: 10,
      paddingVertical: 3,
      paddingHorizontal: 6,
      borderRadius: 6,
    });
    const label = tree.root.findAllByType(Text).find(n => n.props.children === '0:14');
    expect(StyleSheet.flatten(label?.props.style)).toMatchObject({
      ...type.monoSmStrong,
      color: theme.onMediaBright,
    });
  });

  it('draws the small pill smaller, as the template does', async () => {
    askedNative.mockResolvedValue(meta({ durationMs: 14_000 }));
    const tree = await render(<Tile {...base} variant="small" item={video} />);
    expect(StyleSheet.flatten(pillsOf(tree)[0].props.style)).toMatchObject({
      bottom: 8,
      right: 8,
      paddingVertical: 2,
      paddingHorizontal: 5,
      borderRadius: 5,
    });
    const label = tree.root.findAllByType(Text).find(n => n.props.children === '0:14');
    expect(StyleSheet.flatten(label?.props.style)).toMatchObject({
      ...type.monoXs,
      color: theme.onMedia,
    });
  });
});

describe('Tile media that will not decode', () => {
  const video = status({ type: 'video', filename: 'v.mp4', timestamp: at0930 });

  it('a video with no readable frame still shows its play glyph, stamp and pill', async () => {
    askedNative.mockResolvedValue(meta({ durationMs: 14_000 }));
    const tree = await render(<Tile {...base} item={video} />);
    expect(tree.root.findAllByType(Image)).toHaveLength(0);
    expect(icons(tree, 'play')).toHaveLength(1);
    expect(texts(tree)).toEqual(expect.arrayContaining(['09:30', '0:14']));
  });

  it('a poster that fails to load falls back to the same dark well', async () => {
    askedNative.mockResolvedValue(
      meta({ thumbnail: 'file:///thumbs/gone.jpg', durationMs: 14_000 }),
    );
    const tree = await render(<Tile {...base} item={video} />);
    await act(async () => {
      tree.root.findByType(Image).props.onError();
    });
    expect(tree.root.findAllByType(Image)).toHaveLength(0);
    expect(icons(tree, 'play')).toHaveLength(1);
    expect(texts(tree)).toEqual(expect.arrayContaining(['09:30', '0:14']));
  });

  it('an undecodable photo drops its image and keeps the tile', async () => {
    const tree = await render(
      <Tile {...base} item={status({ timestamp: at0930 })} isSaved />,
    );
    await act(async () => {
      tree.root.findByType(Image).props.onError();
    });
    expect(tree.root.findAllByType(Image)).toHaveLength(0);
    expect(pressable(tree).props.accessibilityLabel).toBe('Photo 09:30');
    expect(icons(tree, 'check')).toHaveLength(1);
    expect(texts(tree)).toContain('09:30');
  });
});

describe('Tile entrance animations', () => {
  /*
   * The prototype's tiles carry `animation:tileIn .5s both` and their ticks
   * `animation:ringIn`, which a browser plays exactly once — when the element
   * is created. It creates its eighteen tiles once and never again.
   *
   * A FlatList cell is created every time the virtualiser brings it back into
   * the window, so those same animations were replaying on rows the user had
   * already scrolled past: a visible re-fade, and a fresh native animated node
   * graph per tile built from the JS thread in the middle of the fling. With
   * `NativeAnimatedModule` counted, one steady scroll step that recycled 33
   * tiles cost 1065 native animated operations on the Feed and 1923 on the
   * Library (where every tile carries a tick); latching the entrances at mount
   * took those to 282 and 510, all of it teardown of the opening deal, and a
   * scroll back to the top from 708 operations to none.
   *
   * `Animated.timing` is therefore the assertion: an entrance that is not
   * started has no node graph to build, connect, drive or drop.
   */
  let timing: jest.SpyInstance;
  const trees: ReactTestRenderer.ReactTestRenderer[] = [];

  /*
   * A staggered entrance is a delayed `Animated.timing`, which parks itself on
   * a timer. Left on the real clock it fires after the test has torn the tree
   * down and the native driver has no view left to attach to, so this block
   * runs on fake timers and drains them while the trees are still mounted.
   */
  beforeEach(() => {
    jest.useFakeTimers();
    timing = jest.spyOn(Animated, 'timing');
  });

  afterEach(async () => {
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    for (const tree of trees.splice(0)) {
      await act(async () => {
        tree.unmount();
      });
    }
    timing.mockRestore();
    jest.useRealTimers();
  });

  const keep = (tree: ReactTestRenderer.ReactTestRenderer) => {
    trees.push(tree);
    return tree;
  };

  /** The style on the tile's outermost wrapper — `tileIn`'s own view. */
  const wrapperStyle = (tree: ReactTestRenderer.ReactTestRenderer) => {
    const json = tree.toJSON();
    return (Array.isArray(json) ? json[0] : json)?.props.style as
      | { width?: number; opacity?: number }
      | undefined;
  };

  /** Just the durations, which is what tells the three entrances apart. */
  const started = () =>
    timing.mock.calls.map(call => (call[1] as { duration: number }).duration);

  it('deals a tile in when the grid hands it a delay', async () => {
    keep(await render(<Tile {...base} item={status()} enterDelay={26} />));
    expect(timing).toHaveBeenCalledTimes(1);
    expect(timing.mock.calls[0][1]).toMatchObject({
      duration: 500,
      delay: 26,
      useNativeDriver: true,
    });
  });

  it('draws a cell recycled into view settled, with no animation at all', async () => {
    const tree = keep(
      await render(<Tile {...base} item={status({ timestamp: at0930 })} enterDelay={null} />),
    );
    expect(started()).toEqual([]);
    // Settled means the finished frame, not a missing one: the wrapper carries
    // the column width and nothing else, which is where `tileIn` ends.
    expect(wrapperStyle(tree)).toEqual({ width: 175 });
    expect(texts(tree)).toContain('09:30');
    expect(tree.root.findByType(Image).props.source).toEqual({ uri: status().uri });
  });

  it('keeps dealing a half-played entrance when the grid drops the delay under it', async () => {
    // The grid stops staggering 400ms after it mounts, so a tile dealt at 26ms
    // is re-rendered with a null delay while its own animation is still
    // running. Swapping the wrapper out at that point would snap the tile to
    // its final frame mid-fade.
    const item = status();
    const tree = keep(await render(<Tile {...base} item={item} enterDelay={26} />));
    await act(async () => {
      tree.update(
        <ThemeProvider>
          <LanguageProvider>
            <Tile {...base} item={item} enterDelay={null} />
          </LanguageProvider>
        </ThemeProvider>,
      );
    });
    expect(timing).toHaveBeenCalledTimes(1);
    expect(wrapperStyle(tree)?.opacity).toBeDefined();
  });

  it('does not re-pop a tick that was already on the tile when it mounted', async () => {
    // The whole Library is saved, so on that grid this is every tile.
    const tree = keep(
      await render(<Tile {...base} item={status()} isSaved enterDelay={null} />),
    );
    expect(started()).toEqual([]);
    expect(icons(tree, 'check')[0].props.size).toBe(11);
    expect(icons(tree, 'check')[0].props.strokeWidth).toBe(3.6);
  });

  it('still pops the tick when the save happens while the tile is on screen', async () => {
    // `ringIn` is about the state change, and that has not stopped happening
    // just because the tile mounted outside the opening deal.
    const item = status();
    const view = (saved: boolean) => (
      <ThemeProvider>
        <LanguageProvider>
          <Tile {...base} item={item} isSaved={saved} enterDelay={null} />
        </LanguageProvider>
      </ThemeProvider>
    );
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = keep(ReactTestRenderer.create(view(false)));
    });
    expect(started()).toEqual([]);
    await act(async () => {
      tree.update(view(true));
    });
    expect(started()).toEqual([260]);
    expect(icons(tree, 'check')).toHaveLength(1);
  });

  it('does not re-play the wash on a tile recycled while it was already selected', async () => {
    const tree = keep(
      await render(<Tile {...base} item={status()} selecting selected enterDelay={null} />),
    );
    expect(started()).toEqual([]);
    expect(icons(tree, 'check')[0].props.size).toBe(12);
  });

  it('still washes a tile the user selects while it is on screen', async () => {
    const item = status();
    const view = (selected: boolean) => (
      <ThemeProvider>
        <LanguageProvider>
          <Tile {...base} item={item} selecting selected={selected} enterDelay={null} />
        </LanguageProvider>
      </ThemeProvider>
    );
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = keep(ReactTestRenderer.create(view(false)));
    });
    expect(started()).toEqual([]);
    await act(async () => {
      tree.update(view(true));
    });
    // `fadeIn .14s` on the wash and `ringIn .2s` on the disc, as the template
    // gives them (template.html:191-192).
    expect(started().sort((a, b) => a - b)).toEqual([140, 200]);
  });

  it('washes a tile selected again after it was recycled in already selected', async () => {
    // The tile mounts settled because the wash was already drawn on it, but
    // the wash is about the state change, not about the cell: once the user
    // has cleared it, the next tap on that tile is an ordinary selection and
    // has to fade like every other tile on the row. Freezing the answer at
    // mount left one tile snapping while its neighbours faded.
    const item = status();
    const view = (selected: boolean) => (
      <ThemeProvider>
        <LanguageProvider>
          <Tile {...base} item={item} selecting selected={selected} enterDelay={null} />
        </LanguageProvider>
      </ThemeProvider>
    );
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = keep(ReactTestRenderer.create(view(true)));
    });
    expect(started()).toEqual([]);
    await act(async () => {
      tree.update(view(false));
    });
    await act(async () => {
      tree.update(view(true));
    });
    expect(started().sort((a, b) => a - b)).toEqual([140, 200]);
  });

  it('brings a tick back the way leaving selection has always brought it back', async () => {
    // Selection hides the saved ticks; leaving it draws them again, and that
    // is a `ringIn` the app shipped before the entrances were latched. Only
    // the recycled *mount* is settled — a discrete tap is not scroll work.
    const item = status();
    const view = (selecting: boolean) => (
      <ThemeProvider>
        <LanguageProvider>
          <Tile
            {...base}
            item={item}
            isSaved
            selecting={selecting}
            selected={false}
            enterDelay={null}
          />
        </LanguageProvider>
      </ThemeProvider>
    );
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = keep(ReactTestRenderer.create(view(false)));
    });
    expect(started()).toEqual([]);
    await act(async () => {
      tree.update(view(true));
    });
    await act(async () => {
      tree.update(view(false));
    });
    expect(started()).toEqual([260]);
  });

  it('deals every entrance during the opening deal, tick included', async () => {
    // Nothing about the first paint changes: a saved tile dealt into the grid
    // fades in and its tick pops, exactly as the prototype draws it.
    keep(await render(<Tile {...base} item={status()} isSaved enterDelay={0} />));
    expect(started().sort((a, b) => a - b)).toEqual([260, 500]);
  });
});
