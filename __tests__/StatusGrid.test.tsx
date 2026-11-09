/**
 * @format
 */

import React from 'react';
import { FlatList, ScrollView, Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import {
  StatusGrid,
  rowLayouts,
  type GridRow,
  type StatusGridProps,} from '../src/components/StatusGrid';
import { Tile } from '../src/components/Tile';
import { ThemeProvider } from '../src/context/ThemeContext';
import { LanguageProvider } from '../src/context/LanguageContext';
import { status } from '../test-support/testUtils';

const wrap = (node: React.ReactElement) => (
  <ThemeProvider>
    <LanguageProvider>{node}</LanguageProvider>
  </ThemeProvider>
);

/*
 * VirtualizedList schedules its cell-batching work on a timer. Left alone it
 * fires after the test has finished and React warns about an un-acted update,
 * so the timers are faked, flushed inside act, and every tree is unmounted.
 */
jest.useFakeTimers();
const mounted: ReactTestRenderer.ReactTestRenderer[] = [];

afterEach(async () => {
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
  for (const tree of mounted.splice(0)) {
    await act(async () => {
      tree.unmount();
    });
  }
});

/**
 * The grid renders three rows up front and virtualises the rest, so a test
 * that only mounts it sees section A alone. Telling the scroll view how big it
 * is — which on a device is the first layout pass — is what lets the list fill
 * its window, so every render does it.
 */
const layout = async (tree: ReactTestRenderer.ReactTestRenderer) => {
  const scroller = tree.root.findByType(ScrollView);
  await act(async () => {
    scroller.props.onLayout({
      nativeEvent: { layout: { x: 0, y: 0, width: 750, height: 1200 } },
    });
    scroller.props.onContentSizeChange(750, 4000);
  });
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
};

const render = async (node: React.ReactElement) => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(wrap(node));
  });
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
  mounted.push(tree);
  await layout(tree);
  return tree;
};

const files = (n: number) =>
  Array.from({ length: n }, (_, i) => status({ filename: `${i}.jpg` }));

const base: Omit<StatusGridProps, 'items'> = {
  context: 'feed',
  selecting: false,
  selectedIds: new Set(),
  isSaved: () => false,
  onPress: () => undefined,
  onLongPress: () => undefined,
  refreshing: false,
  empty: <Text>empty</Text>,
  bottomInset: 0,
};

type Row = { kind: string; key: string; label?: string; count?: number; cols?: number; variant?: string };

const rowsOf = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findByType(FlatList).props.data as Row[];

const gridRowsOf = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findByType(FlatList).props.data as GridRow[];

const listProps = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findByType(FlatList).props;

// Jest's window is 750 wide: 2 columns → (750 - 40 - 8) / 2, 3 → (750 - 40 - 16) / 3.
const HERO_W = 351;
const SMALL_W = 694 / 3;

describe('StatusGrid sections', () => {
  it('puts the first four in two columns under "Just now" and the rest in three under "Earlier today"', async () => {
    const tree = await render(<StatusGrid {...base} items={files(7)} />);
    const rows = rowsOf(tree);
    expect(rows.map(r => r.kind)).toEqual([
      'header', 'tiles', 'tiles', 'header', 'tiles',
    ]);
    expect(rows[0]).toMatchObject({ label: 'Just now', count: 4 });
    expect(rows[3]).toMatchObject({ label: 'Earlier today', count: 3 });
    expect(rows[1]).toMatchObject({ cols: 2, variant: 'hero' });
    expect(rows[4]).toMatchObject({ cols: 3, variant: 'small' });
    expect(new Set(rows.map(r => r.key)).size).toBe(rows.length);

    const tiles = tree.root.findAllByType(Tile);
    expect(tiles.filter(t => t.props.variant === 'hero')).toHaveLength(4);
    expect(tiles.filter(t => t.props.variant === 'small')).toHaveLength(3);
    expect(tiles[0].props.width).toBe(HERO_W);
    expect(tiles[4].props.width).toBeCloseTo(SMALL_W);
  });

  it('uses the Library labels in the library context', async () => {
    const tree = await render(<StatusGrid {...base} context="library" items={files(5)} />);
    const rows = rowsOf(tree);
    expect(rows[0].label).toBe('Today');
    expect(rows[3].label).toBe('Earlier this week');
  });

  it('omits section B when there are four items or fewer', async () => {
    const tree = await render(<StatusGrid {...base} items={files(4)} />);
    expect(rowsOf(tree).filter(r => r.kind === 'header')).toHaveLength(1);
  });

  it('gives a lone item the full width, as the prototype does', async () => {
    const tree = await render(<StatusGrid {...base} items={files(1)} />);
    expect(rowsOf(tree)[1]).toMatchObject({ cols: 1 });
    expect(tree.root.findByType(Tile).props.width).toBe(750 - 40);
  });

  it('renders the empty node instead of sections when there is nothing to show', async () => {
    const tree = await render(<StatusGrid {...base} items={[]} />);
    expect(rowsOf(tree)).toEqual([]);
    expect(tree.root.findAllByType(Text).some(t => t.props.children === 'empty')).toBe(true);
  });
});

