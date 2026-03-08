import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { TimeRange } from '../api/frankfurter';

const RANGES: TimeRange[] = ['1w', '1m', '3m', '6m', '1y', 'All'];

const NEU_500 = '#8D8A83';
const NEU_900 = '#242620';
const SECONDARY = '#EFECE7';

interface Props {
  selected: TimeRange;
  onSelect: (range: TimeRange) => void;
}

export function TimeRangeSelector({ selected, onSelect }: Props) {
  return (
    <View style={styles.container}>
      {RANGES.map(range => {
        const isSelected = range === selected;
        return (
          <TouchableOpacity
            key={range}
            onPress={() => onSelect(range)}
            style={[styles.pill, isSelected && styles.pillSelected]}
            activeOpacity={0.7}
          >
            <Text style={[styles.label, isSelected && styles.labelSelected]}>
              {range}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pill: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 20,
  },
  pillSelected: {
    backgroundColor: SECONDARY,
    borderWidth: 1,
    borderColor: NEU_900,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: NEU_500,
    fontFamily: 'System',
  },
  labelSelected: {
    color: NEU_900,
    fontWeight: '600',
  },
});
