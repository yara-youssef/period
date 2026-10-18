<script setup lang="ts">
import { computed, ref } from 'vue'
import { guessColumn, parseCSV, parseNumber } from '@/lib/csv'
import { normalizeDate, todayISO } from '@/lib/dates'
import { generateDemo } from '@/lib/demo'
import { importGarminFiles } from '@/lib/garmin'
import { readGarminCsv } from '@/lib/garminCsv'
import { METRICS, METRIC_BY_KEY } from '@/lib/metrics'
import type { DayRecord, Flow } from '@/lib/types'
import { clearAll, daysSinceBackup, exportBackup, mergeDays, replaceAll, state } from '@/store'

const emit = defineEmits<{ go: [tab: string] }>()

// ---- files: Garmin zip / JSON / Connect CSVs, any mix, many at once
interface FileReport {
  name: string
  text: string
  tone: 'ok' | 'warn' | 'error'
}
const busy = ref(false)
const dragging = ref(false)
const reports = ref<FileReport[]>([])
/** CSVs that weren't recognised, waiting for manual column mapping. */
const pending = ref<{ name: string; text: string }[]>([])

const cleanName = (n: string) => n.replace(/^[0-9a-f]{8}-/, '')

async function onFiles(list: FileList | File[] | null) {
  if (!list || !list.length) return
  const files = [...list]
  busy.value = true
  reports.value = []
  if (state.demo) clearAll()
  const today = todayISO()
  try {
    const garmin = files.filter((f) => /\.(zip|json)$/i.test(f.name))
    if (garmin.length) {
      const res = await importGarminFiles(garmin)
      const n = mergeDays(res.days)
      const dates = [...res.days.keys()].sort()
      reports.value.push({
        name: garmin.length === 1 ? garmin[0]!.name : `${garmin.length} Garmin export files`,
        text: n
          ? `${n} days of daily data, ${dates[0]} to ${dates[dates.length - 1]}.`
          : `No daily summaries or sleep data found in ${res.files} JSON files.`,
        tone: n ? 'ok' : 'error',
      })
    }
    for (const f of files.filter((f) => /\.(csv|tsv|txt)$/i.test(f.name))) {
      const text = await f.text()
      const res = readGarminCsv(cleanName(f.name), text, today)
      if (!res) {
        pending.value.push({ name: cleanName(f.name), text })
        reports.value.push({ name: cleanName(f.name), text: 'Not a format I recognise. Map its columns below.', tone: 'warn' })
        continue
      }
      const n = mergeDays(res.days, { weekly: res.kind === 'weekly' })
      const labels = res.metrics.map((k) => METRIC_BY_KEY[k].label.toLowerCase()).join(', ')
      reports.value.push({
        name: cleanName(f.name),
        text:
          res.kind === 'activities'
            ? `Workouts and activity types for ${n} days.`
            : res.kind === 'weekly'
              ? `Weekly ${labels}, spread across ${n} days as an estimate. Daily data will replace it.`
              : `Daily ${labels} for ${n} days.`,
        tone: res.kind === 'weekly' ? 'warn' : 'ok',
      })
    }
    for (const f of files.filter((f) => !/\.(zip|json|csv|tsv|txt)$/i.test(f.name))) {
      reports.value.push({ name: f.name, text: 'Skipped: only .zip, .json and .csv files are read.', tone: 'error' })
    }
  } catch (e) {
    reports.value.push({ name: 'Import', text: `Something went wrong: ${(e as Error).message}`, tone: 'error' })
  } finally {
    busy.value = false
  }
  if (pending.value.length && !csvRows.value.length) openPending()
}

function onDrop(e: DragEvent) {
  dragging.value = false
  onFiles(e.dataTransfer?.files ?? null)
}

// ---- manual CSV mapping for anything not recognised
const csvName = ref('')
const csvRows = ref<string[][]>([])
const mapping = ref<string[]>([])
const csvMsg = ref('')
const TARGETS = [{ key: '', label: 'Ignore' }, { key: 'date', label: 'Date' }, ...METRICS.map((m) => ({ key: m.key, label: m.label })), { key: 'flow', label: 'Bleeding (flow)' }]

