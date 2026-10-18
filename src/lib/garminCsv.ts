import { guessColumn, parseCSV, parseNumber } from './csv'
import { addDays, diffDays, normalizeDate } from './dates'
import type { DayRecord, MetricKey } from './types'

/**
 * Reads the CSVs that Garmin Connect's Reports and Activities pages export.
 *
 * - Activities.csv has one row per workout, so it gives exact daily workout time and types.
 * - Report CSVs (Steps, Sleep, Intensity Minutes, Calories, Stress, …) have one row per day for
 *   short ranges (7 days / 4 weeks) but one row per week for longer ranges. Weekly rows are
 *   spread across their days (totals divided, averages repeated) and flagged as estimates.
 */

export interface CsvImport {
  name: string
  kind: 'activities' | 'daily' | 'weekly'
  metrics: MetricKey[]
  days: Map<string, Partial<DayRecord>>
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/** Week labels as Garmin writes them: "Oct 12-18", "Sep 28 - Oct 4", "Dec 22-28, 2025", "Dec 29, 2025 - Jan 4, 2026". */
export function parseRangeLabel(label: string, today: string): { start: string; days: number } | null {
  const m = label
    .trim()
    .match(/^([A-Za-z]{3})[a-z]*\.? (\d{1,2})(?:,\s*(\d{4}))?\s*[-–]\s*(?:([A-Za-z]{3})[a-z]*\.? )?(\d{1,2})(?:,\s*(\d{4}))?$/)
  if (!m) return null
  const m1 = MONTHS.indexOf(m[1]!.toLowerCase())
  const m2 = m[4] ? MONTHS.indexOf(m[4].toLowerCase()) : m1
  if (m1 < 0 || m2 < 0) return null
  let y1: number
  if (m[3]) y1 = Number(m[3])
  else if (m[6]) y1 = m2 < m1 ? Number(m[6]) - 1 : Number(m[6])
  else {
    // No year means the current year, unless that would put the week in the future.
    y1 = Number(today.slice(0, 4))
    if (`${y1}-${String(m1 + 1).padStart(2, '0')}-${m[2]!.padStart(2, '0')}` > today) y1--
  }
  const y2 = m2 < m1 ? y1 + 1 : y1
  const start = `${y1}-${String(m1 + 1).padStart(2, '0')}-${m[2]!.padStart(2, '0')}`
  const end = `${y2}-${String(m2 + 1).padStart(2, '0')}-${m[5]!.padStart(2, '0')}`
  return { start, days: diffDays(end, start) + 1 }
}

function parseDuration(raw: string | undefined): number | null {
  if (!raw) return null
  const parts = raw.trim().split(':').map(Number)
  if (parts.some((p) => Number.isNaN(p))) return null
  if (parts.length === 3) return parts[0]! * 60 + parts[1]! + parts[2]! / 60
  if (parts.length === 2) return parts[0]! + parts[1]! / 60
  return null
}

function readActivities(name: string, rows: string[][]): CsvImport {
  const header = rows[0]!.map((h) => h.trim())
  const typeCol = header.indexOf('Activity Type')
  const dateCol = header.indexOf('Date')
  const timeCol = [header.indexOf('Time'), header.indexOf('Elapsed Time'), header.indexOf('Moving Time')].find((i) => i >= 0) ?? -1
  const days = new Map<string, Partial<DayRecord>>()
  for (const r of rows.slice(1)) {
    const date = normalizeDate(r[dateCol])
    if (!date) continue
    const day = days.get(date) ?? { workoutMinutes: 0, activityTypes: [] }
    day.workoutMinutes! += parseDuration(r[timeCol]) ?? 0
    const type = r[typeCol]?.trim()
    if (type && !day.activityTypes!.includes(type)) day.activityTypes!.push(type)
    days.set(date, day)
  }
  for (const d of days.values()) d.workoutMinutes = Math.round(d.workoutMinutes!)
  // Days inside the export's range with no activity are rest days, not missing data.
  const dates = [...days.keys()].sort()
  if (dates.length) {
    for (let d = dates[0]!; d <= dates[dates.length - 1]!; d = addDays(d, 1)) {
      if (!days.has(d)) days.set(d, { workoutMinutes: 0, activityTypes: [] })
    }
  }
  return { name, kind: 'activities', metrics: ['workoutMinutes'], days }
}

/** Which metric a file is about, from its name (e.g. "Intensity_Minutes-2026-10-18.csv"). */
function fileMetric(name: string): MetricKey | null {
  const n = name.toLowerCase()
  if (/step/.test(n)) return 'steps'
  if (/intensity/.test(n)) return 'intensityMinutes'
  if (/calor/.test(n)) return 'activeCalories'
  if (/sleep/.test(n)) return 'sleepMinutes'
  if (/hrv/.test(n)) return 'hrv'
  if (/resting|heart/.test(n)) return 'restingHR'
  if (/body.?battery/.test(n)) return 'bodyBattery'
  if (/stress/.test(n)) return 'stress'
  return null
}

const SKIP = /goal|need|bedtime|wake|quality|total|resting cal|^value$|^max|^min|^high|^low/i
const TOTALS = new Set<MetricKey>(['steps', 'intensityMinutes', 'activeCalories', 'workoutMinutes'])

function columnMetric(header: string, file: MetricKey | null): MetricKey | null {
  const h = header.trim()
  if (!h || SKIP.test(h)) return null
  if (file === 'sleepMinutes') {
    if (/score/i.test(h)) return 'sleepScore'
    if (/deep/i.test(h)) return 'deepSleepMinutes'
    if (/rem/i.test(h)) return 'remSleepMinutes'
    if (/duration|sleep/i.test(h)) return 'sleepMinutes'
    return null
  }
  const guess = guessColumn(h)
  if (guess && guess !== 'date' && guess !== 'flow' && guess !== 'mood' && guess !== 'energy') return guess as MetricKey
  if (file && /^(actual|avg|average|daily avg|value)$/i.test(h)) return file
  return null
}

function readReport(name: string, rows: string[][], today: string): CsvImport | null {
  // Some reports start with a title line ("Intensity Minutes") before the header.
  const headerIdx = rows.findIndex((r, i) => r.length >= 2 && rows[i + 1] != null && (normalizeDate(rows[i + 1]![0]) || parseRangeLabel(rows[i + 1]![0] ?? '', today)))
  if (headerIdx < 0) return null
  const header = rows[headerIdx]!
  const file = fileMetric(name)
  const cols = header.map((h, i) => ({ i, key: i === 0 ? null : columnMetric(h, file), avg: /^avg|average/i.test(h.trim()) })).filter((c) => c.key)
  if (!cols.length) return null

  const entries: { start: string; span: number | null; row: string[] }[] = []
  for (const raw of rows.slice(headerIdx + 1)) {
    // Garmin doesn't quote week labels like "Dec 29, 2025 - Jan 4, 2026", so their commas split the label.
    const r = [...raw]
    while (r.length > header.length && r.length > 1) r.splice(0, 2, `${r[0]},${r[1]}`)
    const range = parseRangeLabel(r[0] ?? '', today)
    const date = range?.start ?? normalizeDate(r[0])
    if (date) entries.push({ start: date, span: range?.days ?? null, row: r })
  }
  if (!entries.length) return null

  // Plain dates: the gap between rows tells daily from weekly.
  const sorted = [...entries].sort((a, b) => a.start.localeCompare(b.start))
  const gaps = sorted.slice(1).map((e, i) => diffDays(e.start, sorted[i]!.start)).sort((a, b) => a - b)
  const typicalGap = gaps[Math.floor(gaps.length / 2)] ?? 1
  const weekly = entries.some((e) => (e.span ?? typicalGap) > 1)

  const days = new Map<string, Partial<DayRecord>>()
  for (const e of entries) {
    const span = e.span ?? typicalGap
    const covered = Math.max(1, Math.min(span, diffDays(today, e.start) + 1))
    for (const c of cols) {
      const v = parseNumber(e.row[c.i])
      if (v == null) continue
      const perDay = TOTALS.has(c.key!) && !c.avg ? v / covered : v
      for (let k = 0; k < covered; k++) {
        const date = addDays(e.start, k)
        const day = days.get(date) ?? {}
        ;(day as Record<string, number>)[c.key!] = Math.round(perDay * 10) / 10
        days.set(date, day)
      }
    }
  }
  return { name, kind: weekly ? 'weekly' : 'daily', metrics: [...new Set(cols.map((c) => c.key!))], days }
}

/** Returns null when the file isn't a recognised Garmin Connect export, so the caller can offer manual mapping. */
export function readGarminCsv(name: string, text: string, today: string): CsvImport | null {
  const rows = parseCSV(text)
  if (rows.length < 2) return null
  const header = rows[0]!.map((h) => h.trim())
  if (header.includes('Activity Type') && header.includes('Date')) return readActivities(name, rows)
  if (!fileMetric(name)) return null
  return readReport(name, rows, today)
}
