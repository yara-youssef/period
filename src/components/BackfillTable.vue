<script setup lang="ts">
import { computed, ref } from 'vue'
import { dateRange, todayISO } from '@/lib/dates'
import { METRIC_BY_KEY, PHASE_LABEL, SCALES } from '@/lib/metrics'
import type { Flow, MetricKey } from '@/lib/types'
import { model, state, upsertDay } from '@/store'

const emit = defineEmits<{ open: [date: string] }>()

const today = todayISO()
const month = ref(today.slice(0, 7))
const FLOWS: Flow[] = ['none', 'spotting', 'light', 'medium', 'heavy']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function shiftMonth(by: number) {
  const [y, m] = month.value.split('-').map(Number)
  const d = new Date(Date.UTC(y!, m! - 1 + by, 1))
  const next = d.toISOString().slice(0, 7)
  if (next <= today.slice(0, 7)) month.value = next
}

const rows = computed(() => {
  const [y, m] = month.value.split('-').map(Number)
  if (!y || !m) return []
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
  const end = last < today ? last : today
  return dateRange(`${month.value}-01`, end).map((date) => ({
    date,
    label: `${WEEKDAYS[new Date(date + 'T00:00:00Z').getUTCDay()]} ${Number(date.slice(8))}`,
    rec: state.days[date],
    phase: model.value.phases.get(date),
  }))
})

function setScale(date: string, key: MetricKey, e: Event) {
  const v = (e.target as HTMLSelectElement).value
  upsertDay(date, { [key]: v ? Number(v) : undefined })
}

function setFlow(date: string, e: Event) {
  const v = (e.target as HTMLSelectElement).value as Flow | ''
  upsertDay(date, { flow: v || undefined })
}

function setNotes(date: string, e: Event) {
  upsertDay(date, { notes: (e.target as HTMLInputElement).value || undefined })
}

const filled = computed(() => rows.value.filter((r) => r.rec && SCALES.some((s) => r.rec![s.key] != null)).length)
</script>

<template>
  <section class="card">
    <div class="card-head">
      <div>
        <h2>Fill in many days</h2>
        <p class="sub">
          For catching up from paper notes. Use Tab to move between cells and type a number to pick it. Leave anything you didn't note blank. Everything saves
          as you go.
        </p>
      </div>
      <div style="display: flex; gap: 6px; align-items: center">
        <button class="btn" aria-label="Previous month" @click="shiftMonth(-1)">←</button>
        <input v-model="month" type="month" :max="today.slice(0, 7)" aria-label="Month" />
        <button class="btn" aria-label="Next month" :disabled="month >= today.slice(0, 7)" @click="shiftMonth(1)">→</button>
      </div>
    </div>
    <p class="sub" style="margin-bottom: 8px">{{ filled }} of {{ rows.length }} days have at least one score.</p>
    <div class="table-wrap">
      <table class="grid">
        <thead>
          <tr>
            <th>Day</th>
            <th v-for="s in SCALES" :key="s.key" :title="s.label">{{ METRIC_BY_KEY[s.key].short }}</th>
            <th>Bleeding</th>
            <th>Notes</th>
            <th><span class="sr-only">More</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.date">
            <td class="day">
              <span
                class="phase-dot"
                :class="r.phase ? 'phase-' + r.phase.phase : ''"
                :style="r.phase ? '' : 'background: var(--surface-2)'"
                :title="r.phase ? `${PHASE_LABEL[r.phase.phase]}, day ${r.phase.cycleDay}` : 'No cycle data'"
              />
              {{ r.label }}
            </td>
            <td v-for="s in SCALES" :key="s.key">
              <select :value="r.rec?.[s.key] ?? ''" :aria-label="`${s.label}, ${r.date}`" @change="setScale(r.date, s.key, $event)">
                <option value="">–</option>
                <option v-for="(w, i) in s.words" :key="i" :value="i + 1">{{ i + 1 }} {{ w }}</option>
              </select>
            </td>
            <td>
              <select :value="r.rec?.flow ?? ''" :aria-label="`Bleeding, ${r.date}`" @change="setFlow(r.date, $event)">
                <option value="">–</option>
                <option v-for="f in FLOWS" :key="f" :value="f">{{ f }}</option>
              </select>
            </td>
            <td><input type="text" :value="r.rec?.notes ?? ''" :aria-label="`Notes, ${r.date}`" @change="setNotes(r.date, $event)" /></td>
            <td><button class="btn more" :aria-label="`Symptoms and details for ${r.date}`" @click="emit('open', r.date)">…</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.grid th,
.grid td {
  padding: 4px 4px;
  white-space: nowrap;
}
.grid th {
  font-size: 12px;
}
.grid select {
  padding: 4px 4px;
  font-size: 13px;
  width: 6.2em;
}
.grid input[type='text'] {
  padding: 4px 8px;
  font-size: 13px;
  min-width: 12em;
}
.day {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}
.day .phase-dot {
  margin-right: 6px;
}
.more {
  padding: 2px 10px;
}
</style>
