import { addDays, diffDays, todayISO } from './dates'
import { phaseForDay } from './cycle'
import type { DayRecord, Flow, PeriodStart } from './types'

/** Deterministic pseudo-random numbers so the demo looks the same every time. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

/**
 * Six months of plausible data with a harder late-luteal phase, where better sleep and
 * more steps the day before lift mood. Useful for seeing what the dashboard can show.
 */
export function generateDemo(): { days: DayRecord[]; periods: PeriodStart[] } {
  const rand = rng(42)
  const normal = () => {
    const u = Math.max(rand(), 1e-9)
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand())
  }
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

  const today = todayISO()
  const lengths = [29, 27, 30, 28, 31, 28, 29]
  const total = lengths.reduce((a, b) => a + b, 0)
  let start = addDays(today, -total + 12)
  const periods: PeriodStart[] = []
  const days: DayRecord[] = []
  let prevSteps = 8500

  for (const length of lengths) {
    periods.push({ date: start, length: 5 })
    for (let cd = 1; cd <= length; cd++) {
      const date = addDays(start, cd - 1)
      if (diffDays(date, today) > 0) break
      const phase = phaseForDay(cd, length, 5)
      const toNext = cd - length - 1
      const luteal = phase === 'luteal' ? 1 : 0
      const late = luteal && toNext >= -7 ? 1 : 0
      const mens = phase === 'menstrual' ? 1 : 0
      const ovu = phase === 'ovulatory' ? 1 : 0
      const weekend = [0, 6].includes(new Date(date + 'T00:00:00Z').getUTCDay()) ? 1 : 0

      const sleep = clamp(445 - 18 * luteal - 22 * late - 10 * mens + 25 * weekend + 38 * normal(), 280, 600)
      const steps = Math.round(clamp(9000 - 900 * luteal - 1600 * mens + 600 * ovu - 1200 * weekend + 2800 * normal(), 1500, 22000))
      const intensity = Math.round(clamp(28 - 6 * luteal - 10 * mens + 22 * normal(), 0, 140))
      const workout = rand() < 0.45 - 0.1 * luteal - 0.15 * mens ? Math.round(clamp(45 + 18 * normal(), 15, 110)) : 0
      const rhr = 57 + 2.6 * luteal + 0.8 * late + 1.1 * mens + 1.2 * normal()
      const hrv = Math.round(50 - 5 * luteal - 2 * late + 5 * normal())
      const stress = Math.round(clamp(29 + 5 * luteal + 4 * late - (sleep - 445) / 15 + 6 * normal(), 8, 75))
      const bb = Math.round(clamp(76 - 7 * luteal - 4 * late + (sleep - 445) / 6 + 9 * normal(), 15, 100))
      const score = Math.round(clamp(78 + (sleep - 445) / 5 - 4 * luteal + 6 * normal(), 30, 98))

      const moodRaw = 3.7 - 0.35 * luteal - 0.75 * late - 0.4 * mens + 0.25 * ovu + (sleep - 445) / 90 + (prevSteps - 8500) / 9000 + 0.45 * normal()
      const energyRaw = 3.6 - 0.3 * luteal - 0.6 * late - 0.6 * mens + 0.3 * ovu + (sleep - 445) / 80 + (bb - 70) / 60 + 0.45 * normal()

      const symptoms: string[] = []
      const chance = (p: number, s: string) => rand() < p && symptoms.push(s)
      if (mens) {
        chance(cd <= 2 ? 0.7 : 0.25, 'Cramps')
        chance(0.4, 'Fatigue')
        chance(0.2, 'Back pain')
      }
      if (late) {
        chance(0.55, 'Bloating')
        chance(0.5, 'Irritability')
        chance(0.45, 'Cravings')
        chance(0.35, 'Anxiety')
        chance(0.35, 'Low mood')
        chance(0.3, 'Breast tenderness')
        chance(0.2, 'Tearful')
      } else if (luteal) {
        chance(0.2, 'Bloating')
        chance(0.15, 'Cravings')
        chance(0.15, 'Brain fog')
      } else chance(0.05, 'Headache')
      if (sleep < 380) chance(0.6, 'Poor sleep')

      const flow: Flow | undefined = mens ? (['heavy', 'heavy', 'medium', 'light', 'light'] as Flow[])[cd - 1] : undefined
      const logged = rand() > 0.12

      days.push({
        date,
        steps,
        intensityMinutes: intensity,
        workoutMinutes: workout || undefined,
        activeCalories: Math.round(steps * 0.045 + intensity * 7),
        sleepMinutes: Math.round(sleep),
        deepSleepMinutes: Math.round(sleep * (0.19 - 0.02 * luteal) + 8 * normal()),
        remSleepMinutes: Math.round(sleep * 0.22 + 8 * normal()),
        sleepScore: score,
        restingHR: Math.round(rhr),
        hrv,
        stress,
        bodyBattery: bb,
        ...(logged
          ? {
              mood: Math.round(clamp(moodRaw, 1, 5)),
              energy: Math.round(clamp(energyRaw, 1, 5)),
              focus: Math.round(clamp(3.5 - 0.2 * luteal - 0.5 * late - 0.4 * mens + 0.3 * ovu + (sleep - 445) / 100 + 0.5 * normal(), 1, 5)),
              social: Math.round(clamp(3.3 - 0.3 * luteal - 0.6 * late - 0.5 * mens + 0.8 * ovu + 0.5 * normal(), 1, 5)),
              body: Math.round(clamp(3.8 - 0.3 * luteal - 0.7 * late - 1.1 * mens + 0.2 * ovu + 0.5 * normal(), 1, 5)),
              anxiety: Math.round(clamp(2.0 + 0.3 * luteal + 0.8 * late + (stress - 30) / 15 + 0.5 * normal(), 1, 5)),
              appetite: Math.round(clamp(3.0 + 0.4 * luteal + 0.9 * late - 0.3 * ovu + 0.5 * normal(), 1, 5)),
              symptoms,
              flow,
            }
          : { flow }),
      })
      prevSteps = steps
    }
    start = addDays(start, length)
    if (diffDays(start, today) > 0) break
  }
  return { days, periods }
}
