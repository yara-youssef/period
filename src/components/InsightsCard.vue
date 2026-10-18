<script setup lang="ts">
import { computed, ref } from 'vue'
import { insights } from '@/store'
import type { Insight } from '@/lib/stats'

// The same habit often helps both mood and energy; show it once with both reasons.
const actions = computed(() => {
  const byAction = new Map<string, { action: string; reasons: string[] }>()
  for (const i of insights.value) {
    if (!i.action) continue
    const entry = byAction.get(i.action) ?? { action: i.action, reasons: [] }
    entry.reasons.push(i.title)
    byAction.set(i.action, entry)
  }
  return [...byAction.values()].slice(0, 4)
})

const FILTERS: { key: Insight['kind'] | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'phase', label: 'Luteal changes' },
  { key: 'timing', label: 'Timing' },
  { key: 'driver', label: 'What helps' },
  { key: 'symptom', label: 'Symptoms' },
]
const filter = ref<Insight['kind'] | 'all'>('all')
const showAll = ref(false)
const list = computed(() => insights.value.filter((i) => filter.value === 'all' || i.kind === filter.value))
const shown = computed(() => (showAll.value ? list.value : list.value.slice(0, 6)))

const ICON = { good: '↑', bad: '↓', neutral: '•' } as const
</script>

<template>
  <section class="card">
    <div class="card-head">
      <div>
        <h2>What to try in your luteal phase</h2>
        <p class="sub">Habits that went with better luteal days in your own data.</p>
      </div>
    </div>
    <ol v-if="actions.length" class="actions">
      <li v-for="a in actions" :key="a.action">
        <strong>{{ a.action }}</strong>
        <span v-for="r in a.reasons" :key="r" class="sub" style="display: block">{{ r }}.</span>
      </li>
    </ol>
    <p v-else class="sub">
      Once you have mood or energy logged for about 10 luteal days alongside Garmin data, this lists the sleep and movement habits that go with your
      better days.
    </p>
  </section>

  <section class="card">
    <div class="card-head">
      <div>
        <h2>Findings</h2>
        <p class="sub">Ranked by how strong the pattern is. Correlations in your data, not medical advice.</p>
      </div>
      <div class="seg" role="group" aria-label="Filter findings">
        <button v-for="f in FILTERS" :key="f.key" :aria-pressed="filter === f.key" @click="filter = f.key">{{ f.label }}</button>
      </div>
    </div>
    <ul class="findings">
      <li v-for="i in shown" :key="i.id">
        <span class="icon" :class="i.tone" :aria-label="i.tone === 'bad' ? 'harder' : i.tone === 'good' ? 'better' : ''">{{ ICON[i.tone] }}</span>
        <div>
          <div class="title">{{ i.title }}</div>
          <div class="sub">{{ i.detail }}</div>
        </div>
      </li>
      <li v-if="!list.length" class="sub">Nothing to report yet. More logged days make the patterns clearer.</li>
    </ul>
    <button v-if="list.length > 6" class="btn" style="margin-top: 10px" @click="showAll = !showAll">
      {{ showAll ? 'Show fewer' : `Show all ${list.length}` }}
    </button>
  </section>
</template>

<style scoped>
.actions {
  margin: 0;
  padding-left: 20px;
  display: grid;
  gap: 10px;
}
.actions li strong {
  display: block;
  font-weight: 600;
}
.findings {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 2px;
}
.findings li {
  display: flex;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--grid);
}
.findings li:last-child {
  border-bottom: 0;
}
.title {
  font-weight: 600;
}
.icon {
  flex: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: inline-grid;
  place-items: center;
  font-size: 13px;
  font-weight: 700;
  background: var(--surface-2);
  color: var(--text-secondary);
}
.icon.good {
  color: var(--good);
}
.icon.bad {
  color: var(--bad);
}
</style>
