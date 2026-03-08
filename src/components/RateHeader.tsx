import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

const colors = {
  neu900: '#242620',
  neu500: '#8D8A83',
  positive: '#34A853',
  negative: '#EA4335',
};

const MAX_CHARS = 10;

interface Props {
  from: string;
  to: string;
  rate: number | null;
  change: number;
  changePct: number;
  flipTrigger: number;
}

export function RateHeader({ from, to, rate, change, changePct, flipTrigger }: Props) {
  const isFirstRender = useRef(true);
  const prevRateRef = useRef('');

  const charAnims = useRef(
    Array.from({ length: MAX_CHARS }, () => ({
      y: new Animated.Value(0),
      opacity: new Animated.Value(1),
    }))
  ).current;

  useEffect(() => {
    const newStr = rate !== null ? rate.toFixed(5) : '—';

    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevRateRef.current = newStr;
      return;
    }

    const oldStr = prevRateRef.current;
    prevRateRef.current = newStr;

    // Find first digit position that changed
    let firstChanged = newStr.length;
    for (let i = 0; i < Math.min(newStr.length, oldStr.length); i++) {
      if (newStr[i] !== oldStr[i]) {
        firstChanged = i;
        break;
      }
    }

    if (firstChanged >= newStr.length) return;

    // Build staggered animations from firstChanged rightward
    const anims: Animated.CompositeAnimation[] = [];
    for (let i = firstChanged; i < newStr.length && i < MAX_CHARS; i++) {
      const anim = charAnims[i];
      anim.y.setValue(10);
      anim.opacity.setValue(0);
      anims.push(
        Animated.parallel([
          Animated.timing(anim.y, {
            toValue: 0,
            duration: 200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(anim.opacity, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          }),
        ])
      );
    }

    Animated.stagger(15, anims).start();
  }, [flipTrigger]);

  const isPositive = change >= 0;
  const changeColor = isPositive ? colors.positive : colors.negative;
  const arrow = isPositive ? '▲' : '▼';
  const rateStr = rate !== null ? rate.toFixed(5) : '—';

  return (
    <View style={styles.container}>
      <Text style={styles.pairLabel}>{from} to {to}</Text>
      <View style={styles.rateRow}>
        {rateStr.split('').map((char, i) => (
          <Animated.View
            key={i}
            style={{
              transform: [{ translateY: charAnims[i].y }],
              opacity: charAnims[i].opacity,
            }}
          >
            <Text style={styles.rate}>{char}</Text>
          </Animated.View>
        ))}
      </View>
      {rate !== null && (
        <View style={[styles.badge, { backgroundColor: isPositive ? '#E8F5E9' : '#FEECEB' }]}>
          <Text style={[styles.badgeText, { color: changeColor }]}>
            {arrow} {Math.abs(change).toFixed(5)} ({Math.abs(changePct).toFixed(2)}%)
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  pairLabel: {
    fontSize: 14,
    color: colors.neu500,
    fontFamily: 'System',
    fontWeight: '400',
    marginBottom: 2,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  rate: {
    fontSize: 42,
    fontWeight: '700',
    color: colors.neu900,
    fontFamily: 'System',
    letterSpacing: -1,
    lineHeight: 50,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 2,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'System',
  },
});
