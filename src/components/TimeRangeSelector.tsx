import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import type { TimeRange } from '../api/frankfurter';

const RANGES: TimeRange[] = ['1w', '1m', '3m', '6m', '1y', 'All'];
const GAP = 6;
const PADDING_H = 16;

const NEU_500 = '#8D8A83';
const NEU_900 = '#242620';
const SECONDARY = '#EFECE7';

interface Props {
  selected: TimeRange;
  onSelect: (range: TimeRange) => void;
}

export function TimeRangeSelector({ selected, onSelect }: Props) {
  const [containerWidth, setContainerWidth] = useState(0);
  const pillX = useRef<Animated.Value | null>(null);

  const tabWidth = containerWidth > 0
    ? (containerWidth - PADDING_H * 2 - GAP * (RANGES.length - 1)) / RANGES.length
    : 0;

  const getTabX = (index: number) => PADDING_H + index * (tabWidth + GAP);

  // Snap pill into place when layout first resolves
  useEffect(() => {
    if (containerWidth === 0) return;
    const x = getTabX(RANGES.indexOf(selected));
    if (pillX.current === null) {
      pillX.current = new Animated.Value(x);
    } else {
      pillX.current.setValue(x);
    }
  }, [containerWidth]);

  // Slide pill when selection changes
  useEffect(() => {
    if (pillX.current === null || containerWidth === 0) return;
    Animated.spring(pillX.current, {
      toValue: getTabX(RANGES.indexOf(selected)),
      damping: 24,
      stiffness: 200,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [selected]);

  return (
    <View
      style={styles.container}
      onLayout={e => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {/* Sliding pill — renders first so it sits underneath labels */}
      {containerWidth > 0 && pillX.current && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pillBg,
            {
              width: tabWidth,
              transform: [{ translateX: pillX.current }],
            },
          ]}
        />
      )}

      {RANGES.map(range => (
        <TouchableOpacity
          key={range}
          onPress={() => onSelect(range)}
          style={styles.tab}
          activeOpacity={0.7}
        >
          <Text style={[styles.label, { color: range === selected ? NEU_900 : NEU_500 }]}>
            {range}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: GAP,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pillBg: {
    position: 'absolute',
    top: 12,
    bottom: 12,
    left: 0,
    borderRadius: 20,
    backgroundColor: SECONDARY,
    borderWidth: 1,
    borderColor: NEU_900,
  },
  tab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'System',
  },
});
