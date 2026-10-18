<script setup lang="ts">
import { computed } from 'vue'
import { PHASES, PHASE_LABEL, fmt, fmtDelta } from '@/lib/metrics'
import { phaseStats } from '@/lib/stats'
import { availableMetrics, joined } from '@/store'

const rows = computed(() =>
  availableMetrics.value.map((m) => {
    const s = phaseStats(joined.value, m.key)
    const means = PHASES.map((p) => s[p].mean).filter((v): v is number => v != null)
    const best = m.higherIsBetter == null || !means.length ? null : m.higherIsBetter ? Math.max(...means) : Math.min(...means)
    const worst = m.higherIsBetter == null || !means.length ? null : m.higherIsBetter ? Math.min(...means) : Math.max(...means)
    const delta = s.luteal.mean != null && s.follicular.mean != null ? s.luteal.mean - s.follicular.mean : null
    const worse = delta == null || m.higherIsBetter == null || Math.abs(delta) < m.meaningful / 2 ? null : m.higherIsBetter ? delta < 0 : delta > 0
    return { m, s, best, worst, delta, worse }
  }),
)
</script>

<template>
  <section class="card">
    <div class="card-head">
      <div>
        <h2>Every metric, phase by phase</h2>
        <p class="sub">Averages across all your logged cycles. ▲ best phase, ▼ hardest phase.</p>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th v-for="p in PHASES" :key="p" class="num">
              <span style="display: inline-flex; align-items: center; gap: 6px"><span class="phase-dot" :class="'phase-' + p" />{{ PHASE_LABEL[p] }}</span>
            </th>
            <th class="num">Luteal vs follicular</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.m.key">
            <td>{{ r.m.label }}</td>
            <td v-for="p in PHASES" :key="p" class="num" :title="`${r.s[p].n} days`">
              {{ fmt(r.m.key, r.s[p].mean) }}
              <span v-if="r.s[p].mean != null && r.s[p].mean === r.best" class="mark" aria-label="best phase">▲</span>
              <span v-else-if="r.s[p].mean != null && r.s[p].mean === r.worst" class="mark" aria-label="hardest phase">▼</span>
            </td>
            <td class="num" :class="{ bad: r.worse === true, good: r.worse === false }">
              {{ r.delta == null ? '–' : fmtDelta(r.m.key, r.delta) }}
            </td>
          </tr>
          <tr v-if="!rows.length">
            <td colspan="6" class="muted">Import Garmin data or log a few days to fill this in.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.mark {
  color: var(--text-muted);
  font-size: 10px;
  margin-left: 2px;
}
.bad {
  color: var(--bad);
  font-weight: 600;
}
.good {
  color: var(--good);
  font-weight: 600;
}
</style>
