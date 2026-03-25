import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import * as Haptics from 'expo-haptics';
import { View, Text, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import Svg, {
  Path,
  Line,
  Circle,
  Defs,
  LinearGradient,
  Stop,
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
const INNER_W = CHART_WIDTH;
const INNER_H = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

const N_POINTS = 60;
const TRANSITION_DURATION = 380;
const PILL_WIDTH = 88;

const PRIMARY = '#2C415A';
const NEU_300 = '#D4D0C9';
const NEU_500 = '#8D8A83';

// ─── Transition helpers ──────────────────────────────────────────────────────

type Pixel = { x: number; y: number };

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Resample a dataset to N evenly-spaced pixel coordinates using each dataset's own y scale. */
function normalizeDataToPixels(data: RatePoint[]): Pixel[] {
  if (data.length < 2) return [];

  const [yMin, yMax] = d3Array.extent(data, d => d.rate) as [number, number];
  const yPad = (yMax - yMin) * 0.15 || 0.001;
  const yScale = d3Scale
    .scaleLinear()
    .domain([yMin - yPad, yMax + yPad])
    .range([INNER_H, 0]);

  return Array.from({ length: N_POINTS }, (_, i) => {
    const t = i / (N_POINTS - 1);
    const raw = t * (data.length - 1);
    const lo = Math.floor(raw);
    const hi = Math.min(lo + 1, data.length - 1);
    const frac = raw - lo;
    const y = yScale(data[lo].rate) + (yScale(data[hi].rate) - yScale(data[lo].rate)) * frac;
    return { x: t * INNER_W, y };
  });
}

function pixelsToLinePath(pixels: Pixel[]): string {
  return d3Shape
    .line<Pixel>()
    .x(d => d.x)
    .y(d => d.y)
    .curve(d3Shape.curveMonotoneX)(pixels) ?? '';
}

function pixelsToAreaPath(pixels: Pixel[]): string {
  return d3Shape
    .area<Pixel>()
    .x(d => d.x)
    .y0(INNER_H)
    .y1(d => d.y)
    .curve(d3Shape.curveMonotoneX)(pixels) ?? '';
}

// ─── Component ───────────────────────────────────────────────────────────────

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
  idx: number;
}

interface TransitionState {
  linePath: string;
  areaPath: string;
}

export function RateChart({ data, currentRate, onScrub }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [transition, setTransition] = useState<TransitionState | null>(null);
  // Holds the last fully-settled pixel paths — never jumps to new data mid-flight
  const [settledPaths, setSettledPaths] = useState({ line: '', area: '' });

  const lastIdxRef = useRef(-1);
  const hasAnimatedIn = useRef(false);
  // Stores the pixel array of the last fully-settled render (used as "from" on next transition)
  const settledPixelsRef = useRef<Pixel[]>([]);
  // Stores the pixel array currently being displayed (updated each RAF frame for interruptions)
  const currentPixelsRef = useRef<Pixel[]>([]);
  const rafRef = useRef<number>(0);

  const pulseScaleAnim   = useRef(new Animated.Value(1)).current;
  const pulseOpacityAnim = useRef(new Animated.Value(0.25)).current;
  const chartFadeAnim    = useRef(new Animated.Value(0)).current;

  // Fade-in + pulse on initial data load
  useEffect(() => {
    if (data.length === 0) return;

    pulseScaleAnim.setValue(1);
    pulseOpacityAnim.setValue(0.25);
    const ping = Animated.loop(
      Animated.parallel([
        Animated.timing(pulseScaleAnim, {
          toValue: 2.4,
          duration: 1100,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacityAnim, {
          toValue: 0,
          duration: 1100,
          useNativeDriver: true,
        }),
      ]),
    );
    ping.start();

    if (!hasAnimatedIn.current) {
      hasAnimatedIn.current = true;
      chartFadeAnim.setValue(0);
      Animated.timing(chartFadeAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }

    return () => ping.stop();
  }, [data]);

  // Morph transition when data changes
  useEffect(() => {
    if (data.length === 0) return;

    const toPixels = normalizeDataToPixels(data);

    // First load — no animation, just settle
    if (settledPixelsRef.current.length === 0) {
      settledPixelsRef.current = toPixels;
      currentPixelsRef.current = toPixels;
      setSettledPaths({
        line: pixelsToLinePath(toPixels),
        area: pixelsToAreaPath(toPixels),
      });
      return;
    }

    // Use the last rendered pixel array as the "from" (handles interruptions mid-animation)
    const fromPixels = currentPixelsRef.current.length === N_POINTS
      ? currentPixelsRef.current
      : settledPixelsRef.current;

    const startTime = Date.now();
    cancelAnimationFrame(rafRef.current);

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const rawT = Math.min(elapsed / TRANSITION_DURATION, 1);
      const t = easeInOut(rawT);

      const interpolated: Pixel[] = toPixels.map((to, i) => {
        const from = fromPixels[i] ?? to;
        return {
          x: from.x + (to.x - from.x) * t,
          y: from.y + (to.y - from.y) * t,
        };
      });

      currentPixelsRef.current = interpolated;
      setTransition({
        linePath: pixelsToLinePath(interpolated),
        areaPath: pixelsToAreaPath(interpolated),
      });

      if (rawT < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        settledPixelsRef.current = toPixels;
        currentPixelsRef.current = toPixels;
        setSettledPaths({
          line: pixelsToLinePath(toPixels),
          area: pixelsToAreaPath(toPixels),
        });
        setTransition(null);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [data]);

  const { xScale, yScale, linePath, areaPath } = useMemo(() => {
    const xScale = d3Scale
      .scalePoint<string>()
      .domain(data.map(d => d.date))
      .range([0, INNER_W])
      .padding(0);

    const [yMin, yMax] = d3Array.extent(data, d => d.rate) as [number, number];
    const yPad = (yMax - yMin) * 0.15 || 0.001;
    const yScale = d3Scale
      .scaleLinear()
      .domain([yMin - yPad, yMax + yPad])
      .range([INNER_H, 0]);

    const curve = d3Shape.curveMonotoneX;
    const lineGen = d3Shape.line<RatePoint>()
      .x(d => xScale(d.date) ?? 0)
      .y(d => yScale(d.rate))
      .curve(curve);

    const linePath = lineGen(data) ?? '';
    const areaPath = d3Shape.area<RatePoint>()
      .x(d => xScale(d.date) ?? 0)
      .y0(INNER_H)
      .y1(d => yScale(d.rate))
      .curve(curve)(data) ?? '';

    return { xScale, yScale, linePath, areaPath };
  }, [data]);

  // Split paths for scrub interaction
  const { leftPath, rightPath } = useMemo(() => {
    if (!tooltip || data.length === 0) return { leftPath: '', rightPath: '' };

    const curve = d3Shape.curveMonotoneX;
    const lineGen = d3Shape.line<RatePoint>()
      .x(d => xScale(d.date) ?? 0)
      .y(d => yScale(d.rate))
      .curve(curve);

    const leftData = data.slice(0, tooltip.idx + 1);
    const rightData = data.slice(tooltip.idx);

    return {
      leftPath: leftData.length > 1 ? (lineGen(leftData) ?? '') : '',
      rightPath: rightData.length > 1 ? (lineGen(rightData) ?? '') : '',
    };
  }, [tooltip?.idx, data, xScale, yScale]);

  const handleTouch = useCallback(
    (evt: any) => {
      // Disable scrubbing during transition
      if (transition !== null || data.length === 0) return;
      const touchX = evt.nativeEvent.locationX - PADDING_LEFT;
      const step = INNER_W / Math.max(data.length - 1, 1);
      const idx = Math.round(touchX / step);
      const clampedIdx = Math.max(0, Math.min(idx, data.length - 1));
      if (clampedIdx !== lastIdxRef.current) {
        lastIdxRef.current = clampedIdx;
        Haptics.selectionAsync().catch(() => {});
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
        idx: clampedIdx,
      });
    },
    [data, transition, xScale, yScale],
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
  const isTransitioning = transition !== null;
  const isScrubbing = tooltip !== null;

  const lastPoint = data[data.length - 1];
  const dotX = (xScale(lastPoint.date) ?? 0) + PADDING_LEFT;
  const dotY = yScale(lastPoint.rate) + PADDING_TOP;

  const fmtDate = (iso: string) => {
    const [, m, d] = iso.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[parseInt(m) - 1]} ${parseInt(d)}`;
  };

  const pillLeft = tooltip
    ? Math.min(
        Math.max(tooltip.x - PILL_WIDTH / 2, PADDING_LEFT),
        svgWidth - PILL_WIDTH - PADDING_LEFT,
      )
    : 0;

  // Use transition paths while morphing, settled paths otherwise (never raw useMemo paths)
  const activeLine = transition?.linePath ?? settledPaths.line;
  const activeArea = transition?.areaPath ?? settledPaths.area;

  return (
    <View
      style={styles.container}
      onTouchStart={handleTouch}
      onTouchMove={handleTouch}
      onTouchEnd={handleTouchEnd}
    >
      <Animated.View style={{ opacity: chartFadeAnim, flex: 1 }}>
        <Svg width={svgWidth} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={PRIMARY} stopOpacity={0.18} />
              <Stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {/* Default state: full line + area fill */}
          {!isScrubbing && (
            <>
              <Path
                d={activeArea}
                fill="url(#areaGradient)"
                stroke="none"
                transform={`translate(${PADDING_LEFT}, ${PADDING_TOP})`}
              />
              <Path
                d={activeLine}
                fill="none"
                stroke={PRIMARY}
                strokeWidth={1.5}
                transform={`translate(${PADDING_LEFT}, ${PADDING_TOP})`}
              />
            </>
          )}

          {/* Scrub state: split line */}
          {isScrubbing && (
            <>
              {rightPath ? (
                <Path
                  d={rightPath}
                  fill="none"
                  stroke={NEU_300}
                  strokeWidth={1.5}
                  transform={`translate(${PADDING_LEFT}, ${PADDING_TOP})`}
                />
              ) : null}
              {leftPath ? (
                <Path
                  d={leftPath}
                  fill="none"
                  stroke={PRIMARY}
                  strokeWidth={2}
                  transform={`translate(${PADDING_LEFT}, ${PADDING_TOP})`}
                />
              ) : null}
              <Line
                x1={tooltip.x}
                y1={PADDING_TOP}
                x2={tooltip.x}
                y2={CHART_HEIGHT - PADDING_BOTTOM}
                stroke={PRIMARY}
                strokeWidth={1}
                strokeDasharray="3,3"
                strokeOpacity={0.4}
              />
              <Circle
                cx={tooltip.x}
                cy={tooltip.y}
                r={5}
                fill={PRIMARY}
                stroke="white"
                strokeWidth={2}
              />
            </>
          )}
        </Svg>

        {/* Date pill — shown while scrubbing */}
        {isScrubbing && (
          <View
            pointerEvents="none"
            style={[styles.datePill, { left: pillLeft }]}
          >
            <Text style={styles.datePillText}>{fmtDate(tooltip.date)}</Text>
          </View>
        )}

        {/* Pulsing live dot — hidden during transition and scrub */}
        {!isTransitioning && !isScrubbing && (
          <>
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: PRIMARY,
                opacity: pulseOpacityAnim,
                left: dotX - 9,
                top: dotY - 9,
                transform: [{ scale: pulseScaleAnim }],
              }}
            />
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
          </>
        )}
      </Animated.View>
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
  datePill: {
    position: 'absolute',
    top: 8,
    width: PILL_WIDTH,
    alignItems: 'center',
    backgroundColor: 'rgba(236, 233, 228, 0.95)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  datePillText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#242620',
    fontFamily: 'System',
  },
});
