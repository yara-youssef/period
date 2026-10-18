<script setup lang="ts">
import { computed, ref } from 'vue'
import { guessColumn, parseCSV, parseNumber } from '@/lib/csv'
import { normalizeDate } from '@/lib/dates'
import { generateDemo } from '@/lib/demo'
import { importGarminFiles } from '@/lib/garmin'
import { METRICS } from '@/lib/metrics'
import type { DayRecord, Flow } from '@/lib/types'
import { clearAll, exportBackup, mergeDays, replaceAll, state } from '@/store'

const emit = defineEmits<{ go: [tab: string] }>()

// ---- Garmin export
const garminBusy = ref(false)
const garminMsg = ref('')
const dragging = ref(false)

async function onGarmin(files: FileList | File[] | null) {
  if (!files || !files.length) return
  garminBusy.value = true
  garminMsg.value = 'Reading…'
  try {
    const res = await importGarminFiles([...files])
    if (state.demo) clearAll()
    const n = mergeDays(res.days)
    const dates = [...res.days.keys()].sort()
    garminMsg.value = n
      ? `Imported ${n} days (${dates[0]} to ${dates[dates.length - 1]}) from ${res.files} files.`
      : `Read ${res.files} JSON files but found no daily summaries or sleep data. Try the CSV importer below, or check you exported "All data".`
  } catch (e) {
    garminMsg.value = `Couldn't read that file: ${(e as Error).message}`
  } finally {
    garminBusy.value = false
  }
}

function onDrop(e: DragEvent) {
  dragging.value = false
  onGarmin(e.dataTransfer?.files ?? null)
}

// ---- CSV
const csvRows = ref<string[][]>([])
const mapping = ref<string[]>([])
const csvMsg = ref('')
const TARGETS = [{ key: '', label: 'Ignore' }, { key: 'date', label: 'Date' }, ...METRICS.map((m) => ({ key: m.key, label: m.label })), { key: 'flow', label: 'Bleeding (flow)' }]

async function onCSV(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  csvRows.value = parseCSV(await f.text())
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
  if (state.demo) clearAll()
  const n = mergeDays(out)
  csvMsg.value = `Imported ${n} days.`
  csvRows.value = []
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
      <h2>Garmin export</h2>
      <ol class="sub steps">
        <li>
          On <a href="https://www.garmin.com/account/datamanagement/exportdata/" target="_blank" rel="noopener">Garmin Account → Data Management → Export Your Data</a>, request
          an export. Garmin emails you a link, usually within a day or two.
        </li>
        <li>Drop the downloaded <code>.zip</code> here as-is. It's read in your browser; nothing is uploaded anywhere.</li>
        <li>Re-import whenever you want fresh data. New values merge with what you've logged by hand.</li>
      </ol>
      <label class="drop" :class="{ dragging }" @dragover.prevent="dragging = true" @dragleave="dragging = false" @drop.prevent="onDrop">
        <input type="file" accept=".zip,.json" multiple class="sr-only" @change="onGarmin(($event.target as HTMLInputElement).files)" />
        <strong>{{ garminBusy ? 'Reading…' : 'Choose or drop your Garmin .zip' }}</strong>
        <span class="sub">or individual JSON files from inside it (UDSFile, sleepData, summarizedActivities)</span>
      </label>
      <p v-if="garminMsg" class="sub" style="margin-top: 10px">{{ garminMsg }}</p>
      <p class="sub" style="margin-top: 10px">
        Reads steps, intensity minutes, workouts, active calories, sleep (duration, stages, score), resting HR, HRV, stress and Body Battery.
      </p>
    </section>

    <section class="card">
      <h2>CSV file</h2>
      <p class="sub" style="margin: 4px 0 12px">For Garmin Connect report exports, or mood you tracked in another app. You choose which column is which.</p>
      <input type="file" accept=".csv,.tsv,.txt" @change="onCSV" />
      <div v-if="header.length" style="margin-top: 14px">
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
        <button class="btn primary" style="margin-top: 10px" @click="importCSV">Import {{ csvRows.length - 1 }} rows</button>
      </div>
      <p v-if="csvMsg" class="sub" style="margin-top: 10px">{{ csvMsg }}</p>
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
      <p class="sub" style="margin-top: 10px">{{ Object.keys(state.days).length }} days stored{{ state.demo ? ' (demo)' : '' }}.</p>
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
code {
  font-size: 13px;
}
th select {
  font-weight: 400;
  max-width: 160px;
}
</style>
