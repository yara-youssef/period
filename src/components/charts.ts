import { METRIC_BY_KEY } from '@/lib/metrics'
import type { MetricKey, Phase } from '@/lib/types'
import { compact, niceTicks } from '@/composables/useWidth'

export interface Slot {
  label: string
  /** Shown on the x axis when set. */
  tick?: string
  phase: Phase | null
  value: number | null
  lo?: number | null
  hi?: number | null
  detail?: string
}

const DURATIONS = new Set<MetricKey>(['sleepMinutes', 'deepSleepMinutes', 'remSleepMinutes'])

export function axisTicks(key: MetricKey, lo: number, hi: number): { value: number; label: string }[] {
  if (DURATIONS.has(key) && hi - lo >= 90) {
    return niceTicks(lo / 60, hi / 60, 4).map((h) => ({ value: h * 60, label: `${+h.toFixed(1)}h` }))
  }
  if (DURATIONS.has(key)) return niceTicks(lo, hi, 4).map((m) => ({ value: m, label: `${Math.round(m)}m` }))
  return niceTicks(lo, hi, 4).map((v) => ({ value: v, label: compact(v) }))
}

export function domainFor(key: MetricKey, vals: number[]): [number, number] {
  if (key === 'mood' || key === 'energy') return [1, 5]
  if (!vals.length) return [0, 1]
  let lo = Math.min(...vals)
  let hi = Math.max(...vals)
  const pad = (hi - lo) * 0.1 || Math.abs(hi) * 0.1 || 1
  lo -= pad
  hi += pad
  // Counts read best from zero; physiological levels read best zoomed in.
  if (['steps', 'intensityMinutes', 'workoutMinutes', 'activeCalories'].includes(key)) lo = 0
  const ticks = axisTicks(key, lo, hi)
  return [Math.min(lo, ticks[0]?.value ?? lo), Math.max(hi, ticks[ticks.length - 1]?.value ?? hi)]
}

export function phaseRuns(slots: { phase: Phase | null }[]): { phase: Phase; from: number; to: number }[] {
  const runs: { phase: Phase; from: number; to: number }[] = []
  slots.forEach((s, i) => {
    const last = runs[runs.length - 1]
    if (!s.phase) return
    if (last && last.phase === s.phase && last.to === i - 1) last.to = i
    else runs.push({ phase: s.phase, from: i, to: i })
  })
  return runs
}

export function metricLabel(key: MetricKey) {
  return METRIC_BY_KEY[key].label
}
