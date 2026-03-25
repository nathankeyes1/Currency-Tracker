const ER_BASE   = 'https://open.er-api.com/v6';
const FAWAZ_BASE = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api';

export type RatePoint = { date: string; rate: number };
export type TimeRange = '1w' | '1m' | '3m' | '6m' | '1y' | 'All';

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function subtractDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return formatDate(d);
}

export function getStartDate(range: TimeRange): string {
  switch (range) {
    case '1w':  return subtractDays(7);
    case '1m':  return subtractDays(30);
    case '3m':  return subtractDays(90);
    case '6m':  return subtractDays(180);
    case '1y':  return subtractDays(365);
    case 'All': return subtractDays(365 * 5);
  }
}

function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response> {
  return Promise.race([
    fetch(url),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), timeoutMs)
    ),
  ]);
}

function sampleDates(startDate: string, endDate: string, maxPoints: number): string[] {
  const start = new Date(startDate).getTime();
  const end   = new Date(endDate).getTime();
  const count = Math.min(maxPoints, Math.round((end - start) / 86400000) + 1);
  const dates = new Set<string>();
  for (let i = 0; i < count; i++) {
    const t = start + (end - start) * (i / Math.max(count - 1, 1));
    dates.add(formatDate(new Date(t)));
  }
  return [...dates];
}

function pointsForRange(range: TimeRange): number {
  switch (range) {
    case '1w':  return 7;
    case '1m':  return 28;
    case '3m':  return 40;
    case '6m':  return 52;
    case '1y':  return 52;
    case 'All': return 60;
  }
}

async function fawazRate(date: string, from: string, to: string): Promise<number | null> {
  const url = `${FAWAZ_BASE}@${date}/v1/currencies/${from.toLowerCase()}.min.json`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data[from.toLowerCase()]?.[to.toLowerCase()] ?? null;
}

export async function fetchLatestRate(
  from: string,
  to: string,
): Promise<{ rate: number; previousRate: number }> {
  const [res, prevRate] = await Promise.all([
    fetchWithTimeout(`${ER_BASE}/latest/${from}`),
    fawazRate(subtractDays(2), from, to),
  ]);
  if (!res.ok) throw new Error('Failed to fetch rates');
  const data = await res.json();
  const rate: number = data.rates[to];
  return { rate, previousRate: prevRate ?? rate };
}

export async function fetchHistoricalRates(
  from: string,
  to: string,
  startDate: string,
  endDate: string,
  range: TimeRange = '6m',
): Promise<RatePoint[]> {
  const dates = sampleDates(startDate, endDate, pointsForRange(range));

  const results = await Promise.allSettled(
    dates.map(async date => {
      const rate = await fawazRate(date, from, to);
      return rate !== null ? ({ date, rate } as RatePoint) : null;
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<RatePoint> =>
      r.status === 'fulfilled' && r.value !== null
    )
    .map(r => r.value)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchCurrencies(): Promise<string[]> {
  const res = await fetchWithTimeout(`${FAWAZ_BASE}@latest/v1/currencies.min.json`);
  if (!res.ok) throw new Error('Failed to fetch currencies');
  const data = await res.json();
  return Object.keys(data).map(c => c.toUpperCase()).sort();
}
