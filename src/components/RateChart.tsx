import React, { useState, useCallback, useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import Svg, {
  Path,
  Line,
  Circle,
  Text as SvgText,
  Rect,
} from 'react-native-svg';
import * as d3Shape from 'd3-shape';
import * as d3Scale from 'd3-scale';
import * as d3Array from 'd3-array';
import type { RatePoint } from '../api/frankfurter';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CHART_HEIGHT = 220;
const PADDING_LEFT = 16;
const PADDING_RIGHT = 16;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 32;
const CHART_WIDTH = SCREEN_WIDTH - PADDING_LEFT - PADDING_RIGHT;

const PRIMARY = '#2C415A';
const NEU_300 = '#D4D0C9';
const NEU_500 = '#8D8A83';
const NEU_900 = '#242620';

interface Props {
  data: RatePoint[];
  currentRate: number | null;
  onScrub?: (rate: number | null) => void;
}

interface TooltipState {
  x: number;
  y: number;
  date: string;
  rate: number;
  screenX: number;
}

export function RateChart({ data, currentRate, onScrub }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const lastIdxRef = useRef(-1);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (data.length === 0) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.6, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 1000, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [data]);

  const innerW = CHART_WIDTH;
  const innerH = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  const xScale = d3Scale
    .scalePoint<string>()
    .domain(data.map(d => d.date))
    .range([0, innerW])
    .padding(0);

  const [yMin, yMax] = d3Array.extent(data, d => d.rate) as [number, number];
  const yPad = (yMax - yMin) * 0.1 || 0.001;
  const yScale = d3Scale
    .scaleLinear()
    .domain([yMin - yPad, yMax + yPad])
    .range([innerH, 0]);

  // Line generator
  const lineGen = d3Shape
    .line<RatePoint>()
    .x(d => xScale(d.date) ?? 0)
    .y(d => yScale(d.rate))
    .curve(d3Shape.curveMonotoneX);

  const linePath = lineGen(data) ?? '';

  // Y-axis ticks
  const yTicks = yScale.ticks(5);

  // Current rate horizontal line
  const currentRateY =
    currentRate !== null ? yScale(currentRate) + PADDING_TOP : null;

  // Handle touch for tooltip
  const handleTouch = useCallback(
    (evt: any) => {
      if (data.length === 0) return;
      const touchX = evt.nativeEvent.locationX - PADDING_LEFT;
      // Find nearest data point
      const domain = data.map(d => d.date);
      const step = innerW / Math.max(domain.length - 1, 1);
      const idx = Math.round(touchX / step);
      const clampedIdx = Math.max(0, Math.min(idx, data.length - 1));
      if (clampedIdx !== lastIdxRef.current) {
        lastIdxRef.current = clampedIdx;
        Haptics.selectionAsync();
      }
      const point = data[clampedIdx];
      onScrub?.(point.rate);
      const px = xScale(point.date) ?? 0;
      const py = yScale(point.rate);
      setTooltip({
        x: px + PADDING_LEFT,
        y: py + PADDING_TOP,
        date: point.date,
        rate: point.rate,
        screenX: px + PADDING_LEFT,
      });
    },
    [data, innerW, xScale, yScale],
  );

  const handleTouchEnd = useCallback(() => {
    setTooltip(null);
    lastIdxRef.current = -1;
    onScrub?.(null);
  }, [onScrub]);

  if (data.length === 0) {
    return (
      <View style={[styles.container, styles.empty]}>
        <Text style={styles.emptyText}>No data</Text>
      </View>
    );
  }

  const svgWidth = SCREEN_WIDTH;

  // Pulsing dot — last data point coordinates
  const lastPoint = data[data.length - 1];
  const dotX = (xScale(lastPoint.date) ?? 0) + PADDING_LEFT;
  const dotY = yScale(lastPoint.rate) + PADDING_TOP;

  // Format date for x-axis
  const fmtDate = (iso: string) => {
    const [, m, d] = iso.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[parseInt(m) - 1]} ${parseInt(d)}`;
  };

  // Tooltip box: clamp so it doesn't go off-screen
  const tooltipWidth = 110;
  const tooltipHeight = 44;
  const tooltipX = tooltip
    ? Math.min(
        Math.max(tooltip.x - tooltipWidth / 2, 4),
        svgWidth - tooltipWidth - 4,
      )
    : 0;
  const tooltipY = tooltip
    ? Math.max(tooltip.y - tooltipHeight - 12, 4)
    : 0;

  return (
    <View
      style={styles.container}
      onTouchStart={handleTouch}
      onTouchMove={handleTouch}
      onTouchEnd={handleTouchEnd}
    >
      <Svg width={svgWidth} height={CHART_HEIGHT}>
        {/* Y-axis ticks + grid lines */}
        {yTicks.map(tick => {
          const ty = yScale(tick) + PADDING_TOP;
          return (
            <Line
              key={tick}
              x1={PADDING_LEFT}
              y1={ty}
              x2={CHART_WIDTH + PADDING_LEFT}
              y2={ty}
              stroke={NEU_300}
              strokeWidth={0.5}
              strokeDasharray="3,3"
            />
          );
        })}

        {/* Current rate dotted line */}
        {currentRateY !== null && (
          <Line
            x1={PADDING_LEFT}
            y1={currentRateY}
            x2={CHART_WIDTH + PADDING_LEFT}
            y2={currentRateY}
            stroke={PRIMARY}
            strokeWidth={1}
            strokeDasharray="4,4"
            strokeOpacity={0.5}
          />
        )}

        {/* Line */}
        <Path
          d={linePath}
          fill="none"
          stroke={PRIMARY}
          strokeWidth={2}
          transform={`translate(${PADDING_LEFT}, ${PADDING_TOP})`}
        />


        {/* Tooltip crosshair */}
        {tooltip && (
          <>
            <Line
              x1={tooltip.x}
              y1={PADDING_TOP}
              x2={tooltip.x}
              y2={CHART_HEIGHT - PADDING_BOTTOM}
              stroke={PRIMARY}
              strokeWidth={1}
              strokeDasharray="3,3"
            />
            <Circle
              cx={tooltip.x}
              cy={tooltip.y}
              r={5}
              fill={PRIMARY}
              stroke="white"
              strokeWidth={2}
            />
            {/* Tooltip box */}
            <Rect
              x={tooltipX}
              y={tooltipY}
              width={tooltipWidth}
              height={tooltipHeight}
              rx={8}
              fill="white"
              stroke={NEU_300}
              strokeWidth={1}
            />
            <SvgText
              x={tooltipX + tooltipWidth / 2}
              y={tooltipY + 15}
              textAnchor="middle"
              fontSize={11}
              fill={NEU_500}
              fontFamily="System"
            >
              {fmtDate(tooltip.date)}
            </SvgText>
            <SvgText
              x={tooltipX + tooltipWidth / 2}
              y={tooltipY + 32}
              textAnchor="middle"
              fontSize={13}
              fontWeight="600"
              fill={NEU_900}
              fontFamily="System"
            >
              {tooltip.rate.toFixed(5)}
            </SvgText>
          </>
        )}
      </Svg>

      {/* Outer pulse ring */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: PRIMARY,
          opacity: 0.2,
          left: dotX - 9,
          top: dotY - 9,
          transform: [{ scale: pulseAnim }],
        }}
      />
      {/* Inner dot */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: PRIMARY,
          left: dotX - 4,
          top: dotY - 4,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    position: 'relative',
    overflow: 'hidden',
    height: CHART_HEIGHT,
  },
  empty: {
    height: CHART_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: NEU_500,
    fontSize: 14,
  },
});
