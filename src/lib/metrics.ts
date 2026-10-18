import type { MetricKey, Phase } from './types'

export interface MetricDef {
  key: MetricKey
  label: string
  short: string
  unit: string
  /** true = higher is better, false = lower is better, null = neutral */
  higherIsBetter: boolean | null
  source: 'garmin' | 'manual'
  format: (v: number) => string
  /** Minimum difference that is worth calling out in insights. */
  meaningful: number
}

const int = (v: number) => Math.round(v).toLocaleString()
const one = (v: number) => v.toFixed(1)
const hm = (v: number) => {
  const total = Math.round(v)
  const h = Math.floor(total / 60)
  const m = total - h * 60
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`
}

export const METRICS: MetricDef[] = [
  { key: 'mood', label: 'Mood', short: 'Mood', unit: '/5', higherIsBetter: true, source: 'manual', format: one, meaningful: 0.3 },
  { key: 'energy', label: 'Energy', short: 'Energy', unit: '/5', higherIsBetter: true, source: 'manual', format: one, meaningful: 0.3 },
  { key: 'focus', label: 'Work focus', short: 'Focus', unit: '/5', higherIsBetter: true, source: 'manual', format: one, meaningful: 0.3 },
  { key: 'social', label: 'Social energy', short: 'Social', unit: '/5', higherIsBetter: true, source: 'manual', format: one, meaningful: 0.3 },
  { key: 'body', label: 'Physical feeling', short: 'Body', unit: '/5', higherIsBetter: true, source: 'manual', format: one, meaningful: 0.3 },
  { key: 'anxiety', label: 'Anxiety', short: 'Anxiety', unit: '/5', higherIsBetter: false, source: 'manual', format: one, meaningful: 0.3 },
  { key: 'appetite', label: 'Appetite & cravings', short: 'Appetite', unit: '/5', higherIsBetter: null, source: 'manual', format: one, meaningful: 0.3 },
  { key: 'sleepMinutes', label: 'Sleep duration', short: 'Sleep', unit: '', higherIsBetter: true, source: 'garmin', format: hm, meaningful: 15 },
  { key: 'sleepScore', label: 'Sleep score', short: 'Sleep score', unit: '', higherIsBetter: true, source: 'garmin', format: int, meaningful: 3 },
  { key: 'deepSleepMinutes', label: 'Deep sleep', short: 'Deep', unit: '', higherIsBetter: true, source: 'garmin', format: hm, meaningful: 8 },
  { key: 'remSleepMinutes', label: 'REM sleep', short: 'REM', unit: '', higherIsBetter: true, source: 'garmin', format: hm, meaningful: 8 },
  { key: 'steps', label: 'Steps', short: 'Steps', unit: '', higherIsBetter: true, source: 'garmin', format: int, meaningful: 800 },
  { key: 'intensityMinutes', label: 'Intensity minutes', short: 'Intensity', unit: ' min', higherIsBetter: true, source: 'garmin', format: int, meaningful: 8 },
  { key: 'workoutMinutes', label: 'Workout time', short: 'Workouts', unit: ' min', higherIsBetter: true, source: 'garmin', format: int, meaningful: 8 },
  { key: 'activeCalories', label: 'Active calories', short: 'Active kcal', unit: ' kcal', higherIsBetter: null, source: 'garmin', format: int, meaningful: 60 },
  { key: 'restingHR', label: 'Resting heart rate', short: 'RHR', unit: ' bpm', higherIsBetter: false, source: 'garmin', format: one, meaningful: 1 },
  { key: 'hrv', label: 'Overnight HRV', short: 'HRV', unit: ' ms', higherIsBetter: true, source: 'garmin', format: int, meaningful: 3 },
  { key: 'stress', label: 'Avg stress', short: 'Stress', unit: '', higherIsBetter: false, source: 'garmin', format: int, meaningful: 3 },
  { key: 'bodyBattery', label: 'Body Battery peak', short: 'Body Battery', unit: '', higherIsBetter: true, source: 'garmin', format: int, meaningful: 5 },
]

export const METRIC_BY_KEY = Object.fromEntries(METRICS.map((m) => [m.key, m])) as Record<MetricKey, MetricDef>

export function fmt(key: MetricKey, v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return '–'
  const m = METRIC_BY_KEY[key]
  return m.format(v) + m.unit
}

export function fmtDelta(key: MetricKey, d: number): string {
  const m = METRIC_BY_KEY[key]
  const sign = d > 0 ? '+' : d < 0 ? '−' : '±'
  return sign + m.format(Math.abs(d)) + m.unit
}

export const PHASES: Phase[] = ['menstrual', 'follicular', 'ovulatory', 'luteal']

export const PHASE_LABEL: Record<Phase, string> = {
  menstrual: 'Menstrual',
  follicular: 'Follicular',
  ovulatory: 'Ovulatory',
  luteal: 'Luteal',
}

export const SYMPTOMS = [
  'Cramps',
  'Bloating',
  'Headache',
  'Breast tenderness',
  'Cravings',
  'Irritability',
  'Anxiety',
  'Low mood',
  'Brain fog',
  'Fatigue',
  'Acne',
  'Poor sleep',
  'Back pain',
  'Tearful',
]

export interface ScaleDef {
  key: MetricKey
  label: string
  /** Words for 1 to 5. */
  words: [string, string, string, string, string]
}

/** The 1–5 scales logged by hand, in the order they are asked. */
export const SCALES: ScaleDef[] = [
  { key: 'mood', label: 'Mood', words: ['Awful', 'Low', 'Okay', 'Good', 'Great'] },
  { key: 'energy', label: 'Energy', words: ['Drained', 'Tired', 'Steady', 'Good', 'Energised'] },
  { key: 'focus', label: 'Work focus', words: ['Scattered', 'Distracted', 'Okay', 'Focused', 'Sharp'] },
  { key: 'social', label: 'Social energy', words: ['Withdrawn', 'Low', 'Neutral', 'Sociable', 'Outgoing'] },
  { key: 'body', label: 'Physical feeling', words: ['Awful', 'Rough', 'Okay', 'Good', 'Great'] },
  { key: 'anxiety', label: 'Anxiety', words: ['Calm', 'Slight', 'Some', 'High', 'Very high'] },
  { key: 'appetite', label: 'Appetite & cravings', words: ['Very low', 'Low', 'Normal', 'Hungry', 'Strong cravings'] },
]
