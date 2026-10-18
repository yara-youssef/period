<script setup lang="ts">
import { computed, ref } from 'vue'
import { todayISO } from '@/lib/dates'
import { BOOKS, DISAGREEMENTS, GUIDES, TOPICS, guideKeyFor, type GuideKey, type Ref, type Topic } from '@/lib/guidance'
import { insights, model } from '@/store'

const now = computed(() => model.value.phases.get(todayISO()) ?? null)

const currentKey = computed(() => guideKeyFor(now.value))

const selected = ref<GuideKey>(currentKey.value ?? 'luteal-late')
const topic = ref<Topic | 'all'>('all')

const guide = computed(() => GUIDES.find((g) => g.key === selected.value)!)
const groups = computed(() =>
  TOPICS.filter((t) => topic.value === 'all' || t.key === topic.value)
    .map((t) => ({ ...t, recs: guide.value.recs.filter((r) => r.topic === t.key) }))
    .filter((g) => g.recs.length),
)
const disagreements = computed(() => DISAGREEMENTS.filter((d) => d.phases.includes(selected.value)))

// What the user's own data says, shown beside the books for the luteal phase.
const personal = computed(() => {
  if (guide.value.phase !== 'luteal') return []
  // The same habit can help several scales; list it once with all its reasons.
  const byAction = new Map<string, string[]>()
  for (const i of insights.value) if (i.action) byAction.set(i.action, [...(byAction.get(i.action) ?? []), i.title])
  return [...byAction].slice(0, 3).map(([action, reasons]) => ({ action, reasons }))
})

function cite(r: Ref) {
  return `${r.where}, p. ${r.pages}`
}
</script>

<template>
  <div class="stack">
    <section class="card">
      <h2>What the books recommend, phase by phase</h2>
      <p class="sub" style="margin: 4px 0 14px">
        Recommendations from <em>{{ BOOKS.vitti.title }}</em> ({{ BOOKS.vitti.author }}) and <em>{{ BOOKS.pelz.title }}</em> ({{ BOOKS.pelz.author }}), paraphrased
        with chapter and page for each. The luteal phase is split in two because both books treat its halves differently.
        <template v-if="currentKey">Today you're in the <strong>{{ GUIDES.find((g) => g.key === currentKey)!.label.toLowerCase() }}</strong> phase.</template>
      </p>
      <div class="seg phases" role="group" aria-label="Phase">
        <button v-for="g in GUIDES" :key="g.key" :aria-pressed="selected === g.key" @click="selected = g.key">
          <span class="phase-dot" :class="'phase-' + g.phase" />
          {{ g.label }}
          <span v-if="g.key === currentKey" class="now-tag">now</span>
        </button>
      </div>
    </section>

    <section class="card">
      <div class="card-head">
        <div>
          <h2 style="display: flex; align-items: center; gap: 8px">
            <span class="phase-dot" :class="'phase-' + guide.phase" />{{ guide.label }}
          </h2>
          <p class="sub">{{ guide.when }}</p>
          <p class="sub names">
            <span v-for="(name, book) in guide.names" :key="book">{{ BOOKS[book].short }} calls it <strong>{{ name }}</strong></span>
          </p>
        </div>
        <div class="seg" role="group" aria-label="Topic">
          <button :aria-pressed="topic === 'all'" @click="topic = 'all'">All</button>
          <button v-for="t in TOPICS" :key="t.key" :aria-pressed="topic === t.key" @click="topic = t.key">{{ t.label }}</button>
        </div>
      </div>
      <p style="max-width: 70ch">{{ guide.overview }}</p>

      <div v-if="topic === 'all' && guide.agree.length" class="agree">
        <h3>Where both books agree</h3>
        <ul>
          <li v-for="a in guide.agree" :key="a.text">
            {{ a.text }}
            <span class="cite">
              <template v-for="(r, i) in a.refs" :key="i">{{ i ? ' · ' : '' }}{{ BOOKS[r.book].short }}, {{ cite(r) }}</template>
            </span>
          </li>
        </ul>
      </div>

      <div v-for="g in groups" :key="g.key" class="topic">
        <h3>{{ g.label }}</h3>
        <ul>
          <li v-for="r in g.recs" :key="r.text">
            <span class="book" :class="r.ref.book" :title="`${BOOKS[r.ref.book].author}, ${BOOKS[r.ref.book].title}`">{{ BOOKS[r.ref.book].short }}</span>
            <div>
              {{ r.text }}
              <span class="cite"><em>{{ BOOKS[r.ref.book].title }}</em>, {{ cite(r.ref) }}</span>
            </div>
          </li>
        </ul>
      </div>
      <p v-if="!groups.length" class="sub" style="margin-top: 12px">Neither book has specific advice on this topic for this phase.</p>

      <div v-if="personal.length && (topic === 'all' || topic === 'movement' || topic === 'mind')" class="mine">
        <h3>And in your own data</h3>
        <p class="sub" style="margin-bottom: 6px">From the dashboard: habits that went with your better luteal days.</p>
        <ul>
          <li v-for="p in personal" :key="p.action">
            <strong>{{ p.action }}</strong> <span class="sub">{{ p.reasons.join('. ') }}.</span>
          </li>
        </ul>
      </div>
    </section>

    <section v-if="disagreements.length" class="card">
      <h2>Where the books disagree</h2>
      <div v-for="d in disagreements" :key="d.topic" class="disagree">
        <h3>{{ d.topic }}</h3>
        <div class="sides">
          <div v-for="s in d.sides" :key="s.book">
            <span class="book" :class="s.book">{{ BOOKS[s.book].short }}</span>
            <p>{{ s.text }}</p>
            <span class="cite"><em>{{ BOOKS[s.book].title }}</em>, {{ cite(s.ref) }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="card">
      <h2>Sources</h2>
      <ul class="sources">
        <li v-for="b in BOOKS" :key="b.id">
          <span class="book" :class="b.id">{{ b.short }}</span>
          <div>
            {{ b.author }}. <em>{{ b.title }}</em>. {{ b.details }}.
            <div class="sub">{{ b.phaseModel }}</div>
          </div>
        </li>
      </ul>
      <p class="sub" style="margin-top: 12px">
        Page numbers refer to the ebook (PDF) editions the recommendations were taken from and may not match the printed books. These are the authors'
        recommendations, paraphrased; they aren't medical advice. Check anything significant (fasting, supplements, cutting out foods) with a doctor, and use
        the dashboard to see what actually helps you.
      </p>
    </section>
  </div>
</template>

<style scoped>
.phases {
  flex-wrap: wrap;
}
.phases button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.now-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--text-primary);
  color: var(--surface-1);
}
.names {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin-top: 2px;
}
h3 {
  margin: 18px 0 8px;
}
ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}
.topic li,
.sources li {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.agree,
.mine {
  margin-top: 16px;
  padding: 4px 16px 14px;
  border-radius: 10px;
  background: var(--surface-2);
}
.agree li {
  padding-left: 14px;
  position: relative;
}
.agree li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: var(--good);
  font-weight: 700;
  font-size: 12px;
}
.cite {
  display: block;
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}
.book {
  flex: none;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  background: var(--surface-1);
  min-width: 44px;
  text-align: center;
  margin-top: 1px;
}
.sides {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.sides > div {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 14px;
}
.sides p {
  margin: 8px 0 4px;
}
@media (max-width: 700px) {
  .sides {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
