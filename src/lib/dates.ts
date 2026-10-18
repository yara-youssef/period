const DAY = 86_400_000

export function toDayNumber(date: string): number {
  return Math.round(Date.parse(date + 'T00:00:00Z') / DAY)
}

export function fromDayNumber(n: number): string {
  return new Date(n * DAY).toISOString().slice(0, 10)
}

export function addDays(date: string, days: number): string {
  return fromDayNumber(toDayNumber(date) + days)
}

export function diffDays(a: string, b: string): number {
  return toDayNumber(a) - toDayNumber(b)
}

export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function dateRange(from: string, to: string): string[] {
  const out: string[] = []
  for (let n = toDayNumber(from), end = toDayNumber(to); n <= end; n++) out.push(fromDayNumber(n))
  return out
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function shortDate(date: string): string {
  const [, m, d] = date.split('-')
  return `${Number(d)} ${MONTHS[Number(m) - 1]}`
}

export function longDate(date: string): string {
  const [y] = date.split('-')
  return `${shortDate(date)} ${y}`
}

/**
 * Turns the many date shapes found in exports into YYYY-MM-DD:
 * ISO strings, "2024-03-05 07:12:00", epoch milliseconds, "03/05/2024", "5 Mar 2024".
 */
export function normalizeDate(value: unknown): string | null {
  if (value == null || value === '') return null
  if (typeof value === 'number') {
    if (value > 1e11) return new Date(value).toISOString().slice(0, 10)
    if (value > 1e9) return new Date(value * 1000).toISOString().slice(0, 10)
    return null
  }
  if (typeof value === 'object') {
    const v = value as Record<string, unknown>
    return normalizeDate(v.date ?? v.calendarDate ?? null)
  }
  const s = String(value).trim()
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (iso) return `${iso[1]}-${iso[2]!.padStart(2, '0')}-${iso[3]!.padStart(2, '0')}`
  const slash = s.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})/)
  if (slash) {
    let [a, b] = [Number(slash[1]), Number(slash[2])]
    // Garmin Connect exports US-style month/day; fall back to day/month when that is impossible.
    if (a > 12) [a, b] = [b, a]
    return `${slash[3]}-${String(a).padStart(2, '0')}-${String(b).padStart(2, '0')}`
  }
  const parsed = Date.parse(s)
  if (!Number.isNaN(parsed)) {
    const d = new Date(parsed)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  return null
}
