import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { type } from '../theme/tokens';
import type { MediaFilter } from '../types';

export interface FilterTabsProps {
  value: MediaFilter;
  counts: { all: number; photos: number; videos: number };
  onChange: (next: MediaFilter) => void;
  /** Enters selection mode. */
  onSelect: () => void;
  /** The right-hand link's visible label (`common.select`). */
  selectLabel: string;
  /** Sits on the light theme's green top bar: white text and underline. */
  tinted?: boolean;
}

/** All / Photos / Videos with live counts and a 2px underline; "Select" on the right. */
export const FilterTabs: React.FC<FilterTabsProps> = ({
  value,
  counts,
  onChange,
  onSelect,
  selectLabel,
  tinted,
}) => {
  const { theme } = useTheme();
  const on = tinted ? theme.onTopBar : theme.accent;
  const off = tinted ? theme.onTopBarMuted : theme.textMuted;
  const { t } = useLanguage();

  const tabs: Array<{ key: MediaFilter; label: string; count: number }> = [
    { key: 'all', label: t('filter.all'), count: counts.all },
    { key: 'photos', label: t('filter.photos'), count: counts.photos },
    { key: 'videos', label: t('filter.videos'), count: counts.videos },
  ];

  return (
    <View
      style={[
        styles.wrap,
        tinted
          ? { backgroundColor: theme.topBar, borderBottomColor: theme.topBar }
          : { borderBottomColor: theme.hairline },
      ]}
    >
      <View style={styles.tabs}>
        {tabs.map(tab => {
          const active = tab.key === value;
          const color = active ? on : off;
          return (
            <Pressable
              key={tab.key}
              onPress={() => onChange(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={tab.label}
              // The tab itself is 23px tall; this lifts the touch target to 44.
              hitSlop={{ top: 11, bottom: 11, left: 8, right: 8 }}
              style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
            >
              {/*
               * The template nests the count inside the label span after a
               * space. Nested Text cannot carry opacity reliably on Android,
               * so the two sit side by side on a shared baseline instead.
               */}
              <View style={styles.labelRow}>
                <Text style={[active ? type.labelActive : type.label, { color }]} numberOfLines={1}>
                  {`${tab.label} `}
                </Text>
                <Text
                  style={[
                    type.mono,
                    // On the green bar the muted ink already carries the
                    // count's weight; dimming it further fails contrast.
                    tinted ? { color: active ? on : off } : [styles.count, { color }],
                  ]}
                >
                  {tab.count}
                </Text>
              </View>
              <View
                style={[styles.bar, active ? { backgroundColor: on } : styles.barOff]}
              />
            </Pressable>
          );
        })}
      </View>
      <Pressable
        onPress={onSelect}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={selectLabel}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        <Text style={[type.link, { color: off }]}>{selectLabel}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  tabs: { flexDirection: 'row', alignItems: 'flex-end', gap: 20 },
  tab: { alignItems: 'center', gap: 7 },
  labelRow: { flexDirection: 'row', alignItems: 'baseline' },
  count: { opacity: 0.6 },
  bar: { height: 2, width: '100%', borderRadius: 2 },
  barOff: { backgroundColor: 'transparent' },
  pressed: { opacity: 0.88 },
});

export default FilterTabs;
