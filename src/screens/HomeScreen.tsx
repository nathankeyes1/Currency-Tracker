import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RateHeader } from '../components/RateHeader';
import { RateChart } from '../components/RateChart';
import { TimeRangeSelector } from '../components/TimeRangeSelector';
import { NavBar } from '../components/NavBar';
import { useExchangeRate } from '../hooks/useExchangeRate';
import type { TimeRange } from '../api/frankfurter';

const NEU_50  = '#FBFAF8';
const NEU_200 = '#E8E5DF';
const NEU_500 = '#8D8A83';
const NEU_900 = '#242620';
const PRIMARY = '#2C415A';

const AMOUNTS = [100, 500, 2000] as const;
type Amount = typeof AMOUNTS[number];

const RATE_MULTIPLIER: Record<Amount, number> = {
  100:  1.0,
  500:  1.00040,
  2000: 1.00090,
};

const AMOUNT_BADGE: Record<Amount, string | null> = {
  100:  null,
  500:  'Better rate',
  2000: 'Best rate',
};

export function HomeScreen() {
  const [from, setFrom] = useState('GBP');
  const [to, setTo] = useState('EUR');
  const [timeRange, setTimeRange] = useState<TimeRange>('6m');
  const [isFavorited, setIsFavorited] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<Amount>(100);
  const [amountModalVisible, setAmountModalVisible] = useState(false);
  const [scrubbedRate, setScrubbedRate] = useState<number | null>(null);
  const [flipTrigger, setFlipTrigger] = useState(0);

  const scrimAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (amountModalVisible) {
      scrimAnim.setValue(0);
      sheetAnim.setValue(400);
      Animated.parallel([
        Animated.timing(scrimAnim, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(sheetAnim, {
          toValue: 0,
          duration: 280,
          easing: Easing.bezier(0.32, 0.72, 0, 1),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [amountModalVisible]);

  const closeModal = (onDone?: () => void) => {
    Animated.parallel([
      Animated.timing(scrimAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(sheetAnim, {
        toValue: 400,
        duration: 200,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setAmountModalVisible(false);
      onDone?.();
    });
  };

  const { data, error, currentRate, change, changePct } =
    useExchangeRate(from, to, timeRange);

  const baseRate = scrubbedRate ?? currentRate;
  const displayRate = baseRate !== null
    ? baseRate * RATE_MULTIPLIER[selectedAmount]
    : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <NavBar
        isFavorited={isFavorited}
        onFavorite={() => setIsFavorited(f => !f)}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Rate display */}
        <RateHeader
          from={from}
          to={to}
          rate={displayRate}
          change={change}
          changePct={changePct}
          flipTrigger={flipTrigger}
        />

        {/* Chart */}
        <View style={styles.chartContainer}>
          {error ? (
            <View style={styles.loadingBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <RateChart data={data} currentRate={currentRate} onScrub={setScrubbedRate} />
          )}
        </View>

        {/* Amount selector dropdown */}
        <TouchableOpacity
          style={styles.amountRow}
          onPress={() => setAmountModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.amountPill}>
            <View style={styles.amountPillLeft}>
              <Text style={styles.amountSendLabel}>You send</Text>
              <Text style={styles.amountValue}>
                ${selectedAmount.toLocaleString()}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={16} color={NEU_500} />
          </View>
        </TouchableOpacity>

        {/* Time range selector */}
        <TimeRangeSelector selected={timeRange} onSelect={setTimeRange} />

        {/* Footer note */}
        <Text style={styles.footerNote}>
          Data from Frankfurter · Updated daily
        </Text>
      </ScrollView>

      {/* Amount bottom drawer */}
      <Modal
        visible={amountModalVisible}
        transparent
        animationType="none"
        onRequestClose={() => closeModal()}
      >
        <View style={styles.modalOverlay}>
          {/* Fading scrim */}
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.modalScrim, { opacity: scrimAnim }]}
          />
          {/* Tap outside to close */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => closeModal()}
          />
          {/* Sliding sheet */}
          <Animated.View
            style={[styles.modalSheet, { transform: [{ translateY: sheetAnim }] }]}
          >
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select amount</Text>

            {AMOUNTS.map((amount, i) => {
              const isSelected = selectedAmount === amount;
              const badge = AMOUNT_BADGE[amount];
              const rate = currentRate !== null
                ? (currentRate * RATE_MULTIPLIER[amount]).toFixed(5)
                : '—';
              return (
                <TouchableOpacity
                  key={amount}
                  style={[
                    styles.optionRow,
                    i < AMOUNTS.length - 1 && styles.optionRowBorder,
                  ]}
                  onPress={() => closeModal(() => { setSelectedAmount(amount); setFlipTrigger(t => t + 1); })}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionLeft}>
                    <Text style={styles.optionAmount}>
                      ${amount.toLocaleString()}
                    </Text>
                    <Text style={styles.optionRate}>{rate} {to}</Text>
                  </View>
                  <View style={styles.optionRight}>
                    {badge && (
                      <View style={styles.optionBadge}>
                        <Text style={styles.optionBadgeText}>{badge}</Text>
                      </View>
                    )}
                    {isSelected && (
                      <Ionicons name="checkmark" size={20} color={PRIMARY} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        </View>
      </Modal>

      {/* Sticky CTA footer */}
      <View style={styles.ctaRow}>
        <TouchableOpacity
          style={[styles.ctaButton, styles.ctaPrimary]}
          onPress={() => Alert.alert('Send coming soon')}
        >
          <Text style={styles.ctaPrimaryText}>Send</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.ctaButton, styles.ctaSecondary]}
          onPress={() => Alert.alert('Request coming soon')}
        >
          <Text style={styles.ctaSecondaryText}>Request</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: NEU_50,
  },
  scroll: {
    flex: 1,
    backgroundColor: NEU_50,
  },
  content: {
    paddingBottom: 72,
  },
  chartContainer: {
    marginTop: 4,
  },
  loadingBox: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#EA4335',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: NEU_50,
  },
  ctaButton: {
    flex: 1,
    height: 52,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaPrimary: {
    backgroundColor: PRIMARY,
  },
  ctaPrimaryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
  ctaSecondary: {
    backgroundColor: NEU_200,
  },
  ctaSecondaryText: {
    color: NEU_900,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 12,
    color: NEU_500,
    marginTop: 8,
    fontFamily: 'System',
  },
  // Amount selector
  amountRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  amountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: NEU_200,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  amountPillLeft: {
    flex: 1,
  },
  amountSendLabel: {
    fontSize: 11,
    color: NEU_500,
    fontFamily: 'System',
    fontWeight: '400',
    marginBottom: 1,
  },
  amountValue: {
    fontSize: 15,
    color: NEU_900,
    fontFamily: 'System',
    fontWeight: '600',
  },
  // Bottom drawer modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalScrim: {
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalSheet: {
    backgroundColor: NEU_50,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: NEU_200,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: NEU_900,
    fontFamily: 'System',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  optionRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: NEU_200,
  },
  optionLeft: {
    flex: 1,
  },
  optionAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: NEU_900,
    fontFamily: 'System',
    marginBottom: 2,
  },
  optionRate: {
    fontSize: 13,
    color: NEU_500,
    fontFamily: 'System',
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  optionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#34A853',
    fontFamily: 'System',
  },
});
