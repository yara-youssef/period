<script setup lang="ts">
import { computed, ref } from 'vue'
import { LUTEAL_LENGTH, phaseForDay } from '@/lib/cycle'
import { METRIC_BY_KEY } from '@/lib/metrics'
import { cycleProfile } from '@/lib/stats'
import type { MetricKey } from '@/lib/types'
import { joined, model } from '@/store'
import MetricSelect from './MetricSelect.vue'
import PhaseLineChart from './PhaseLineChart.vue'
import type { Slot } from './charts'

const metric = defineModel<MetricKey>('metric', { required: true })
const align = ref<'start' | 'end'>('start')

const slots = computed<Slot[]>(() => {
  const L = model.value.typicalLength
  const P = model.value.typicalPeriod
  const maxDays = align.value === 'start' ? L + 3 : Math.min(L, LUTEAL_LENGTH + 14)
  const pts = new Map(cycleProfile(joined.value, metric.value, align.value, maxDays).map((p) => [p.x, p]))
  const xs = align.value === 'start' ? Array.from({ length: maxDays }, (_, i) => i + 1) : Array.from({ length: maxDays }, (_, i) => i - maxDays)
  return xs.map((x) => {
    const p = pts.get(x)
    const cd = align.value === 'start' ? x : L + 1 + x
    const label = align.value === 'start' ? `Cycle day ${x}` : `${-x} day${x === -1 ? '' : 's'} before period`
    return {
      label,
      tick: align.value === 'start' ? (x === 1 || x % 7 === 0 ? String(x) : undefined) : x % 7 === 0 || x === -1 ? String(x) : undefined,
      phase: cd > L ? 'luteal' : phaseForDay(cd, L, P),
      value: p?.mean ?? null,
      lo: p?.lo,
      hi: p?.hi,
      detail: p ? `Average of ${p.n} cycles` : 'No data',
    }
  })
})
</script>

<template>
  <section class="card">
    <div class="card-head">
      <div>
        <h2>{{ METRIC_BY_KEY[metric].label }} across your cycle</h2>
        <p class="sub">
          Line = your average for each day, shaded band = your middle 50% of days.
          {{ align === 'end' ? 'Lined up on the next period, which is how luteal phases compare best.' : 'Lined up on the first day of your period.' }}
        </p>
      </div>
      <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center">
        <MetricSelect v-model="metric" />
        <div class="seg" role="group" aria-label="Align cycles">
          <button :aria-pressed="align === 'start'" @click="align = 'start'">From period start</button>
          <button :aria-pressed="align === 'end'" @click="align = 'end'">Before next period</button>
        </div>
      </div>
    </div>
    <PhaseLineChart :slots="slots" :metric="metric" band :title="`${METRIC_BY_KEY[metric].label} averaged by cycle day`" />
  </section>
</template>
