<script setup lang="ts">
import { computed } from 'vue'
import { addDays, shortDate } from '@/lib/dates'
import { METRIC_BY_KEY } from '@/lib/metrics'
import type { MetricKey } from '@/lib/types'
import { dayMap, model } from '@/store'
import CycleHeatmap, { type HeatRow } from './CycleHeatmap.vue'
import MetricSelect from './MetricSelect.vue'

const metric = defineModel<MetricKey>('metric', { required: true })

const data = computed(() => {
  const cycles = model.value.cycles.slice(-12)
  let days = 0
  const rows: HeatRow[] = cycles.map((c) => {
    const len = Math.min(45, c.length ?? model.value.typicalLength)
    days = Math.max(days, len)
    return {
      label: shortDate(c.start),
      cells: Array.from({ length: len }, (_, i) => {
        const date = addDays(c.start, i)
        const v = dayMap.value.get(date)?.[metric.value]
        return { day: i + 1, date, value: typeof v === 'number' ? v : null, phase: model.value.phases.get(date)?.phase ?? null }
      }),
    }
  })
  return { rows: rows.reverse(), days }
})
</script>

<template>
  <section class="card">
    <div class="card-head">
      <div>
        <h2>Cycle by cycle</h2>
        <p class="sub">One row per cycle, newest on top. Shows whether a pattern repeats or was a one-off.</p>
      </div>
      <MetricSelect v-model="metric" />
    </div>
    <CycleHeatmap v-if="data.rows.length" :rows="data.rows" :metric="metric" :days="data.days" :title="`${METRIC_BY_KEY[metric].label} for each day of each cycle`" />
    <p v-else class="sub">Log at least one period start to see this.</p>
  </section>
</template>