describe('StatusGrid tile state', () => {
  it('passes saved, new and selected state down per item', async () => {
    const items = files(3);
    const tree = await render(
      <StatusGrid
        {...base}
        items={items}
        selecting
        selectedIds={new Set([items[1].id])}
        isSaved={id => id === items[0].id}
        isNew={item => item.id === items[2].id}
      />,
    );
    const tiles = tree.root.findAllByType(Tile);
    expect(tiles.map(t => t.props.isSaved)).toEqual([true, false, false]);
    expect(tiles.map(t => t.props.selected)).toEqual([false, true, false]);
    expect(tiles.map(t => t.props.isNew)).toEqual([false, false, true]);
    expect(tiles.every(t => t.props.selecting)).toBe(true);
  });
});

describe('StatusGrid refresh', () => {
  it('only wires a pull-to-refresh control when a handler is given', async () => {
    const without = await render(<StatusGrid {...base} items={files(2)} />);
    expect(without.root.findByType(FlatList).props.refreshControl).toBeUndefined();

    const withRefresh = await render(
      <StatusGrid {...base} items={files(2)} onRefresh={() => undefined} />,
    );
    expect(withRefresh.root.findByType(FlatList).props.refreshControl).toBeTruthy();
  });

  it('shows the 2px line only while refreshing', async () => {
    const idle = await render(<StatusGrid {...base} items={files(2)} />);
    expect(idle.root.findAll(n => n.props.testID === 'refresh-line')).toHaveLength(0);

    const busy = await render(<StatusGrid {...base} items={files(2)} refreshing />);
    expect(busy.root.findAll(n => n.props.testID === 'refresh-line').length).toBeGreaterThan(0);
  });

  it('leaves the 10px bottom spacer above whatever floats over the list', async () => {
    const tree = await render(<StatusGrid {...base} items={files(2)} bottomInset={70} />);
    expect(tree.root.findByType(FlatList).props.contentContainerStyle).toEqual({
      paddingBottom: 80,
    });
  });
});

describe('StatusGrid row geometry', () => {
  /*
   * Jest's window is 750 wide, so a hero tile is 351 and a small one 694/3.
   * Row heights are the tile width times the 1.18 ratio, plus the 8px gutter
   * every row but the first of its section carries and the 20px tail under
   * the last row of section B.
   */
  const HEADER_A = 22 + 12.54 + 10;
  const HEADER_B = 26 + 12.54 + 10;
  const HERO_ROW = HERO_W * 1.18;
  const SMALL_ROW = SMALL_W * 1.18;

  it('gives every row a height and a running offset', async () => {
    const tree = await render(<StatusGrid {...base} items={files(7)} />);
    const layouts = rowLayouts(gridRowsOf(tree), 750);

    expect(layouts.map(l => l.length)).toEqual([
      HEADER_A,
      HERO_ROW,
      HERO_ROW + 8,
      HEADER_B,
      SMALL_ROW + 20,
    ]);

    let running = 0;
    layouts.forEach(l => {
      expect(l.offset).toBeCloseTo(running);
      running += l.length;
    });
  });

  it('drops the gutter on a section’s first row and the tail on any but its last', async () => {
    const tree = await render(<StatusGrid {...base} items={files(10)} />);
    const rows = gridRowsOf(tree);
    // header A, two hero rows, header B, two small rows.
    expect(rows).toHaveLength(6);
    const layouts = rowLayouts(rows, 750);
    expect(layouts[4].length).toBeCloseTo(SMALL_ROW);
    expect(layouts[5].length).toBeCloseTo(SMALL_ROW + 8 + 20);
  });

  it('reports nothing for an empty list', () => {
    expect(rowLayouts([], 750)).toEqual([]);
  });

  it('feeds those offsets to the list, shifted by the measured header', async () => {
    const tree = await render(
      <StatusGrid {...base} items={files(7)} header={<Text>head</Text>} />,
    );
    const getItemLayout = listProps(tree).getItemLayout as (
      data: unknown,
      index: number,
    ) => { length: number; offset: number; index: number };

    expect(getItemLayout(null, 2)).toEqual({
      length: HERO_ROW + 8,
      offset: HEADER_A + HERO_ROW,
      index: 2,
    });

    // Until the header has been laid out its height is unknown, and once it
    // has, every row below it moves down by exactly that much.
    const head = tree.root.findAll(n => n.props.testID === 'grid-header')[0];
    await act(async () => {
      head.props.onLayout({
        nativeEvent: { layout: { x: 0, y: 0, width: 750, height: 140 } },
      });
    });
    expect(getItemLayout(null, 2).offset).toBeCloseTo(HEADER_A + HERO_ROW + 140);
    expect(getItemLayout(null, 0).offset).toBeCloseTo(140);
  });

  it('answers safely for an index the data no longer has', async () => {
    const tree = await render(<StatusGrid {...base} items={files(2)} />);
    const getItemLayout = listProps(tree).getItemLayout as (
      data: unknown,
      index: number,
    ) => { length: number; offset: number; index: number };
    expect(getItemLayout(null, 99)).toEqual({ length: 0, offset: 0, index: 99 });
  });
});

