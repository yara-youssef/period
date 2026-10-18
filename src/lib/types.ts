export type Phase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal'

export type Flow = 'none' | 'spotting' | 'light' | 'medium' | 'heavy'

/** One calendar day of data. Every field is optional because sources fill in different parts. */
export interface DayRecord {
  date: string // YYYY-MM-DD

  // From Garmin (or any CSV)
  steps?: number
  intensityMinutes?: number
  workoutMinutes?: number
  /** Garmin activity types recorded that day, e.g. "Yoga", "Running". */
  activityTypes?: string[]
  activeCalories?: number
  sleepMinutes?: number
  deepSleepMinutes?: number
  remSleepMinutes?: number
  sleepScore?: number
  restingHR?: number
  hrv?: number
  stress?: number
  bodyBattery?: number

  // Logged by hand
  // 1–5 scales, see SCALES in metrics.ts
  mood?: number
  energy?: number
  focus?: number
  social?: number
  body?: number
  appetite?: number
  anxiety?: number
  flow?: Flow
  symptoms?: string[]
  notes?: string
  /** Fields filled from weekly summaries (spread over the week), to be replaced by daily data. */
  weekly?: MetricKey[]
}

export type MetricKey = Exclude<keyof DayRecord, 'date' | 'flow' | 'symptoms' | 'notes' | 'activityTypes' | 'weekly'>

export interface PeriodStart {
  date: string
  /** Bleeding length in days, when known. */
  length?: number
}

export interface DayPhase {
  date: string
  phase: Phase
  cycleDay: number
  cycleLength: number
  /** Negative count of days until the next period (-1 = the day before). */
  daysToNext: number
  cycleIndex: number
  /** True when the cycle is still open, so its length is a prediction. */
  predicted: boolean
}
