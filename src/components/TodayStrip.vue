<script setup lang="ts">
import { computed } from 'vue'
import { todayISO } from '@/lib/dates'
import { BOOKS, GUIDES, guideKeyFor } from '@/lib/guidance'
import { SCALES } from '@/lib/metrics'
import { backupDue, daysSinceBackup, model, state } from '@/store'

const today = todayISO()
const rec = computed(() => state.days[today])
const logged = computed(() => SCALES.filter((s) => rec.value?.[s.key] != null))
const guide = computed(() => GUIDES.find((g) => g.key === guideKeyFor(model.value.phases.get(today))) ?? null)

/** Up to three tips: points both books agree on first, then single-book advice on movement, food and work. */
const tips = computed(() => {
  const g = guide.value
  if (!g) return []
  const shared = g.agree.map((a) => ({ text: a.text, by: '' }))
  const single = (['movement', 'food', 'mind'] as const)
    .map((t) => g.recs.find((r) => r.topic === t))
    .filter((r) => r != null)
    .map((r) => ({ text: r.text, by: BOOKS[r.ref.book].short }))
  return [...shared, ...single].slice(0, 3)
})
</script>

<template>
  <div class="today">
    <section class="card log">
      <h3>Today's log</h3>
      <template v-if="logged.length">
        <p class="sub">
          {{ logged.map((s) => `${s.label}: ${s.words[rec![s.key]! - 1]}`).join(' · ') }}
        </p>
        <a class="btn" href="#log">{{ logged.length < SCALES.length ? 'Finish logging' : 'Edit' }}</a>
      </template>
      <template v-else>
        <p class="sub">Nothing logged yet. It takes under a minute, and every day makes the patterns clearer.</p>
        <a class="btn primary" href="#log">Log today</a>
      </template>
    </section>

    <section v-if="guide" class="card tips">
      <h3 style="display: flex; align-items: center; gap: 8px">
        <span class="phase-dot" :class="'phase-' + guide.phase" />From the books, for your {{ guide.label.toLowerCase() }} phase
      </h3>
      <ul>
        <li v-for="t in tips" :key="t.text">
          {{ t.text }} <span v-if="t.by" class="muted">({{ t.by }})</span>
        </li>
      </ul>
      <p class="sub" style="margin-top: 6px">
        <template v-if="tips.some((t) => !t.by)">Unmarked points are ones both books agree on. </template><a href="#info">More, with references →</a>
      </p>
    </section>

    <section v-if="backupDue" class="card backup">
      <h3>Time for a backup</h3>
      <p class="sub">
        Your logs live only in this browser{{ daysSinceBackup == null ? ' and have never been backed up' : `, last backed up ${daysSinceBackup} days ago` }}.
        Clearing site data would erase them.
      </p>
      <a class="btn" href="#import">Download a backup</a>
    </section>
  </div>
</template>

<style scoped>
.today {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  gap: 16px;
  align-items: stretch;
}
.backup {
  grid-column: 1 / -1;
}
h3 {
  margin-bottom: 6px;
}
.btn {
  display: inline-block;
  margin-top: 10px;
  text-decoration: none;
}
ul {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 4px;
}
@media (max-width: 760px) {
  .today {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
