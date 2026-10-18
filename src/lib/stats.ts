import { addDays } from './dates'
import type { CycleModel } from './cycle'
import { LUTEAL_LENGTH } from './cycle'
import { METRIC_BY_KEY, PHASES, PHASE_LABEL, fmt, fmtDelta } from './metrics'
import type { DayPhase, DayRecord, MetricKey, Phase } from './types'

export function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
}

export function sd(xs: number[]): number | null {
  const m = mean(xs)
  if (m == null || xs.length < 2) return null
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1))
}

export function quantile(xs: number[], q: number): number | null {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const pos = (s.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return s[lo]! + (s[hi]! - s[lo]!) * (pos - lo)
}

export function pearson(pairs: [number, number][]): number | null {
  if (pairs.length < 3) return null
  const mx = mean(pairs.map((p) => p[0]))!
  const my = mean(pairs.map((p) => p[1]))!
  let sxy = 0
  let sxx = 0
  let syy = 0
  for (const [x, y] of pairs) {
    sxy += (x - mx) * (y - my)
    sxx += (x - mx) ** 2
    syy += (y - my) ** 2
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null
}

export interface JoinedDay extends DayRecord {
  ph: DayPhase
}

export function joinDays(days: Map<string, DayRecord>, model: CycleModel): JoinedDay[] {
  const out: JoinedDay[] = []
  for (const [date, ph] of model.phases) {
    const d = days.get(date)
    if (d) out.push({ ...d, ph })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

const values = (rows: JoinedDay[], key: MetricKey) =>
  rows.map((r) => r[key]).filter((v): v is number => typeof v === 'number' && !Number.isNaN(v))

export interface Agg {
  mean: number | null
  sd: number | null
  n: number
}

const agg = (xs: number[]): Agg => ({ mean: mean(xs), sd: sd(xs), n: xs.length })

export function phaseStats(rows: JoinedDay[], key: MetricKey): Record<Phase | 'all', Agg> {
  const res = { all: agg(values(rows, key)) } as Record<Phase | 'all', Agg>
  for (const p of PHASES) res[p] = agg(values(rows.filter((r) => r.ph.phase === p), key))
  return res
}

export interface ProfilePoint {
  x: number
  mean: number
  lo: number
  hi: number
  n: number
}

/**
 * Average of a metric by cycle day. Aligning to the period start lines up the bleed and follicular phase;
 * aligning to the next period lines up the luteal phase, which is where cycles of different lengths agree.
 */
export function cycleProfile(rows: JoinedDay[], key: MetricKey, align: 'start' | 'end', maxDays: number): ProfilePoint[] {
  const buckets = new Map<number, number[]>()
  for (const r of rows) {
    const v = r[key]
    if (typeof v !== 'number') continue
    if (align === 'end' && r.ph.predicted) continue
    const x = align === 'start' ? r.ph.cycleDay : r.ph.daysToNext
    if (align === 'start' ? x > maxDays : x < -maxDays) continue
    if (!buckets.has(x)) buckets.set(x, [])
    buckets.get(x)!.push(v)
  }
  return [...buckets.entries()]
    .filter(([, xs]) => xs.length >= 2)
    .map(([x, xs]) => ({ x, mean: mean(xs)!, lo: quantile(xs, 0.25)!, hi: quantile(xs, 0.75)!, n: xs.length }))
    .sort((a, b) => a.x - b.x)
}

// ---------------------------------------------------------------- insights

export type Tone = 'good' | 'bad' | 'neutral'

export interface Insight {
  id: string
  kind: 'phase' | 'driver' | 'timing' | 'symptom'
  tone: Tone
  title: string
  detail: string
  /** Used for ranking; larger is more noteworthy. */
  weight: number
  /** A concrete thing to try, for driver insights. */
  action?: string
}

const OUTCOMES: MetricKey[] = ['mood', 'energy']

interface Driver {
  key: MetricKey
  lag: 0 | 1
  /** Set for "did this activity type that day" drivers; the value is then 1 or 0. */
  activity?: string
  /** Present when the driver is something you can choose to do more of. */
  action?: (threshold: string) => string
  /** How to describe a day where this driver was high, e.g. "after ≥ 7h sleep". */
  phrase: (threshold: string, high: boolean) => string
}

const DRIVERS: Driver[] = [
  { key: 'sleepMinutes', lag: 0, action: (t) => `Protect at least ${t} of sleep`, phrase: (t, h) => `after ${h ? '≥' : '<'} ${t} of sleep` },
  { key: 'sleepScore', lag: 0, phrase: (t, h) => `after a sleep score ${h ? '≥' : '<'} ${t}` },
  { key: 'steps', lag: 0, action: (t) => `Get ${t}+ steps`, phrase: (t, h) => `on days with ${h ? '≥' : '<'} ${t} steps` },
  { key: 'steps', lag: 1, action: (t) => `Get ${t}+ steps (it shows the next day)`, phrase: (t, h) => `the day after ${h ? '≥' : '<'} ${t} steps` },
  { key: 'intensityMinutes', lag: 0, action: (t) => `Fit in ${t}+ intensity minutes`, phrase: (t, h) => `on days with ${h ? '≥' : '<'} ${t} intensity minutes` },
  { key: 'intensityMinutes', lag: 1, action: (t) => `Fit in ${t}+ intensity minutes (it shows the next day)`, phrase: (t, h) => `the day after ${h ? '≥' : '<'} ${t} intensity minutes` },
  { key: 'workoutMinutes', lag: 0, action: (t) => `Move for ${t}+ in a workout`, phrase: (t, h) => `on days with ${h ? '≥' : '<'} ${t} of workouts` },
  { key: 'stress', lag: 0, phrase: (t, h) => `on days with average stress ${h ? '≥' : '<'} ${t}` },
  { key: 'bodyBattery', lag: 0, phrase: (t, h) => `when Body Battery peaked ${h ? '≥' : '<'} ${t}` },
  { key: 'hrv', lag: 0, phrase: (t, h) => `after nights with HRV ${h ? '≥' : '<'} ${t}` },
  { key: 'restingHR', lag: 0, phrase: (t, h) => `when resting HR was ${h ? '≥' : '<'} ${t}` },
]

export interface DriverResult {
  outcome: MetricKey
  driver: Driver
  r: number
  n: number
  threshold: number
  highMean: number
  lowMean: number
  highN: number
  lowN: number
}

/** One yes/no driver per activity type done on at least 5 days in scope, e.g. "did yoga". */
function activityDrivers(scope: JoinedDay[]): Driver[] {
  const counts = new Map<string, number>()
  for (const r of scope) for (const t of r.activityTypes ?? []) counts.set(t, (counts.get(t) ?? 0) + 1)
  return [...counts]
    .filter(([, n]) => n >= 5)
    .flatMap(([type]) => {
      const name = type.toLowerCase()
      return ([0, 1] as const).map((lag) => ({
        key: 'workoutMinutes' as MetricKey,
        lag,
        activity: type,
        action: () => (lag ? `Fit in ${name} (it shows the next day)` : `Make room for ${name}`),
        phrase: (_t: string, h: boolean) => (lag ? `the day after ${h ? '' : 'no '}${name}` : `on days ${h ? 'with' : 'without'} ${name}`),
      }))
    })
}

function driverValue(src: DayRecord | undefined, driver: Driver): number | undefined {
  if (!src) return undefined
  if (driver.activity) return src.activityTypes ? (src.activityTypes.includes(driver.activity) ? 1 : 0) : undefined
  // Weekly summaries can't explain how one particular day felt.
  if (src.weekly?.includes(driver.key)) return undefined
  return src[driver.key]
}

export function driverAnalysis(rows: JoinedDay[], byDate: Map<string, DayRecord>, phase: Phase | null): DriverResult[] {
  const scope = phase ? rows.filter((r) => r.ph.phase === phase) : rows
  const results: DriverResult[] = []
  const drivers = [...DRIVERS, ...activityDrivers(scope)]
  for (const outcome of OUTCOMES) {
    for (const driver of drivers) {
      const pairs: [number, number][] = []
      for (const r of scope) {
        const y = r[outcome]
        const x = driverValue(driver.lag ? byDate.get(addDays(r.date, -driver.lag)) : r, driver)
        if (typeof x === 'number' && typeof y === 'number') pairs.push([x, y])
      }
      if (pairs.length < 10) continue
      const r = pearson(pairs)
      if (r == null) continue
      const threshold = driver.activity ? 1 : quantile(pairs.map((p) => p[0]), 0.5)!
      const high = pairs.filter((p) => p[0] >= threshold).map((p) => p[1])
      const low = pairs.filter((p) => p[0] < threshold).map((p) => p[1])
      if (high.length < 4 || low.length < 4) continue
      results.push({ outcome, driver, r, n: pairs.length, threshold, highMean: mean(high)!, lowMean: mean(low)!, highN: high.length, lowN: low.length })
    }
  }
  return results.sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
}

function roundThreshold(key: MetricKey, v: number): number {
  if (key === 'steps') return Math.round(v / 500) * 500
  if (key === 'sleepMinutes') return Math.round(v / 15) * 15
  if (key === 'intensityMinutes' || key === 'workoutMinutes') return Math.max(5, Math.round(v / 5) * 5)
  return Math.round(v)
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`
}

export function buildInsights(rows: JoinedDay[], byDate: Map<string, DayRecord>): Insight[] {
  const out: Insight[] = []
  const luteal = rows.filter((r) => r.ph.phase === 'luteal')
  const follicular = rows.filter((r) => r.ph.phase === 'follicular')

  // 1. How the luteal phase differs from the follicular phase.
  for (const def of Object.values(METRIC_BY_KEY)) {
    const a = values(luteal, def.key)
    const b = values(follicular, def.key)
    if (a.length < 5 || b.length < 5) continue
    const diff = mean(a)! - mean(b)!
    const pooled = Math.sqrt(((sd(a) ?? 0) ** 2 + (sd(b) ?? 0) ** 2) / 2)
    const effect = pooled ? Math.abs(diff) / pooled : 0
    if (Math.abs(diff) < def.meaningful || effect < 0.25) continue
    const worse = def.higherIsBetter == null ? null : def.higherIsBetter ? diff < 0 : diff > 0
    out.push({
      id: `phase-${def.key}`,
      kind: 'phase',
      tone: worse == null ? 'neutral' : worse ? 'bad' : 'good',
      title: `${def.label}: ${fmtDelta(def.key, diff)} in your luteal phase`,
      detail: `Averages ${fmt(def.key, mean(a))} in the luteal phase vs ${fmt(def.key, mean(b))} in the follicular phase (${a.length} and ${b.length} days).`,
      weight: effect + (def.source === 'manual' ? 0.4 : 0),
    })
  }

  // 2. When in the luteal phase it gets hard: early vs late luteal.
  for (const key of OUTCOMES) {
    const early = values(luteal.filter((r) => !r.ph.predicted && r.ph.daysToNext < -7), key)
    const late = values(luteal.filter((r) => !r.ph.predicted && r.ph.daysToNext >= -7), key)
    if (early.length < 5 || late.length < 5) continue
    const diff = mean(late)! - mean(early)!
    if (Math.abs(diff) < METRIC_BY_KEY[key].meaningful) continue
    const label = METRIC_BY_KEY[key].label
    out.push({
      id: `timing-${key}`,
      kind: 'timing',
      tone: diff < 0 ? 'bad' : 'good',
      title: diff < 0 ? `${label} dips most in the last week before your period` : `${label} is lower early in the luteal phase than right before your period`,
      detail: `${fmt(key, mean(late))} in the 7 days before your period vs ${fmt(key, mean(early))} in the week before that. Plan lighter commitments and extra recovery for that window.`,
      weight: Math.abs(diff) * 1.5,
    })
  }

  // 3. What goes with better days during the luteal phase.
  const seen = new Set<string>()
  for (const d of driverAnalysis(rows, byDate, 'luteal')) {
    if (Math.abs(d.r) < 0.2) continue
    const id = `${d.outcome}-${d.driver.activity ?? d.driver.key}`
    if (seen.has(id)) continue // keep only the stronger of same-day / next-day
    seen.add(id)
    const def = METRIC_BY_KEY[d.driver.key]
    const t = roundThreshold(d.driver.key, d.threshold)
    // The phrase already names steps / intensity minutes, so leave the unit off those.
    const tStr = def.format(t) + (d.driver.key === 'steps' || d.driver.key === 'intensityMinutes' ? '' : def.unit)
    const outcome = METRIC_BY_KEY[d.outcome]
    const better = d.highMean > d.lowMean
    const best = better ? d.driver.phrase(tStr, true) : d.driver.phrase(tStr, false)
    const lift = Math.abs(d.highMean - d.lowMean)
    if (lift < outcome.meaningful / 2) continue
    out.push({
      id: `driver-${id}`,
      kind: 'driver',
      tone: 'good',
      title: `Luteal ${outcome.label.toLowerCase()} is ${outcome.format(lift)} points higher ${best}`,
      detail: `${outcome.label} averaged ${fmt(d.outcome, Math.max(d.highMean, d.lowMean))} vs ${fmt(d.outcome, Math.min(d.highMean, d.lowMean))} (r = ${d.r.toFixed(2)}, ${d.n} luteal days). This is a correlation in your own data, not proof of cause.`,
      weight: Math.abs(d.r) * 3 + (d.driver.action ? 0.5 : 0),
      action: d.driver.action
        ? better
          ? `${d.driver.action(tStr)} in your luteal phase.`
          : `Try easing off: luteal ${outcome.label.toLowerCase()} is better ${best}.`
        : undefined,
    })
  }

  // 4. Symptoms that cluster in the luteal phase.
  const logged = rows.filter((r) => r.symptoms !== undefined || r.mood !== undefined)
  const lutealLogged = logged.filter((r) => r.ph.phase === 'luteal')
  const otherLogged = logged.filter((r) => r.ph.phase !== 'luteal' && r.ph.phase !== 'menstrual')
  if (lutealLogged.length >= 7 && otherLogged.length >= 7) {
    const counts = new Map<string, [number, number]>()
    for (const r of lutealLogged) for (const s of r.symptoms ?? []) counts.set(s, [(counts.get(s)?.[0] ?? 0) + 1, counts.get(s)?.[1] ?? 0])
    for (const r of otherLogged) for (const s of r.symptoms ?? []) counts.set(s, [counts.get(s)?.[0] ?? 0, (counts.get(s)?.[1] ?? 0) + 1])
    for (const [s, [l, o]] of counts) {
      const lr = l / lutealLogged.length
      const or = o / otherLogged.length
      if (lr < 0.2 || lr < or * 1.5) continue
      out.push({
        id: `symptom-${s}`,
        kind: 'symptom',
        tone: 'bad',
        title: `${s} shows up on ${pct(lr)} of luteal days`,
        detail: `Compared with ${pct(or)} of follicular and ovulatory days.`,
        weight: lr - or,
      })
    }
  }

  return out.sort((a, b) => b.weight - a.weight)
}

export function lutealWindow(model: CycleModel) {
  return { length: LUTEAL_LENGTH, ovulationDay: model.typicalLength - LUTEAL_LENGTH }
}

export { PHASE_LABEL }
