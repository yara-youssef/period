import { unzipSync, strFromU8 } from 'fflate'
import { normalizeDate } from './dates'
import type { DayRecord } from './types'

/**
 * Reads the Garmin Connect data export ("Export your data" in your Garmin account settings).
 * The export is a zip of JSON files; the ones that matter are the daily summaries (UDSFile),
 * sleep data, HRV and summarized activities. Field names differ between export versions,
 * so every object is checked against a list of known shapes instead of relying on file names.
 */

export interface ImportResult {
  days: Map<string, Partial<DayRecord>>
  files: number
  recognised: number
}

type Obj = Record<string, unknown>

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)
const sec2min = (v: unknown) => (num(v) != null ? num(v)! / 60 : undefined)

function pick(o: Obj, ...paths: string[]): number | undefined {
  for (const p of paths) {
    let cur: unknown = o
    for (const part of p.split('.')) cur = cur && typeof cur === 'object' ? (cur as Obj)[part] : undefined
    if (num(cur) != null) return num(cur)
  }
  return undefined
}

function stressAverage(o: Obj): number | undefined {
  const direct = pick(o, 'averageStressLevel', 'avgStressLevel')
  if (direct != null && direct >= 0) return direct
  const list = (o.allDayStress as Obj | undefined)?.aggregatorList
  if (Array.isArray(list)) {
    const total = list.find((a: Obj) => a.type === 'TOTAL') as Obj | undefined
    const v = num(total?.averageStressLevel)
    if (v != null && v >= 0) return v
  }
  return undefined
}

function bodyBatteryPeak(o: Obj): number | undefined {
  const direct = pick(o, 'bodyBatteryHighestValue', 'maxBodyBattery')
  if (direct != null) return direct
  const list = (o.bodyBattery as Obj | undefined)?.bodyBatteryStatList
  if (Array.isArray(list)) {
    const hi = list.find((a: Obj) => a.bodyBatteryStatType === 'HIGHEST') as Obj | undefined
    return num(hi?.statsValue)
  }
  return undefined
}

function clean(rec: Partial<DayRecord>): Partial<DayRecord> {
  for (const k of Object.keys(rec) as (keyof DayRecord)[]) if (rec[k] === undefined) delete rec[k]
  return rec
}

/** Returns the date and fields an object contributes, or null if it is not a recognised record. */
function extract(o: Obj): { date: string; rec: Partial<DayRecord>; add?: Partial<DayRecord> } | null {
  // Daily summary (UDS)
  if ('totalSteps' in o || 'restingHeartRate' in o || 'allDayStress' in o) {
    const date = normalizeDate(o.calendarDate)
    if (!date) return null
    const moderate = pick(o, 'moderateIntensityMinutes')
    const vigorous = pick(o, 'vigorousIntensityMinutes')
    return {
      date,
      rec: clean({
        steps: pick(o, 'totalSteps'),
        restingHR: pick(o, 'restingHeartRate', 'currentDayRestingHeartRate'),
        activeCalories: pick(o, 'activeKilocalories'),
        // Garmin counts vigorous minutes double toward the weekly goal; mirror that.
        intensityMinutes: moderate != null || vigorous != null ? (moderate ?? 0) + 2 * (vigorous ?? 0) : undefined,
        stress: stressAverage(o),
        bodyBattery: bodyBatteryPeak(o),
      }),
    }
  }

  // Sleep. calendarDate is the morning you woke up, so it pairs with that day's mood.
  if ('deepSleepSeconds' in o || 'sleepTimeSeconds' in o || 'sleepScores' in o) {
    const date = normalizeDate(o.calendarDate ?? o.sleepEndTimestampGMT)
    if (!date) return null
    const deep = sec2min(o.deepSleepSeconds)
    const light = sec2min(o.lightSleepSeconds)
    const rem = sec2min(o.remSleepSeconds)
    const total = sec2min(o.sleepTimeSeconds) ?? (deep != null || light != null || rem != null ? (deep ?? 0) + (light ?? 0) + (rem ?? 0) : undefined)
    return {
      date,
      rec: clean({
        sleepMinutes: total && total > 0 ? total : undefined,
        deepSleepMinutes: deep,
        remSleepMinutes: rem,
        sleepScore: pick(o, 'sleepScores.overallScore', 'sleepScores.overall.value', 'overallSleepScore', 'sleepScore'),
        hrv: pick(o, 'avgOvernightHrv'),
      }),
    }
  }

  // HRV status
  if ('lastNightAvg' in o || 'hrvSummary' in o) {
    const date = normalizeDate(o.calendarDate ?? (o.hrvSummary as Obj | undefined)?.calendarDate)
    if (!date) return null
    return { date, rec: clean({ hrv: pick(o, 'lastNightAvg', 'hrvSummary.lastNightAvg') }) }
  }

  // Activities: summed per day into workout minutes.
  if ('activityId' in o && ('beginTimestamp' in o || 'startTimeLocal' in o) && 'duration' in o) {
    const date = normalizeDate(o.startTimeLocal ?? o.beginTimestamp)
    const d = num(o.duration)
    if (!date || d == null) return null
    // Exports store milliseconds; the Connect API uses seconds.
    const minutes = d > 50_000 ? d / 60_000 : d / 60
    return { date, rec: {}, add: { workoutMinutes: minutes } }
  }

  return null
}

function walk(node: unknown, visit: (o: Obj) => boolean, depth = 0) {
  if (depth > 6 || node == null || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const item of node) walk(item, visit, depth + 1)
    return
  }
  if (visit(node as Obj)) return
  for (const v of Object.values(node as Obj)) if (v && typeof v === 'object') walk(v, visit, depth + 1)
}

export function importGarminJSON(text: string, into: ImportResult) {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return
  }
  into.files++
  walk(json, (o) => {
    const hit = extract(o)
    if (!hit) return false
    into.recognised++
    const day = into.days.get(hit.date) ?? {}
    Object.assign(day, hit.rec)
    if (hit.add?.workoutMinutes) day.workoutMinutes = (day.workoutMinutes ?? 0) + hit.add.workoutMinutes
    into.days.set(hit.date, day)
    return true
  })
}

export async function importGarminFiles(files: File[]): Promise<ImportResult> {
  const result: ImportResult = { days: new Map(), files: 0, recognised: 0 }
  const handleZip = (bytes: Uint8Array, depth: number) => {
    const entries = unzipSync(bytes, {
      filter: (f) => /\.(json|zip)$/i.test(f.name) && !/__MACOSX/.test(f.name) && f.originalSize < 200_000_000,
    })
    for (const [name, data] of Object.entries(entries)) {
      if (/\.zip$/i.test(name)) {
        if (depth < 2) handleZip(data, depth + 1)
      } else importGarminJSON(strFromU8(data), result)
    }
  }
  for (const f of files) {
    if (/\.zip$/i.test(f.name)) handleZip(new Uint8Array(await f.arrayBuffer()), 0)
    else if (/\.json$/i.test(f.name)) importGarminJSON(await f.text(), result)
  }
  return result
}
