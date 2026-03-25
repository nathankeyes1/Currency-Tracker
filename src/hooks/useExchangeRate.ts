import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchLatestRate,
  fetchHistoricalRates,
  fetchCurrencies,
  getStartDate,
  type RatePoint,
  type TimeRange,
} from '../api/frankfurter';

interface ExchangeRateState {
  data: RatePoint[];
  loading: boolean;
  error: string | null;
  currentRate: number | null;
  change: number;
  changePct: number;
  currencies: string[];
}

export function useExchangeRate(from: string, to: string, timeRange: TimeRange) {
  const [state, setState] = useState<ExchangeRateState>({
    data: [],
    loading: true,
    error: null,
    currentRate: null,
    change: 0,
    changePct: 0,
    currencies: [],
  });

  // Ref so the currencies cache survives re-renders without being a stale closure dep
  const currenciesRef = useRef<string[]>([]);

  const load = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const today = new Date().toISOString().split('T')[0];
      const startDate = getStartDate(timeRange);

      const [{ rate, previousRate }, currencies] = await Promise.all([
        fetchLatestRate(from, to),
        currenciesRef.current.length > 0
          ? Promise.resolve(currenciesRef.current)
          : fetchCurrencies(),
      ]);
      currenciesRef.current = currencies;

      const change = rate - previousRate;
      const changePct = previousRate !== 0 ? (change / previousRate) * 100 : 0;

      setState(s => ({
        ...s,
        loading: false,
        error: null,
        currentRate: rate,
        change,
        changePct,
        currencies,
      }));

      try {
        const historical = await fetchHistoricalRates(from, to, startDate, today, timeRange);
        setState(s => ({ ...s, data: historical }));
      } catch {
        // silently skip — chart stays empty, rate still shows
      }
    } catch (err) {
      setState(s => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
    }
  }, [from, to, timeRange]);

  useEffect(() => {
    load();
  }, [load]);

  return state;
}
