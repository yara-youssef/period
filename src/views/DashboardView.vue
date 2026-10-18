<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import DriversCard from '@/components/DriversCard.vue'
import HeatmapCard from '@/components/HeatmapCard.vue'
import InsightsCard from '@/components/InsightsCard.vue'
import NowCard from '@/components/NowCard.vue'
import PhaseTable from '@/components/PhaseTable.vue'
import ProfileCard from '@/components/ProfileCard.vue'
import TimelineCard from '@/components/TimelineCard.vue'
import type { MetricKey } from '@/lib/types'
import { availableMetrics, state, weeklyMetrics } from '@/store'

const profileMetric = ref<MetricKey>('mood')
const timelineMetric = ref<MetricKey>('sleepMinutes')
const heatMetric = ref<MetricKey>('mood')

// Fall back to whatever is available when the preferred metric has no data.
watchEffect(() => {
  const keys = availableMetrics.value.map((m) => m.key)
  const first = keys[0]
  if (!first) return
  for (const r of [profileMetric, timelineMetric, heatMetric]) if (!keys.includes(r.value)) r.value = first
})

const emit = defineEmits<{ go: [tab: string] }>()
</script>

<template>
  <div class="stack">
    <div v-if="!Object.keys(state.days).length" class="card empty">
      <h2>Start by bringing in your data</h2>
      <p class="sub">Import your Garmin export, log your period starts, then log mood and energy each day. Or load demo data to explore first.</p>
      <div style="display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap">
        <button class="btn primary" @click="emit('go', 'import')">Import data</button>
        <button class="btn" @click="emit('go', 'cycles')">Add period dates</button>
      </div>
    </div>
    <div v-if="state.demo" class="card demo-note sub">You're looking at demo data. Clear it under Import &amp; data when you're ready to use your own.</div>

    <div v-if="weeklyMetrics.length" class="card demo-note sub">
      {{ weeklyMetrics.map((m) => m.label).join(', ') }}
      {{ weeklyMetrics.length === 1 ? 'comes' : 'come' }} from weekly summaries, so phase differences look smaller than they really are, and they're left out of
      "what helps". Import daily data (your Garmin export, or 4-week CSVs) to sharpen them.
    </div>

    <NowCard />
    <div class="grid-2">
      <InsightsCard />
    </div>
    <template v-if="availableMetrics.length">
      <ProfileCard v-model:metric="profileMetric" />
      <PhaseTable />
      <div class="grid-2">
        <DriversCard />
        <HeatmapCard v-model:metric="heatMetric" />
      </div>
      <TimelineCard v-model:metric="timelineMetric" />
    </template>
  </div>
</template>

<style scoped>
.grid-2 {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}
@media (max-width: 960px) {
  .grid-2 {
    grid-template-columns: minmax(0, 1fr);
  }
}
.demo-note {
  padding: 10px 16px;
  background: var(--surface-2);
}
</style>
