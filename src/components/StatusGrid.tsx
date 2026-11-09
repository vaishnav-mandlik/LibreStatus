import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { grid, type } from '../theme/tokens';
import { Tile, type TileVariant } from './Tile';
import type { StatusFile } from '../types';

/** Which screen the shared gallery is standing in for; picks labels and tray. */
export type GalleryContext = 'feed' | 'library';

export interface StatusGridProps {
  /** Already filtered and sorted; the grid only splits it into sections. */
  items: StatusFile[];
  context: GalleryContext;
  selecting: boolean;
  selectedIds: Set<string>;
  isSaved: (id: string) => boolean;
  isNew?: (item: StatusFile) => boolean;
  onPress: (item: StatusFile) => void;
  onLongPress: (item: StatusFile) => void;
  refreshing: boolean;
  onRefresh?: () => void;
  /** Scrolls with the list, above section A. */
  header?: React.ReactNode;
  /** Shown instead of the sections when `items` is empty. */
  empty: React.ReactNode;
  /** Height of whatever floats over the bottom of the list (nav or tray). */
  bottomInset: number;
}

type Section = 'a' | 'b';

export type GridRow =
  | { kind: 'header'; key: string; section: Section; label: string; count: number }
  | {
      kind: 'tiles';
      key: string;
      section: Section;
      items: StatusFile[];
      cols: number;
      variant: TileVariant;
      first: boolean;
      last: boolean;
      /** Index of this row's first item in the whole list, for the stagger. */
      start: number;
    };

/** `animation-delay:{{ item.delay }}` — the prototype's `(i * 26) + 'ms'`. */
const STAGGER_MS = 26;
/**
 * The prototype mounts all eighteen tiles at once, so its last delay is
 * harmless. Here the list is virtualised, so the stagger is capped at a
 * screenful and only applied while the grid is still painting its first
 * batch — a tile scrolled into view a minute later must not wait its turn,
 * and (see `TileIn`) must not play the entrance at all.
 */
const STAGGER_CAP = 12;
const STAGGER_WINDOW_MS = 400;

/** Space left for tiles once the 20px edges and the 8px gutters are taken. */
const tileWidthFor = (listWidth: number, cols: number): number =>
  (listWidth - grid.edge * 2 - grid.gutter * (cols - 1)) / cols;

const chunk = <T,>(list: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) {
    out.push(list.slice(i, i + size));
  }
  return out;
};

/** `styles.header` / `styles.headerB` paddings, and the last row's tail. */
const HEADER_PAD_TOP = { a: 22, b: 26 } as const;
const HEADER_PAD_BOTTOM = 10;
const SECTION_END_PAD = 20;

/**
 * Line box of the 9.5px JetBrains Mono eyebrow, the tallest thing in a section
 * header row: the face asks for (1020 ascent + 300 descent) / 1000 upem =
 * 1.32em of leading, so one line takes 9.5 × 1.32 = 12.54dp.
 *
 * Spelled out because `type.eyebrow` sets no `lineHeight` — the font decides —
 * and `getItemLayout` has to answer before the row has ever been measured.
 * Only the two headers use it, and a fraction of a dp of rounding on a row
 * that is off screen is invisible either way: nothing at rest is positioned
 * from these numbers, they only place the virtualisation window.
 */
const EYEBROW_LINE = 12.54;

export interface RowLayout {
  length: number;
  offset: number;
}

/**
 * Height and top edge of every row, in list-content order.
 *
 * A row's `length` carries its own top margin (the 8px gutter between tile
 * rows), which a measured layout would report on the row above instead. That
 * keeps the running offsets — the only figures the list actually navigates by
 * — exact, and it is why the last section's 20px tail is included too.
 *
 * Offsets are relative to the first row, so a caller with a list header adds
 * its measured height.
 */
export const rowLayouts = (rows: GridRow[], listWidth: number): RowLayout[] => {
  const out: RowLayout[] = [];
  let offset = 0;
  for (const row of rows) {
    const length =
      row.kind === 'header'
        ? HEADER_PAD_TOP[row.section] + EYEBROW_LINE + HEADER_PAD_BOTTOM
        : tileWidthFor(listWidth, row.cols) * grid.ratio +
          (row.first ? 0 : grid.gutter) +
          (row.section === 'b' && row.last ? SECTION_END_PAD : 0);
    out.push({ length, offset });
    offset += length;
  }
  return out;
};

