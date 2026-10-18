import { computed, reactive, watch } from 'vue'
import { buildCycleModel, derivePeriodStarts } from './lib/cycle'
import { diffDays, todayISO } from './lib/dates'
import { METRICS } from './lib/metrics'
import { buildInsights, joinDays } from './lib/stats'
import type { DayRecord, MetricKey, PeriodStart } from './lib/types'

const STORAGE_KEY = 'cycle-insights:v1'

interface Persisted {
  days: Record<string, DayRecord>
  periods: PeriodStart[]
  demo: boolean
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Persisted>
      return { days: parsed.days ?? {}, periods: parsed.periods ?? [], demo: parsed.demo ?? false }
    }
  } catch {
    // Storage blocked or corrupt: start empty rather than fail.
  }
  return { days: {}, periods: [], demo: false }
}

export const state = reactive<Persisted>(load())

watch(
  state,
  () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Ignore quota or privacy-mode errors; the session still works in memory.
    }
  },
  { deep: true },
)

export const dayMap = computed(() => new Map(Object.entries(state.days)))

export const periodStarts = computed(() => derivePeriodStarts(state.periods, Object.values(state.days)))

export const model = computed(() => buildCycleModel(periodStarts.value, todayISO()))

export const joined = computed(() => joinDays(dayMap.value, model.value))

export const insights = computed(() => buildInsights(joined.value, dayMap.value))

/** Merges fields into a day without wiping what other sources already provided. */
export function upsertDay(date: string, fields: Partial<DayRecord>) {
  const existing = state.days[date] ?? { date }
  const next: DayRecord = { ...existing, ...fields, date }
  for (const k of Object.keys(next) as (keyof DayRecord)[]) if (next[k] === undefined) delete next[k]
  state.days[date] = next
}

/**
 * Merges imported days. Daily values replace earlier weekly estimates; weekly estimates only
 * fill fields that have no daily value yet, and are remembered so later daily data replaces them.
 */
export function mergeDays(days: Iterable<[string, Partial<DayRecord>]>, opts: { weekly?: boolean } = {}): number {
  let n = 0
  for (const [date, fields] of days) {
    const existing = state.days[date]
    const weekly = new Set(existing?.weekly ?? [])
    const next: Partial<DayRecord> = {}
    for (const [k, v] of Object.entries(fields) as [keyof DayRecord, unknown][]) {
      const key = k as MetricKey
      if (opts.weekly) {
        if (existing?.[k] !== undefined && !weekly.has(key)) continue
        weekly.add(key)
      } else weekly.delete(key)
      ;(next as Record<string, unknown>)[k] = v
    }
    next.weekly = weekly.size ? [...weekly] : undefined
    upsertDay(date, next)
    n++
  }
  return n
}

export function addPeriod(date: string, length?: number) {
  state.periods = [...state.periods.filter((p) => p.date !== date), { date, length }].sort((a, b) => a.date.localeCompare(b.date))
}

export function removePeriod(date: string) {
  state.periods = state.periods.filter((p) => p.date !== date)
  // Also clear logged flow from that bleed so the derived start goes away too.
  for (const d of Object.values(state.days)) {
    const offset = diffDays(d.date, date)
    if (d.flow && offset >= 0 && offset < 10) delete d.flow
  }
}

export function replaceAll(data: Persisted) {
  state.days = data.days
  state.periods = data.periods
  state.demo = data.demo
}

export function clearAll() {
  replaceAll({ days: {}, periods: [], demo: false })
}

export function exportBackup(): string {
  return JSON.stringify({ version: 1, ...state }, null, 2)
}

/** Metrics with enough data to chart, in registry order. */
export const availableMetrics = computed(() => {
  const counts = new Map<string, number>()
  for (const d of Object.values(state.days))
    for (const [k, v] of Object.entries(d)) if (typeof v === 'number') counts.set(k, (counts.get(k) ?? 0) + 1)
  return METRICS.filter((m) => (counts.get(m.key) ?? 0) >= 5)
})

/** Metrics where most values are spread-out weekly summaries rather than real daily values. */
export const weeklyMetrics = computed(() => {
  const total = new Map<string, number>()
  const weekly = new Map<string, number>()
  for (const d of Object.values(state.days)) {
    for (const m of METRICS) if (typeof d[m.key] === 'number') total.set(m.key, (total.get(m.key) ?? 0) + 1)
    for (const k of d.weekly ?? []) weekly.set(k, (weekly.get(k) ?? 0) + 1)
  }
  return METRICS.filter((m) => (weekly.get(m.key) ?? 0) > (total.get(m.key) ?? 0) / 2)
})
