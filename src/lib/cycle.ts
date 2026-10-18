import { addDays, diffDays, fromDayNumber, toDayNumber } from './dates'
import type { DayPhase, DayRecord, PeriodStart, Phase } from './types'

export const DEFAULT_CYCLE = 28
export const DEFAULT_PERIOD = 5
/** The luteal phase is the most stable part of the cycle, so ovulation is counted back from the next period. */
export const LUTEAL_LENGTH = 14

const MIN_CYCLE = 18
const MAX_CYCLE = 45

const BLEEDING = new Set(['light', 'medium', 'heavy'])

/**
 * Merges period starts entered by hand with ones implied by logged flow.
 * A flow day starts a new period when there was no bleeding in the previous 10 days.
 */
export function derivePeriodStarts(manual: PeriodStart[], days: DayRecord[]): PeriodStart[] {
  const flowDays = days
    .filter((d) => d.flow && BLEEDING.has(d.flow))
    .map((d) => d.date)
    .sort()

  const fromFlow: PeriodStart[] = []
  let current: PeriodStart | null = null
  let last = ''
  for (const date of flowDays) {
    if (!current || diffDays(date, last) > 10) {
      current = { date, length: 1 }
      fromFlow.push(current)
    } else if (diffDays(date, last) <= 3) {
      current.length = diffDays(date, current.date) + 1
    }
    last = date
  }

  const all = [...manual, ...fromFlow].sort((a, b) => a.date.localeCompare(b.date))
  const merged: PeriodStart[] = []
  for (const p of all) {
    const prev = merged[merged.length - 1]
    if (prev && diffDays(p.date, prev.date) <= 10) {
      prev.length = Math.max(prev.length ?? 0, p.length ?? 0, diffDays(p.date, prev.date) + (p.length ?? 1)) || undefined
    } else {
      merged.push({ ...p })
    }
  }
  return merged
}

function median(xs: number[]): number | null {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2
}

export interface CycleSummary {
  start: string
  length: number | null // null while the cycle is still open
  periodLength: number
  /** Excluded from phase analysis because the length looks like a missed log. */
  irregular: boolean
}

export interface CycleModel {
  cycles: CycleSummary[]
  typicalLength: number
  typicalPeriod: number
  lengthRange: [number, number] | null
  phases: Map<string, DayPhase>
}

export function phaseForDay(cycleDay: number, cycleLength: number, periodLength: number): Phase {
  const ovulation = cycleLength - LUTEAL_LENGTH
  if (cycleDay <= periodLength) return 'menstrual'
  if (cycleDay >= ovulation - 1 && cycleDay <= ovulation + 1) return 'ovulatory'
  if (cycleDay < ovulation - 1) return 'follicular'
  return 'luteal'
}

export function buildCycleModel(starts: PeriodStart[], until: string): CycleModel {
  const sorted = [...starts].sort((a, b) => a.date.localeCompare(b.date))
  const cycles: CycleSummary[] = sorted.map((s, i) => {
    const next = sorted[i + 1]
    const length = next ? diffDays(next.date, s.date) : null
    return {
      start: s.date,
      length,
      periodLength: Math.min(10, Math.max(2, s.length ?? DEFAULT_PERIOD)),
      irregular: length != null && (length < MIN_CYCLE || length > MAX_CYCLE),
    }
  })

  const regular = cycles.filter((c) => c.length != null && !c.irregular).map((c) => c.length!)
  const typicalLength = Math.round(median(regular) ?? DEFAULT_CYCLE)
  const typicalPeriod = Math.round(median(sorted.filter((s) => s.length).map((s) => s.length!)) ?? DEFAULT_PERIOD)
  const lengthRange: [number, number] | null = regular.length ? [Math.min(...regular), Math.max(...regular)] : null

  const phases = new Map<string, DayPhase>()
  const untilN = toDayNumber(until)
  cycles.forEach((c, cycleIndex) => {
    const predicted = c.length == null
    const length = c.length ?? typicalLength
    const startN = toDayNumber(c.start)
    // An open cycle is only trusted for a while past its predicted end; after that the next start was probably not logged.
    const lastN = predicted ? Math.min(untilN, startN + length + 7) : startN + length - 1
    const periodLength = sorted[cycleIndex]?.length ? c.periodLength : Math.min(10, Math.max(2, typicalPeriod))
    for (let n = startN; n <= lastN; n++) {
      const cycleDay = n - startN + 1
      const daysToNext = cycleDay - length - 1
      let phase: Phase | null
      if (c.irregular) {
        // Keep only the parts we can trust: the bleed and the 14 days before the next period.
        phase = cycleDay <= periodLength ? 'menstrual' : daysToNext >= -LUTEAL_LENGTH ? 'luteal' : null
      } else {
        phase = cycleDay > length ? 'luteal' : phaseForDay(cycleDay, length, periodLength)
      }
      if (!phase) continue
      phases.set(fromDayNumber(n), { date: fromDayNumber(n), phase, cycleDay, cycleLength: length, daysToNext, cycleIndex, predicted })
    }
  })

  return { cycles, typicalLength, typicalPeriod, lengthRange, phases }
}

export function predictNextPeriod(model: CycleModel): string | null {
  const last = model.cycles[model.cycles.length - 1]
  return last ? addDays(last.start, model.typicalLength) : null
}