/**
 * The prototype's `slideR`: a 40%-wide accent gradient at the top of the
 * scroll area that slides in from 26px while fading, every 0.9s, for as long
 * as a scan is running.
 */
const RefreshLine: React.FC = () => {
  const { theme } = useTheme();
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(v, {
        toValue: 1,
        duration: 900,
        easing: Easing.bezier(0.42, 0, 0.58, 1),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);

  return (
    <View
      pointerEvents="none"
      testID="refresh-line"
      style={[styles.refreshTrack, { backgroundColor: theme.track }]}
    >
      <Animated.View
        style={[
          styles.refreshBar,
          {
            opacity: v,
            transform: [
              { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', theme.accent, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.fill}
        />
      </Animated.View>
    </View>
  );
};

/**
 * The Feed and Library gallery: section A is the first four items in two
 * columns (one column when there is a single item, as the prototype does),
 * section B the rest in three.
 *
 * Headers and tile rows are flattened into one FlatList: SectionList has no
 * column support and a list per section would lose virtualisation. Every row
 * height is computable from the column count, so `getItemLayout` answers for
 * all of them and the list never has to measure a cell.
 */
export const StatusGrid: React.FC<StatusGridProps> = ({
  items,
  context,
  selecting,
  selectedIds,
  isSaved,
  isNew,
  onPress,
  onLongPress,
  refreshing,
  onRefresh,
  header,
  empty,
  bottomInset,
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { width: windowWidth } = useWindowDimensions();
  const [listWidth, setListWidth] = useState(windowWidth);
  /** When this grid first painted, so only its opening batch is staggered. */
  const mountedAt = useRef(Date.now());
  /**
   * The screen's own header scrolls with the list, so every row sits that much
   * further down the content than `rowLayouts` reports. Kept in a ref, not
   * state: `getItemLayout` is asked afresh on each scroll, so the corrected
   * offsets take effect without a render.
   */
  const headerHeight = useRef(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) {
      setListWidth(w);
    }
  }, []);

  const onHeaderLayout = useCallback((e: LayoutChangeEvent) => {
    headerHeight.current = e.nativeEvent.layout.height;
  }, []);

  const rows = useMemo<GridRow[]>(() => {
    const hero = items.slice(0, grid.heroCount);
    const rest = items.slice(grid.heroCount);
    if (hero.length === 0) {
      return [];
    }
    const heroCols = hero.length > 2 ? grid.heroCols : hero.length;
    const out: GridRow[] = [];
    const push = (
      section: Section,
      list: StatusFile[],
      cols: number,
      variant: TileVariant,
      offset: number,
    ) => {
      const groups = chunk(list, cols);
      groups.forEach((group, i) => {
        out.push({
          kind: 'tiles',
          key: `${section}:${i}`,
          section,
          items: group,
          cols,
          variant,
          first: i === 0,
          last: i === groups.length - 1,
          start: offset + i * cols,
        });
      });
    };

    out.push({
      kind: 'header',
      key: 'h:a',
      section: 'a',
      label: t(context === 'feed' ? 'group.justNow' : 'group.today'),
      count: hero.length,
    });
    push('a', hero, heroCols, 'hero', 0);

    if (rest.length > 0) {
      out.push({
        kind: 'header',
        key: 'h:b',
        section: 'b',
        label: t(context === 'feed' ? 'group.earlierToday' : 'group.earlierWeek'),
        count: rest.length,
      });
      push('b', rest, grid.restCols, 'small', hero.length);
    }
    return out;
  }, [items, context, t]);

  const layouts = useMemo(() => rowLayouts(rows, listWidth), [rows, listWidth]);

  /*
   * Held steady so the content container's style is not a fresh object on
   * every render of the grid — three of these are mounted behind the pager,
   * and each re-render otherwise re-flattens and re-diffs the same padding.
   */
  const contentStyle = useMemo(
    () => ({ paddingBottom: bottomInset + 10 }),
    [bottomInset],
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<GridRow> | null | undefined, index: number) => {
      const row = layouts[index];
      return {
        length: row?.length ?? 0,
        offset: (row?.offset ?? 0) + headerHeight.current,
        index,
      };
    },
    [layouts],
  );

  const renderRow = useCallback(
    ({ item: row }: { item: GridRow }) => {
      if (row.kind === 'header') {
        return (
          <View style={[styles.header, row.section === 'b' && styles.headerB]}>
            <Text style={[type.eyebrow, { color: theme.textMuted }]}>{row.label}</Text>
            <View style={styles.fill} />
            <Text style={[type.monoSm, { color: theme.textFaint }]}>{row.count}</Text>
          </View>
        );
      }
      const width = tileWidthFor(listWidth, row.cols);
      const staggering = Date.now() - mountedAt.current < STAGGER_WINDOW_MS;
      return (
        <View
          style={[
            styles.tiles,
            !row.first && styles.tilesLater,
            row.section === 'b' && row.last && styles.tilesEnd,
          ]}
        >
          {row.items.map((item, i) => (
            <Tile
              key={item.id}
              item={item}
              variant={row.variant}
              width={width}
              enterDelay={
                staggering
                  ? Math.min(row.start + i, STAGGER_CAP) * STAGGER_MS
                  : null
              }
              isSaved={isSaved(item.id)}
              isNew={!!isNew?.(item)}
              selecting={selecting}
              selected={selectedIds.has(item.id)}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          ))}
        </View>
      );
    },
    [theme, listWidth, isSaved, isNew, selecting, selectedIds, onPress, onLongPress],
  );

  return (
    <View style={styles.fill} onLayout={onLayout}>
      <FlatList
        data={rows}
        renderItem={renderRow}
        keyExtractor={row => row.key}
        ListHeaderComponent={
          header != null ? (
            <View testID="grid-header" onLayout={onHeaderLayout}>
              {header}
            </View>
          ) : undefined
        }
        ListEmptyComponent={<>{empty}</>}
        contentContainerStyle={contentStyle}
        showsVerticalScrollIndicator={false}
        /*
         * The Library's search field sits above this list, so its keyboard is
         * up while the results are on screen. At the default `never` a tap
         * anywhere inside the list is spent dismissing the keyboard and the
         * tile under the finger never hears about it: the first tap on a
         * search result opened nothing, and only the second one did. `handled`
         * lets a tile take the tap and still closes the keyboard on a tap that
         * lands between tiles.
         */
        keyboardShouldPersistTaps="handled"
        getItemLayout={getItemLayout}
        /*
         * A row here is two or three tiles, so the per-row budgets are a third
         * of what a plain list would take: three rows is section A plus its
         * heading — two rows of tiles, one screenful of decode work — and the
         * batches after it stay small enough to land inside a 60Hz frame.
         * The batching period is the platform default, spelled out because the
         * four numbers only make sense read together.
         */
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        updateCellsBatchingPeriod={50}
        windowSize={5}
        // Safe now that `getItemLayout` gives the list exact geometry: rows
        // scrolled out of the window are detached instead of drawn offscreen.
        removeClippedSubviews
        refreshControl={
          onRefresh ? (
            /*
             * Painted fully transparent on purpose. The prototype's only
             * refresh affordance is the 2px `slideR` line below
             * (template.html:155) plus the header glyph's own spin; Android's
             * spinner disc is not in the design at all.
             *
             * A pull is not left without feedback by that: pulling sets
             * `refreshing`, which is what raises the line. And the disc is not
             * only a pull artefact — Android draws it whenever `refreshing`
             * goes true, so letting it paint put a stray spinner at the top of
             * the list every time the header's Refresh button was tapped
             * (render 25-feed-refreshing has no such disc). The control still
             * exists so the gesture works; it is just invisible.
             */
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['transparent']}
              tintColor="transparent"
              progressBackgroundColor="transparent"
              /*
               * Transparent colours empty the arc but Android still animates
               * the disc itself down from the top edge, which is the spring
               * the owner reported. Parking the progress view far above the
               * list is what actually keeps it off screen; the pull gesture is
               * unaffected, and `RefreshLine` remains the visible feedback.
               */
              progressViewOffset={-400}
            />
          ) : undefined
        }
      />
      {refreshing ? <RefreshLine /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 22,
    paddingHorizontal: grid.edge,
    paddingBottom: 10,
  },
  headerB: { paddingTop: 26 },
  tiles: {
    flexDirection: 'row',
    gap: grid.gutter,
    paddingHorizontal: grid.edge,
  },
  tilesLater: { marginTop: grid.gutter },
  tilesEnd: { paddingBottom: 20 },
  refreshTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    overflow: 'hidden',
  },
  refreshBar: { width: '40%', height: '100%' },
});

export default StatusGrid;
