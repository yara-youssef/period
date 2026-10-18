<script setup lang="ts">
import { computed, ref } from 'vue'
import { addDays, longDate, todayISO } from '@/lib/dates'
import BackfillTable from '@/components/BackfillTable.vue'
import { METRICS, PHASE_LABEL, SCALES, SYMPTOMS, fmt } from '@/lib/metrics'
import type { DayRecord, Flow } from '@/lib/types'
import { model, state, upsertDay } from '@/store'

const today = todayISO()
const date = ref(today)
const day = computed(() => state.days[date.value] ?? { date: date.value })
const phase = computed(() => model.value.phases.get(date.value))

const mode = ref<'one' | 'many'>('one')
const MOOD = SCALES[0]!.words
const ENERGY = SCALES[1]!.words
const FLOWS: Flow[] = ['none', 'spotting', 'light', 'medium', 'heavy']

function set<K extends keyof DayRecord>(key: K, value: DayRecord[K]) {
  // Clicking the selected value again clears it.
  upsertDay(date.value, { [key]: day.value[key] === value ? undefined : value })
}

function toggleSymptom(s: string) {
  const cur = new Set(day.value.symptoms ?? [])
  if (cur.has(s)) cur.delete(s)
  else cur.add(s)
  upsertDay(date.value, { symptoms: [...cur] })
}

const garmin = computed(() => METRICS.filter((m) => m.source === 'garmin' && typeof day.value[m.key] === 'number'))

const recent = computed(() =>
  Array.from({ length: 14 }, (_, i) => addDays(today, -i)).map((d) => ({ date: d, rec: state.days[d], phase: model.value.phases.get(d)?.phase })),
)
</script>

<template>
  <div class="mode seg" role="group" aria-label="Logging mode">
    <button :aria-pressed="mode === 'one'" @click="mode = 'one'">One day</button>
    <button :aria-pressed="mode === 'many'" @click="mode = 'many'">Many days (catch up)</button>
  </div>
  <BackfillTable
    v-if="mode === 'many'"
    @open="
      (d: string) => {
        date = d
        mode = 'one'
      }
    "
  />
  <div v-else class="log">
    <section class="card stack">
      <div class="card-head" style="margin-bottom: 0">
        <div>
          <h2>{{ date === today ? 'How are you today?' : longDate(date) }}</h2>
          <p class="sub" style="display: flex; align-items: center; gap: 6px">
            <template v-if="phase"><span class="phase-dot" :class="'phase-' + phase.phase" /> Day {{ phase.cycleDay }} · {{ PHASE_LABEL[phase.phase] }}</template>
            <template v-else>No cycle data for this day yet</template>
          </p>
        </div>
        <div style="display: flex; gap: 6px; align-items: center">
          <button class="btn" aria-label="Previous day" @click="date = addDays(date, -1)">←</button>
          <input v-model="date" type="date" :max="today" aria-label="Date" />
          <button class="btn" aria-label="Next day" :disabled="date >= today" @click="date = addDays(date, 1)">→</button>
        </div>
      </div>

      <fieldset v-for="sc in SCALES" :key="sc.key">
        <legend>{{ sc.label }}</legend>
        <div class="scale">
          <button v-for="(w, i) in sc.words" :key="w" :aria-pressed="day[sc.key] === i + 1" @click="set(sc.key, i + 1)">
            <span class="n">{{ i + 1 }}</span>{{ w }}
          </button>
        </div>
      </fieldset>

      <fieldset>
        <legend>Bleeding</legend>
        <div class="seg" role="group">
          <button v-for="f in FLOWS" :key="f" :aria-pressed="(day.flow ?? 'none') === f && (f !== 'none' || !!day.flow)" @click="set('flow', f)">
            {{ f[0]!.toUpperCase() + f.slice(1) }}
          </button>
        </div>
        <p class="sub" style="margin-top: 6px">Light, medium or heavy flow after 10+ days without bleeding marks a new period start automatically.</p>
      </fieldset>

      <fieldset>
        <legend>Symptoms</legend>
        <div class="chips">
          <button v-for="s in SYMPTOMS" :key="s" class="chip" :aria-pressed="day.symptoms?.includes(s) ?? false" @click="toggleSymptom(s)">{{ s }}</button>
        </div>
      </fieldset>

      <fieldset>
        <legend>Notes</legend>
        <textarea
          :value="day.notes ?? ''"
          rows="3"
          style="width: 100%"
          placeholder="Anything that might matter: a hard day at work, alcohol, travel, a great workout…"
          @change="upsertDay(date, { notes: ($event.target as HTMLTextAreaElement).value || undefined })"
        />
      </fieldset>

      <div v-if="garmin.length">
        <h3 style="margin-bottom: 6px">From Garmin</h3>
        <div class="garmin">
          <div v-for="m in garmin" :key="m.key">
            <div class="sub">{{ m.short }}</div>
            <div class="v">{{ fmt(m.key, day[m.key] as number) }}</div>
          </div>
        </div>
      </div>
      <p class="sub">Saved automatically on this device.</p>
    </section>

    <section class="card">
      <h2 style="margin-bottom: 10px">Last two weeks</h2>
      <ul class="recent">
        <li v-for="r in recent" :key="r.date">
          <button :aria-current="r.date === date" @click="date = r.date">
            <span class="phase-dot" :class="r.phase ? 'phase-' + r.phase : ''" :style="r.phase ? '' : 'background: var(--surface-2)'" />
            <span>{{ longDate(r.date) }}</span>
            <span class="sub" style="margin-left: auto">
              {{ r.rec?.mood ? MOOD[r.rec.mood - 1] : '—' }}
              <template v-if="r.rec?.energy"> · {{ ENERGY[r.rec.energy - 1] }}</template>
            </span>
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.mode {
  margin-bottom: 16px;
}
.log {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}
@media (max-width: 860px) {
  .log {
    grid-template-columns: minmax(0, 1fr);
  }
}
fieldset {
  border: 0;
  padding: 0;
  margin: 0;
}
legend {
  font-weight: 600;
  margin-bottom: 8px;
}
.scale {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
}
.scale button {
  border: 1px solid var(--border);
  background: var(--surface-1);
  border-radius: 10px;
  padding: 10px 4px;
  font-size: 13px;
  display: grid;
  gap: 2px;
  justify-items: center;
  color: var(--text-secondary);
}
.scale .n {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}
.scale button[aria-pressed='true'],
.chip[aria-pressed='true'] {
  background: var(--text-primary);
  color: var(--surface-1);
  border-color: transparent;
}
.scale button[aria-pressed='true'] .n {
  color: var(--surface-1);
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  border: 1px solid var(--border);
  background: var(--surface-1);
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 13px;
}
.garmin {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 8px;
}
.garmin > div {
  background: var(--surface-2);
  border-radius: 8px;
  padding: 8px 10px;
}
.garmin .v {
  font-weight: 600;
}
.recent {
  list-style: none;
  padding: 0;
  margin: 0;
}
.recent button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 0;
  background: transparent;
  padding: 8px 6px;
  border-radius: 8px;
  text-align: left;
  font-size: 14px;
}
.recent button:hover,
.recent button[aria-current='true'] {
  background: var(--surface-2);
}
</style>
