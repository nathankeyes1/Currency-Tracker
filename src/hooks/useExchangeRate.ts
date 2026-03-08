import { useState, useEffect, useCallback } from 'react';
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

  const load = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const today = new Date().toISOString().split('T')[0];
      const startDate = getStartDate(timeRange);

      const [{ rate, previousRate }, historical, currencies] = await Promise.all([
        fetchLatestRate(from, to),
        fetchHistoricalRates(from, to, startDate, today),
        state.currencies.length > 0 ? Promise.resolve(state.currencies) : fetchCurrencies(),
      ]);

      const change = rate - previousRate;
      const changePct = previousRate !== 0 ? (change / previousRate) * 100 : 0;

      setState({
        data: historical,
        loading: false,
        error: null,
        currentRate: rate,
        change,
        changePct,
        currencies,
      });
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
