const BASE_URL = 'https://api.frankfurter.app';

export type RatePoint = { date: string; rate: number };

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function subtractDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return formatDate(d);
}

export type TimeRange = '1w' | '1m' | '3m' | '6m' | '1y' | 'All';

export function getStartDate(range: TimeRange): string {
  switch (range) {
    case '1w': return subtractDays(7);
    case '1m': return subtractDays(30);
    case '3m': return subtractDays(90);
    case '6m': return subtractDays(180);
    case '1y': return subtractDays(365);
    case 'All': return subtractDays(365 * 5);
  }
}

export async function fetchLatestRate(
  from: string,
  to: string,
): Promise<{ rate: number; previousRate: number }> {
  const [latestRes, prevRes] = await Promise.all([
    fetch(`${BASE_URL}/latest?from=${from}&to=${to}`),
    fetch(`${BASE_URL}/${subtractDays(2)}?from=${from}&to=${to}`),
  ]);

  if (!latestRes.ok || !prevRes.ok) {
    throw new Error('Failed to fetch rates');
  }

  const latest = await latestRes.json();
  const prev = await prevRes.json();

  return {
    rate: latest.rates[to],
    previousRate: prev.rates[to],
  };
}

export async function fetchHistoricalRates(
  from: string,
  to: string,
  startDate: string,
  endDate: string,
): Promise<RatePoint[]> {
  const res = await fetch(
    `${BASE_URL}/${startDate}..${endDate}?from=${from}&to=${to}`,
  );

  if (!res.ok) {
    throw new Error('Failed to fetch historical rates');
  }

  const data = await res.json();
  const rates: Record<string, Record<string, number>> = data.rates;

  return Object.entries(rates)
    .map(([date, r]) => ({ date, rate: r[to] }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchCurrencies(): Promise<string[]> {
  const res = await fetch(`${BASE_URL}/currencies`);
  if (!res.ok) throw new Error('Failed to fetch currencies');
  const data = await res.json();
  return Object.keys(data).sort();
}
