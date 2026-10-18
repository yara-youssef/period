# Cycle Insights

A personal dashboard that lines up your Garmin data (sleep, steps, stress, resting HR, HRV, Body Battery) and your daily mood and energy against the phases of your menstrual cycle. It shows what changes in each phase and which habits go with your better days, especially in the luteal phase.

Everything runs in the browser. Data is stored in `localStorage` on your device and never sent anywhere.

## Run it

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build into dist/
```

## Getting your data in

1. **Garmin.** Request an export at Garmin Account → Data Management → [Export Your Data](https://www.garmin.com/account/datamanagement/exportdata/). Drop the zip Garmin emails you onto **Import & data**. The importer reads daily summaries (`UDSFile`), sleep, HRV and activities. It also accepts CSVs, where you map each column yourself.
2. **Periods.** On **Cycles**, add the first day of each period (or paste a list of dates). Logging bleeding on **Log today** also creates period starts automatically.
3. **Mood and energy.** Log them daily on **Log today**, along with symptoms and notes. About 10 logged luteal days are enough for the "what helps" findings to appear.

To explore before your own data is in, use **Load demo data**.

## How phases are worked out

- **Menstrual**: the bleeding days (5 by default).
- **Ovulation** is estimated 14 days before the next period, since the luteal phase is the most consistent part of the cycle. **Ovulatory** is ovulation day ±1.
- **Follicular**: from the end of bleeding to just before ovulation. **Luteal**: from just after ovulation to the next period.
- The current, unfinished cycle uses your median cycle length. Cycles shorter than 18 or longer than 45 days are treated as probable missed logs, and only their first and last days are used.

## What the dashboard shows

- **Today**: cycle day, phase, and when your next period is due.
- **What to try in your luteal phase**: habits you control (sleep, steps, intensity minutes, workouts) that went with better luteal mood or energy, with the threshold from your own data.
- **Findings**: luteal vs follicular differences, whether the dip falls in the last week before your period, the strongest links to mood and energy, and symptoms that cluster in the luteal phase.
- **Charts**: any metric averaged by cycle day (lined up on period start or on the next period), a phase-by-phase table, a "what moves your mood" table, a cycle-by-cycle heatmap, and a timeline.

The findings are correlations within your own data, not medical advice.

## Code map

- `src/lib/cycle.ts`: period starts → cycles → phase for each day
- `src/lib/stats.ts`: phase statistics, cycle-day profiles, driver analysis, insights
- `src/lib/garmin.ts`, `src/lib/csv.ts`: importers
- `src/store.ts`: persisted state and derived data
- `src/components/`, `src/views/`: UI; charts are plain SVG
