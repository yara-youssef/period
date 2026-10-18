<script setup lang="ts">
import { computed, ref } from 'vue'
import { addDays, dateRange, longDate, shortDate, todayISO } from '@/lib/dates'
import { METRIC_BY_KEY } from '@/lib/metrics'
import type { MetricKey } from '@/lib/types'
import { dayMap, model } from '@/store'
import MetricSelect from './MetricSelect.vue'
import PhaseLineChart from './PhaseLineChart.vue'
import type { Slot } from './charts'

const metric = defineModel<MetricKey>('metric', { required: true })
const range = ref(90)
const RANGES = [30, 90, 180, 365]

const slots = computed<Slot[]>(() => {
  const end = todayISO()
  const dates = dateRange(addDays(end, -range.value + 1), end)
  return dates.map((date) => {
    const ph = model.value.phases.get(date)
    const v = dayMap.value.get(date)?.[metric.value]
    const [, , d] = date.split('-')
    return {
      label: longDate(date),
      tick: range.value <= 30 ? (Number(d) % 7 === 1 ? shortDate(date) : undefined) : d === '01' ? shortDate(date) : undefined,
      phase: ph?.phase ?? null,
      value: typeof v === 'number' ? v : null,
      detail: ph ? `Cycle day ${ph.cycleDay}${ph.predicted ? ' (current cycle)' : ''}` : undefined,
    }
  })
})
</script>

<template>
  <section class="card">
    <div class="card-head">
      <div>
        <h2>{{ METRIC_BY_KEY[metric].label }} over time</h2>
        <p class="sub">Each day, with your phases underneath.</p>
      </div>
      <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center">
        <MetricSelect v-model="metric" />
        <div class="seg" role="group" aria-label="Time range">
          <button v-for="r in RANGES" :key="r" :aria-pressed="range === r" @click="range = r">{{ r === 365 ? '1y' : r + 'd' }}</button>
        </div>
      </div>
    </div>
    <PhaseLineChart :slots="slots" :metric="metric" :height="180" :title="`${METRIC_BY_KEY[metric].label}, last ${range} days`" />
  </section>
</template>
