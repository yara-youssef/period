<script setup lang="ts">
import { computed, ref } from 'vue'
import { useWidth } from '@/composables/useWidth'
import { PHASE_LABEL, fmt } from '@/lib/metrics'
import type { MetricKey, Phase } from '@/lib/types'

export interface HeatCell {
  day: number
  date: string
  value: number | null
  phase: Phase | null
}
export interface HeatRow {
  label: string
  cells: HeatCell[]
}

const props = defineProps<{ rows: HeatRow[]; metric: MetricKey; days: number; title: string }>()

const root = ref<HTMLElement | null>(null)
const width = useWidth(root)
const LEFT = 64
const GAP = 2
const cell = computed(() => Math.max(6, Math.min(22, (width.value - LEFT) / props.days)))
const rowH = computed(() => Math.min(22, Math.max(14, cell.value)))
const height = computed(() => props.rows.length * rowH.value + 26)

const range = computed(() => {
  const vals = props.rows.flatMap((r) => r.cells.map((c) => c.value).filter((v): v is number => v != null))
  if (props.metric === 'mood' || props.metric === 'energy') return [1, 5] as const
  return [Math.min(...vals), Math.max(...vals)] as const
})
// One hue, light to dark: opacity carries magnitude over the surface.
const opacity = (v: number) => {
  const [lo, hi] = range.value
  return 0.12 + 0.88 * ((v - lo) / (hi - lo || 1))
}

const hover = ref<{ r: number; c: number } | null>(null)
const hovered = computed(() => (hover.value ? { row: props.rows[hover.value.r]!, cell: props.rows[hover.value.r]!.cells[hover.value.c]! } : null))
const tipStyle = computed(() => {
  if (!hover.value) return {}
  const x = LEFT + hover.value.c * cell.value
  const top = hover.value.r * rowH.value + rowH.value + 6
  return x > width.value * 0.6 ? { top: `${top}px`, right: `${width.value - x}px` } : { top: `${top}px`, left: `${x}px` }
})
const dayTicks = computed(() => Array.from({ length: props.days }, (_, i) => i + 1).filter((d) => d === 1 || d % 7 === 0))
</script>

<template>
  <div ref="root" class="chart">
    <svg :width="width" :height="height" role="img" :aria-label="title" @pointerleave="hover = null">
      <g v-for="(row, r) in rows" :key="row.label">
        <text :x="LEFT - 8" :y="r * rowH + rowH / 2 + 4" text-anchor="end">{{ row.label }}</text>
        <template v-for="(c, i) in row.cells" :key="c.date">
          <rect
            :x="LEFT + (c.day - 1) * cell + GAP / 2"
            :y="r * rowH + GAP / 2"
            :width="cell - GAP"
            :height="rowH - GAP"
            rx="3"
            :fill="c.value == null ? 'var(--surface-2)' : 'var(--heat)'"
            :fill-opacity="c.value == null ? 1 : opacity(c.value)"
            :stroke="hover && hover.r === r && hover.c === i ? 'var(--text-primary)' : 'none'"
            stroke-width="1.5"
            @pointerenter="hover = { r, c: i }"
          />
        </template>
      </g>
      <text v-for="d in dayTicks" :key="d" :x="LEFT + (d - 0.5) * cell" :y="rows.length * rowH + 16" text-anchor="middle">{{ d }}</text>
    </svg>
    <div class="legend" style="margin-top: 6px">
      <span>Cycle day →</span>
      <span>
        {{ fmt(metric, range[0]) }}
        <svg width="90" height="10" aria-hidden="true">
          <defs>
            <linearGradient id="heat-legend">
              <stop offset="0" stop-color="var(--heat)" stop-opacity="0.12" />
              <stop offset="1" stop-color="var(--heat)" stop-opacity="1" />
            </linearGradient>
          </defs>
          <rect width="90" height="10" rx="3" fill="url(#heat-legend)" />
        </svg>
        {{ fmt(metric, range[1]) }}
      </span>
      <span><svg width="12" height="12" aria-hidden="true"><rect width="12" height="12" rx="3" fill="var(--surface-2)" /></svg> no data</span>
    </div>
    <div v-if="hovered" class="tooltip" :style="tipStyle">
      <div><strong>{{ hovered.cell.date }}</strong> · day {{ hovered.cell.day }}</div>
      <div v-if="hovered.cell.phase" class="sub" style="display: flex; align-items: center; gap: 6px">
        <span class="phase-dot" :class="'phase-' + hovered.cell.phase" />{{ PHASE_LABEL[hovered.cell.phase] }}
      </div>
      <div>{{ fmt(metric, hovered.cell.value) }}</div>
    </div>
  </div>
</template>
