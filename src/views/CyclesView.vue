<script setup lang="ts">
import { computed, ref } from 'vue'
import { predictNextPeriod } from '@/lib/cycle'
import { addDays, longDate, todayISO } from '@/lib/dates'
import { addPeriod, model, periodStarts, removePeriod, state } from '@/store'

const newDate = ref(todayISO())
const newLength = ref<number | null>(5)
const bulk = ref('')
const bulkMsg = ref('')

function add() {
  if (!newDate.value) return
  addPeriod(newDate.value, newLength.value ?? undefined)
}

function addBulk() {
  const dates = bulk.value.match(/\d{4}-\d{2}-\d{2}/g) ?? []
  for (const d of dates) addPeriod(d)
  bulkMsg.value = dates.length ? `Added ${dates.length} dates.` : 'No YYYY-MM-DD dates found.'
  bulk.value = ''
}

const manual = computed(() => new Set(state.periods.map((p) => p.date)))
const rows = computed(() =>
  [...model.value.cycles].reverse().map((c) => ({
    ...c,
    end: c.length ? addDays(c.start, c.length - 1) : null,
    fromFlow: !manual.value.has(c.start),
  })),
)
const next = computed(() => predictNextPeriod(model.value))
</script>

<template>
  <div class="stack">
    <section class="card">
      <h2>Add a period start</h2>
      <p class="sub" style="margin: 4px 0 12px">
        Period dates aren't read from the Garmin export, so enter the first day of each period here (or log bleeding on the Log tab).
        Phases are worked out from these dates: ovulation is estimated 14 days before the next period.
      </p>
      <div class="row">
        <label class="sub">First day <input v-model="newDate" type="date" :max="todayISO()" /></label>
        <label class="sub">Bleeding days <input v-model.number="newLength" type="number" min="1" max="12" style="width: 70px" /></label>
        <button class="btn primary" @click="add">Add</button>
      </div>
      <details style="margin-top: 14px">
        <summary class="sub">Paste many dates at once</summary>
        <textarea v-model="bulk" rows="4" style="width: 100%; margin-top: 8px" placeholder="2026-01-04&#10;2026-02-01&#10;2026-03-02" />
        <div class="row" style="margin-top: 6px">
          <button class="btn" @click="addBulk">Add dates</button>
          <span class="sub">{{ bulkMsg }}</span>
        </div>
      </details>
    </section>

    <section class="card">
      <div class="card-head">
        <div>
          <h2>Your cycles</h2>
          <p class="sub">
            Typical length {{ model.typicalLength }} days, period {{ model.typicalPeriod }} days.
            <template v-if="next">Next period expected around {{ longDate(next) }}.</template>
          </p>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Started</th>
              <th class="num">Cycle length</th>
              <th class="num">Bleeding</th>
              <th>Source</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in rows" :key="c.start">
              <td>{{ longDate(c.start) }}</td>
              <td class="num">
                {{ c.length ? `${c.length} days` : 'in progress' }}
                <span v-if="c.irregular" class="sub" title="Probably a missed period log; only its first and last days are used in analysis"> · check</span>
              </td>
              <td class="num">{{ periodStarts.find((p) => p.date === c.start)?.length ?? '–' }} days</td>
              <td class="sub">{{ c.fromFlow ? 'from bleeding log' : 'entered' }}</td>
              <td class="num"><button class="btn danger" @click="removePeriod(c.start)">Remove</button></td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="5" class="muted">No periods logged yet.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.row {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
label {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}
</style>