describe('StatusGrid virtualisation', () => {
  it('budgets in rows of tiles, not in tiles', async () => {
    const props = listProps(await render(<StatusGrid {...base} items={files(30)} />));
    // A row is two or three tiles: three rows of first-paint work is section A
    // plus its heading.
    expect(props.initialNumToRender).toBe(3);
    expect(props.maxToRenderPerBatch).toBe(3);
    expect(props.updateCellsBatchingPeriod).toBe(50);
    expect(props.windowSize).toBe(5);
    expect(props.removeClippedSubviews).toBe(true);
  });

  it('lets a tile take the first tap while the search keyboard is up', async () => {
    // The Library's search field sits above this list. At the default `never`
    // the tap is spent dismissing the keyboard and the tile never hears about
    // it, so the first tap on a search result opened nothing.
    const tree = await render(<StatusGrid {...base} items={files(4)} />);
    expect(listProps(tree).keyboardShouldPersistTaps).toBe('handled');
  });

  it('keeps the platform refresh spinner invisible so the 2px line is the only indicator', async () => {
    // The prototype (template.html:155) shows a single 40%-wide sliding accent
    // line and no spinner disc. The control has to exist for the pull gesture,
    // so every one of its painted parts is transparent instead.
    const tree = await render(
      <StatusGrid {...base} items={files(2)} onRefresh={() => undefined} />,
    );
    const control = listProps(tree).refreshControl;
    expect(control.props.colors).toEqual(['transparent']);
    expect(control.props.tintColor).toBe('transparent');
    expect(control.props.progressBackgroundColor).toBe('transparent');
  });
});


describe('StatusGrid opening deal', () => {
  /*
   * `animation-delay:{{ item.delay }}` — the prototype's `(i * 26) + 'ms'` —
   * is a CSS animation on an element the prototype creates once. Here the list
   * is virtualised, so a cell is created again every time it re-enters the
   * window. Rows painted after the opening batch therefore hand their tiles a
   * null delay, which `Tile` reads as "no entrance": otherwise every tile the
   * user scrolled back to re-dealt itself, and each one rebuilt a native
   * animated node graph from the JS thread in the middle of the scroll (1065
   * NativeAnimated operations per steady scroll step on the Feed, 1923 on the
   * saved Library, against 282 and 510 once the entrances are latched).
   */
  const delaysOf = (tree: ReactTestRenderer.ReactTestRenderer) =>
    tree.root.findAllByType(Tile).map(t => t.props.enterDelay as number | null);

  it('staggers the opening batch by 26ms an item, capped at a screenful', async () => {
    const tree = await render(<StatusGrid {...base} items={files(30)} />);
    const delays = delaysOf(tree);
    expect(delays.slice(0, 6)).toEqual([0, 26, 52, 78, 104, 130]);
    // Twelve items in, the cap holds: the prototype's eighteenth tile waits
    // 442ms because all eighteen are already on screen, and a virtualised
    // thirtieth must not wait at all.
    expect(Math.max(...(delays as number[]))).toBe(12 * 26);
  });

  it('hands a row painted after the opening window no entrance at all', async () => {
    const items = files(30);
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = ReactTestRenderer.create(
        wrap(<StatusGrid {...base} items={items} isSaved={() => false} />),
      );
    });
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    mounted.push(tree);
    await layout(tree);
    expect(delaysOf(tree)[0]).toBe(0);

    // Past the 400ms window, and something the screen owns changes identity —
    // a save flipping a tick is the everyday case — so every mounted row is
    // asked to render again.
    await act(async () => {
      jest.advanceTimersByTime(600);
    });
    await act(async () => {
      tree.update(wrap(<StatusGrid {...base} items={items} isSaved={() => false} />));
    });
    expect(delaysOf(tree).every(d => d === null)).toBe(true);
  });
});