function openPending() {
  const next = pending.value.shift()
  if (!next) return
  csvName.value = next.name
  csvRows.value = parseCSV(next.text)
  mapping.value = (csvRows.value[0] ?? []).map(guessColumn)
  csvMsg.value = ''
}

const header = computed(() => csvRows.value[0] ?? [])
const preview = computed(() => csvRows.value.slice(1, 4))

const FLOW_WORDS: Record<string, Flow> = { spotting: 'spotting', light: 'light', medium: 'medium', heavy: 'heavy', none: 'none' }

function importCSV() {
  const dateCol = mapping.value.indexOf('date')
  if (dateCol < 0) {
    csvMsg.value = 'Pick which column holds the date.'
    return
  }
  const out = new Map<string, Partial<DayRecord>>()
  const body = csvRows.value.slice(1)
  mapping.value.forEach((key, col) => {
    if (!key || key === 'date') return
    const isDuration = ['sleepMinutes', 'deepSleepMinutes', 'remSleepMinutes'].includes(key)
    // A sleep column of small decimals is in hours, not minutes.
    const nums = body.map((r) => parseNumber(r[col])).filter((v): v is number => v != null)
    const hours = isDuration && nums.length > 0 && Math.max(...nums) <= 24
    for (const r of body) {
      const date = normalizeDate(r[dateCol])
      if (!date) continue
      const rec = out.get(date) ?? {}
      if (key === 'flow') {
        const w = (r[col] ?? '').trim().toLowerCase()
        if (FLOW_WORDS[w]) rec.flow = FLOW_WORDS[w]
      } else {
        const v = parseNumber(r[col])
        if (v != null) (rec as Record<string, number>)[key] = hours ? v * 60 : v
      }
      out.set(date, rec)
    }
  })
  const n = mergeDays(out)
  reports.value.push({ name: csvName.value, text: `Imported ${n} days.`, tone: 'ok' })
  csvRows.value = []
  openPending()
}

function skipCSV() {
  csvRows.value = []
  openPending()
}

// ---- backup & demo
function download() {
  const blob = new Blob([exportBackup()], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `cycle-insights-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

const backupMsg = ref('')
async function restore(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  try {
    const data = JSON.parse(await f.text())
    if (!data.days || !Array.isArray(data.periods)) throw new Error('not a backup file')
    replaceAll({ days: data.days, periods: data.periods, demo: !!data.demo })
    backupMsg.value = `Restored ${Object.keys(data.days).length} days.`
  } catch (err) {
    backupMsg.value = `Couldn't restore: ${(err as Error).message}`
  }
}

function loadDemo() {
  if (Object.keys(state.days).length && !state.demo && !confirm('Replace your data with demo data? Download a backup first if you want to keep it.')) return
  const { days, periods } = generateDemo()
  replaceAll({ days: Object.fromEntries(days.map((d) => [d.date, d])), periods, demo: true })
  emit('go', 'dashboard')
}

function wipe() {
  if (confirm('Delete all data stored in this browser? This cannot be undone.')) clearAll()
}
</script>

