<script setup lang="ts">
import { computed } from 'vue'
import { predictNextPeriod } from '@/lib/cycle'
import { diffDays, longDate, todayISO } from '@/lib/dates'
import { PHASE_LABEL, fmt } from '@/lib/metrics'
import { phaseStats } from '@/lib/stats'
import { joined, model } from '@/store'

const today = todayISO()
const now = computed(() => model.value.phases.get(today) ?? null)
const next = computed(() => predictNextPeriod(model.value))
const daysToNext = computed(() => (next.value ? diffDays(next.value, today) : null))

const PHASE_NOTE = {
  menstrual: 'Energy is often lowest in the first days. Gentle movement and iron-rich food help many people.',
  follicular: 'Rising oestrogen usually brings more energy: a good window for harder training and big tasks.',
  ovulatory: 'Often the peak for energy and sociability.',
  luteal: 'Progesterone rises: body temperature and resting HR go up, sleep can get lighter. Protect sleep and plan recovery.',
} as const

const moodGap = computed(() => {
  const s = phaseStats(joined.value, 'mood')
  if (s.luteal.n < 5 || s.follicular.n < 5) return null
  return { luteal: s.luteal.mean!, follicular: s.follicular.mean! }
})
</script>

<template>
  <section class="card now">
    <div class="hero">
      <template v-if="now">
        <div class="sub">Today · {{ longDate(today) }}</div>
        <div class="hero-row">
          <span class="phase-dot big" :class="'phase-' + now.phase" />
          <span class="hero-value">Day {{ now.cycleDay }}</span>
          <span class="hero-phase">{{ PHASE_LABEL[now.phase] }} phase</span>
        </div>
        <p class="sub" style="max-width: 52ch">{{ PHASE_NOTE[now.phase] }}</p>
      </template>
      <template v-else>
        <div class="sub">Today</div>
        <div class="hero-value" style="font-size: 28px">Log a period start to see your phase</div>
      </template>
    </div>
    <div class="tiles">
      <div class="tile">
        <div class="sub">Next period</div>
        <div class="tile-value">{{ daysToNext == null ? '–' : daysToNext > 0 ? `in ${daysToNext} days` : daysToNext === 0 ? 'today' : `${-daysToNext} days late` }}</div>
        <div class="muted" style="font-size: 13px">{{ next ? longDate(next) : 'not enough data' }}</div>
      </div>
      <div class="tile">
        <div class="sub">Typical cycle</div>
        <div class="tile-value">{{ model.typicalLength }} days</div>
        <div class="muted" style="font-size: 13px">
          {{ model.lengthRange ? `range ${model.lengthRange[0]}–${model.lengthRange[1]} · ${model.cycles.length} cycles` : 'default until 2 cycles are logged' }}
        </div>
      </div>
      <div class="tile">
        <div class="sub">Mood, luteal vs follicular</div>
        <div class="tile-value">{{ moodGap ? `${fmt('mood', moodGap.luteal)} vs ${fmt('mood', moodGap.follicular)}` : '–' }}</div>
        <div class="muted" style="font-size: 13px">{{ moodGap ? 'average of your logged days' : 'log mood for a cycle to see this' }}</div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.now {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 2fr);
  gap: 24px;
  align-items: center;
}
.hero-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
  margin: 4px 0 8px;
}
.hero-value {
  font-size: 48px;
  font-weight: 600;
  line-height: 1.05;
}
.hero-phase {
  font-size: 20px;
  color: var(--text-secondary);
}
.phase-dot.big {
  width: 16px;
  height: 16px;
  align-self: center;
}
.tiles {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.tile {
  background: var(--surface-2);
  border-radius: 10px;
  padding: 12px 14px;
}
.tile-value {
  font-size: 20px;
  font-weight: 600;
  margin: 2px 0;
}
@media (max-width: 860px) {
  .now {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 560px) {
  .tiles {
    grid-template-columns: 1fr;
  }
  .hero-value {
    font-size: 40px;
  }
}
</style>
