# Cycle Insights

A personal dashboard that lines up your Garmin data (sleep, steps, workouts, stress, resting HR, HRV, Body Battery) and how you feel each day against the phases of your menstrual cycle. It shows what changes in each phase, which habits go with your better days (especially in the luteal phase), and what two cycle-syncing books recommend for each phase.

Everything runs in the browser. Data is stored in `localStorage` on your device and never sent anywhere, so download a backup now and then from **Import & data**.

## Run it

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build into dist/
```

## Getting your data in

1. **Garmin.** On **Import & data**, drop any mix of files at once:
   - the full export zip from Garmin Account → Data Management → [Export Your Data](https://www.garmin.com/account/datamanagement/exportdata/) (best: every day, including resting HR, HRV, stress and Body Battery);
   - `Activities.csv` from Garmin Connect (exact workout time and type, e.g. yoga or running);
   - report CSVs from Garmin Connect (Steps, Sleep, Intensity Minutes, Calories, Stress…). With a 1-year range these are weekly, so they're spread across each week, flagged as estimates and left out of the day-level "what helps" analysis. The 4 Weeks range gives daily rows.

   Any other CSV opens a column mapper. Daily data always replaces weekly estimates and never overwrites your own logs.
2. **Periods.** On **Cycles**, add the first day of each period, or paste a list (`2026-05-02 6` = start date and bleeding days). Start dates and bleeding days can be edited in the table. Logging bleeding on **Log today** also creates period starts automatically.
3. **How you feel.** On **Log today**, tap 1–5 for mood, energy, work focus, social energy, physical feeling, anxiety, and appetite & cravings, plus bleeding, symptoms and notes. **Many days (catch up)** shows a month as a table for entering past days from paper notes.

To explore before your own data is in, use **Load demo data**.

## How phases are worked out

- **Menstrual**: the bleeding days (5 by default, or what you enter).
- **Ovulation** is estimated 14 days before the next period, since the luteal phase is the most consistent part of the cycle. **Ovulatory** is ovulation day ±1.
- **Follicular**: from the end of bleeding to just before ovulation. **Luteal**: from just after ovulation to the next period.
- The current, unfinished cycle uses your median cycle length. Cycles shorter than 18 or longer than 45 days are treated as probable missed logs, and only their first and last days are used.

## What the app shows

- **Dashboard**: today's cycle day and phase, whether you've logged today, the books' shared advice for the current phase, habits that went with better luteal days in your own data, ranked findings, any metric averaged by cycle day, a phase-by-phase table, a "what moves your mood/energy/focus…" table (including activity types such as yoga or running), a cycle-by-cycle heatmap and a timeline.
- **Information**: recommendations from *In the FLO* (Alisa Vitti) and *Fast Like a Girl* (Dr. Mindy Pelz) for each phase, with the luteal phase split into early and late, paraphrased with chapter and page. It shows where the books agree and where they disagree (mainly fasting).

Findings are correlations within your own data, and the book recommendations are the authors' views. Neither is medical advice.

## Code map

- `src/lib/cycle.ts`: period starts → cycles → phase for each day
- `src/lib/stats.ts`: phase statistics, cycle-day profiles, driver analysis, insights
- `src/lib/garmin.ts`, `src/lib/garminCsv.ts`, `src/lib/csv.ts`: importers
- `src/lib/metrics.ts`: metric definitions and the 1–5 scales
- `src/lib/guidance.ts`: book recommendations by phase, with references
- `src/store.ts`: persisted state and derived data
- `src/components/`, `src/views/`: UI; charts are plain SVG
