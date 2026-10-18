export type Phase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal'

export type Flow = 'none' | 'spotting' | 'light' | 'medium' | 'heavy'

/** One calendar day of data. Every field is optional because sources fill in different parts. */
export interface DayRecord {
  date: string // YYYY-MM-DD

  // From Garmin (or any CSV)
  steps?: number
  intensityMinutes?: number
  workoutMinutes?: number
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
  mood?: number // 1–5
  energy?: number // 1–5
  flow?: Flow
  symptoms?: string[]
  notes?: string
}

export type MetricKey = Exclude<keyof DayRecord, 'date' | 'flow' | 'symptoms' | 'notes'>

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
