<script setup lang="ts">
import { computed, ref } from 'vue'
import { METRIC_BY_KEY, PHASE_LABEL, fmt } from '@/lib/metrics'
import { driverAnalysis } from '@/lib/stats'
import type { Phase } from '@/lib/types'
import { dayMap, joined } from '@/store'

const scope = ref<Phase | null>('luteal')
const outcome = ref<'mood' | 'energy'>('mood')

const rows = computed(() =>
  driverAnalysis(joined.value, dayMap.value, scope.value)
    .filter((d) => d.outcome === outcome.value)
    .map((d) => {
      const def = METRIC_BY_KEY[d.driver.key]
      return {
        id: d.driver.key + d.driver.lag,
        name: `${def.label}${d.driver.lag ? ' (day before)' : ''}`,
        split: `${def.format(d.threshold)}${def.unit}`,
        high: d.highMean,
        low: d.lowMean,
        r: d.r,
        n: d.n,
      }
    }),
)

function strength(r: number) {
  const a = Math.abs(r)
  return a >= 0.5 ? 'strong' : a >= 0.3 ? 'moderate' : a >= 0.15 ? 'weak' : 'none'
}
</script>

<template>
  <section class="card">
    <div class="card-head">
      <div>
        <h2>What moves your {{ outcome }}</h2>
        <p class="sub">Each row splits your days at the middle value of that metric and compares {{ outcome }} above vs below it.</p>
      </div>
      <div style="display: flex; gap: 10px; flex-wrap: wrap">
        <div class="seg" role="group" aria-label="Outcome">
          <button :aria-pressed="outcome === 'mood'" @click="outcome = 'mood'">Mood</button>
          <button :aria-pressed="outcome === 'energy'" @click="outcome = 'energy'">Energy</button>
        </div>
        <div class="seg" role="group" aria-label="Days included">
          <button :aria-pressed="scope === 'luteal'" @click="scope = 'luteal'">{{ PHASE_LABEL.luteal }} days</button>
          <button :aria-pressed="scope === null" @click="scope = null">All days</button>
        </div>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th class="num">Split at</th>
            <th class="num">{{ outcome }} when higher</th>
            <th class="num">when lower</th>
            <th>Link</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td>{{ r.name }}</td>
            <td class="num">{{ r.split }}</td>
            <td class="num" :class="{ em: r.high > r.low }">{{ fmt(outcome, r.high) }}</td>
            <td class="num" :class="{ em: r.low > r.high }">{{ fmt(outcome, r.low) }}</td>
            <td style="white-space: nowrap">
              <span class="rbar" aria-hidden="true">
                <span class="rfill" :style="{ width: Math.min(100, Math.abs(r.r) * 100) + '%', marginLeft: r.r < 0 ? 'auto' : undefined }" />
              </span>
              <span class="sub">{{ strength(r.r) }} {{ r.r >= 0 ? '+' : '−' }}{{ Math.abs(r.r).toFixed(2) }}</span>
            </td>
          </tr>
          <tr v-if="!rows.length">
            <td colspan="5" class="muted">Needs at least 10 days with both {{ outcome }} and Garmin data{{ scope ? ' in the luteal phase' : '' }}.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.em {
  font-weight: 600;
}
.rbar {
  display: inline-flex;
  width: 60px;
  height: 6px;
  border-radius: 3px;
  background: var(--surface-2);
  margin-right: 8px;
  vertical-align: middle;
  overflow: hidden;
}
.rfill {
  display: block;
  height: 100%;
  background: var(--text-secondary);
  border-radius: 3px;
}
</style>
