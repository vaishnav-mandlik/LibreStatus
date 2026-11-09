import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { grid, radius } from '../theme/tokens';

const HERO_ROWS = 2;
const REST_ROWS = 1;

/**
 * Placeholder tiles shown while the first scan runs, on the same geometry the
 * real grid uses (section A in two columns, section B in three) so nothing
 * jumps when the files arrive.
 *
 * One shared Animated.Value drives every opacity on the native driver, so the
 * pulse costs nothing while the JS thread is busy with the scan — which is
 * exactly when this is on screen.
 */
export const GridSkeleton: React.FC = () => {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const pulse = useRef(new Animated.Value(0)).current;

  const heroWidth = (width - grid.edge * 2 - grid.gutter * (grid.heroCols - 1)) / grid.heroCols;
  const restWidth = (width - grid.edge * 2 - grid.gutter * (grid.restCols - 1)) / grid.restCols;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 780,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 780,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.9] });

  const header = (later: boolean) => (
    <Animated.View style={[styles.header, later && styles.headerB, { opacity }]}>
      <View style={[styles.eyebrow, { backgroundColor: theme.surface }]} />
      <View style={styles.fill} />
      <View style={[styles.count, { backgroundColor: theme.surface }]} />
    </Animated.View>
  );

  const rows = (n: number, cols: number, tileWidth: number) =>
    Array.from({ length: n }).map((_, row) => (
      <View key={row} style={[styles.row, row > 0 && styles.rowLater]}>
        {Array.from({ length: cols }).map((__, col) => (
          <Animated.View
            key={col}
            style={[styles.tile, { width: tileWidth, backgroundColor: theme.well, opacity }]}
          />
        ))}
      </View>
    ));

  return (
    <View
      style={styles.wrap}
      // One announcement for the whole grid; seven "loading" nodes would be
      // hostile to a screen reader.
      accessible
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
    >
      {header(false)}
      {rows(HERO_ROWS, grid.heroCols, heroWidth)}
      {header(true)}
      {rows(REST_ROWS, grid.restCols, restWidth)}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { flex: 1, overflow: 'hidden' },
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
  eyebrow: { width: 64, height: 9.5, borderRadius: 3 },
  count: { width: 10, height: 9.5, borderRadius: 3 },
  row: { flexDirection: 'row', gap: grid.gutter, paddingHorizontal: grid.edge },
  rowLater: { marginTop: grid.gutter },
  tile: { aspectRatio: 1 / grid.ratio, borderRadius: radius.tile },
});

export default GridSkeleton;
