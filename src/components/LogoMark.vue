<script setup lang="ts">
import type { Phase } from '@/lib/types'

withDefaults(defineProps<{ size?: number }>(), { size: 28 })

// Arc lengths follow a typical 28-day cycle: 5 menstrual, 7 follicular, 3 ovulatory, 13 luteal.
const GAP = 3
const SEGMENTS: [Phase, number][] = [
  ['menstrual', 5],
  ['follicular', 7],
  ['ovulatory', 3],
  ['luteal', 13],
]
let offset = 0
const arcs = SEGMENTS.map(([phase, days]) => {
  const len = (days / 28) * 100
  const arc = { phase, dash: `${len - GAP} ${100 - len + GAP}`, offset: -offset }
  offset += len
  return arc
})
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 28 28" aria-hidden="true">
    <g transform="rotate(-90 14 14)">
      <circle
        v-for="a in arcs"
        :key="a.phase"
        cx="14"
        cy="14"
        r="10.5"
        fill="none"
        :stroke="`var(--ph-${a.phase})`"
        stroke-width="4"
        pathLength="100"
        :stroke-dasharray="a.dash"
        :stroke-dashoffset="a.offset"
      />
    </g>
    <circle cx="14" cy="14" r="3" fill="var(--text-primary)" />
  </svg>
</template>