<template>
  <div class="stack">
    <section class="card">
      <h2>Garmin data</h2>
      <p class="sub" style="margin: 4px 0 12px">Drop any mix of files, as many as you like. They're read in your browser; nothing is uploaded anywhere.</p>
      <label class="drop" :class="{ dragging }" @dragover.prevent="dragging = true" @dragleave="dragging = false" @drop.prevent="onDrop">
        <input type="file" accept=".zip,.json,.csv,.tsv,.txt" multiple class="sr-only" @change="onFiles(($event.target as HTMLInputElement).files)" />
        <strong>{{ busy ? 'Reading…' : 'Choose or drop files' }}</strong>
        <span class="sub">Garmin export .zip, JSON files from it, or CSVs from Garmin Connect (Activities, Steps, Sleep, Intensity Minutes, Calories, Stress…)</span>
      </label>

      <ul v-if="reports.length" class="reports">
        <li v-for="(r, i) in reports" :key="i">
          <span class="badge" :class="r.tone">{{ r.tone === 'ok' ? '✓' : r.tone === 'warn' ? '!' : '×' }}</span>
          <div>
            <strong>{{ r.name }}</strong>
            <div class="sub">{{ r.text }}</div>
          </div>
        </li>
      </ul>

      <details class="help" :open="reports.some((r) => r.tone === 'warn')">
        <summary>Which files give the best results?</summary>
        <ul class="sub steps">
          <li>
            <strong>Best: the full export.</strong> Request it at
            <a href="https://www.garmin.com/account/datamanagement/exportdata/" target="_blank" rel="noopener">Garmin Account → Export Your Data</a>. It has every day,
            plus resting HR, HRV, stress and Body Battery.
          </li>
          <li>
            <strong>Activities.csv</strong> (Garmin Connect → Activities → Export CSV) is already per workout, so workout time and type (yoga, running…) are exact.
          </li>
          <li>
            <strong>Report CSVs</strong> (Steps, Sleep, Intensity Minutes…) are <em>weekly</em> when you pick a 1-year range. Phase analysis needs single days, so
            weekly values are only an estimate and are left out of the "what helps" findings. Choosing the <strong>4 Weeks</strong> range before exporting should
            give one row per day; export a few 4-week blocks to cover more time.
          </li>
          <li>Re-import whenever you like. Newer daily data replaces weekly estimates and never overwrites your mood logs.</li>
        </ul>
      </details>
    </section>

    <section v-if="csvRows.length" class="card">
      <h2>Map the columns of {{ csvName }}</h2>
      <p class="sub" style="margin: 4px 0 12px">Tell me which column is which. Leave anything else on Ignore.</p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th v-for="(h, i) in header" :key="i">
                <div style="margin-bottom: 4px">{{ h }}</div>
                <select v-model="mapping[i]" :aria-label="`Column ${h}`">
                  <option v-for="t in TARGETS" :key="t.key" :value="t.key">{{ t.label }}</option>
                </select>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in preview" :key="i">
              <td v-for="(c, j) in r" :key="j" class="sub">{{ c }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style="display: flex; gap: 8px; margin-top: 10px; align-items: center">
        <button class="btn primary" @click="importCSV">Import {{ csvRows.length - 1 }} rows</button>
        <button class="btn" @click="skipCSV">Skip this file</button>
        <span class="sub">{{ csvMsg }}</span>
      </div>
    </section>

    <section class="card">
      <h2>Backup &amp; demo</h2>
      <p class="sub" style="margin: 4px 0 12px">
        Everything is stored only in this browser. Download a backup now and then, especially before clearing site data or switching devices.
      </p>
      <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center">
        <button class="btn" @click="download">Download backup</button>
        <label class="btn">Restore backup<input type="file" accept=".json" class="sr-only" @change="restore" /></label>
        <button class="btn" @click="loadDemo">Load demo data</button>
        <button class="btn danger" @click="wipe">Delete all data</button>
      </div>
      <p v-if="backupMsg" class="sub" style="margin-top: 10px">{{ backupMsg }}</p>
      <p class="sub" style="margin-top: 10px">{{ Object.keys(state.days).length }} days stored{{ state.demo ? ' (demo)' : '' }}.
        {{ daysSinceBackup == null ? 'No backup downloaded yet.' : daysSinceBackup === 0 ? 'Last backup: today.' : `Last backup: ${daysSinceBackup} days ago.` }}</p>
    </section>
  </div>
</template>

<style scoped>
.steps {
  margin: 6px 0 14px;
  padding-left: 20px;
  display: grid;
  gap: 4px;
}
.drop {
  display: grid;
  gap: 4px;
  place-items: center;
  text-align: center;
  padding: 28px 16px;
  border: 1.5px dashed var(--axis);
  border-radius: 12px;
  cursor: pointer;
}
.drop.dragging,
.drop:hover {
  background: var(--surface-2);
}
.drop:focus-within {
  outline: 2px solid var(--focus);
}
.reports {
  list-style: none;
  padding: 0;
  margin: 14px 0 0;
  display: grid;
  gap: 8px;
}
.reports li {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.badge {
  flex: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: inline-grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  background: var(--surface-2);
}
.badge.ok {
  color: var(--good);
}
.badge.warn {
  color: var(--text-secondary);
}
.badge.error {
  color: var(--bad);
}
.help {
  margin-top: 14px;
}
.help summary {
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
}
th select {
  font-weight: 400;
  max-width: 160px;
}
</style>
