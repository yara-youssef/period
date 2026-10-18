<script setup lang="ts">
import { computed, ref } from 'vue'
import { useWidth } from '@/composables/useWidth'
import { PHASE_LABEL, fmt } from '@/lib/metrics'
import type { MetricKey } from '@/lib/types'
import { axisTicks, domainFor, phaseRuns, type Slot } from './charts'

const props = withDefaults(
  defineProps<{
    slots: Slot[]
    metric: MetricKey
    height?: number
    /** Show an interquartile band from slot.lo/hi. */
    band?: boolean
    title: string
  }>(),
  { height: 220, band: false },
)

const root = ref<HTMLElement | null>(null)
const width = useWidth(root)

const M = { top: 10, right: 12, left: 46 }
const STRIP = 8
const plotH = computed(() => props.height)
const totalH = computed(() => plotH.value + 52)

const plotW = computed(() => Math.max(10, width.value - M.left - M.right))
const step = computed(() => plotW.value / Math.max(1, props.slots.length))
const cx = (i: number) => M.left + step.value * (i + 0.5)

const domain = computed(() => {
  const vals: number[] = []
  for (const s of props.slots) {
    if (s.value != null) vals.push(s.value)
    if (props.band && s.lo != null) vals.push(s.lo)
    if (props.band && s.hi != null) vals.push(s.hi)
  }
  return domainFor(props.metric, vals)
})
const y = (v: number) => {
  const [lo, hi] = domain.value
  return M.top + plotH.value - ((v - lo) / (hi - lo || 1)) * plotH.value
}
const ticks = computed(() => axisTicks(props.metric, domain.value[0], domain.value[1]).filter((t) => t.value >= domain.value[0] - 1e-9 && t.value <= domain.value[1] + 1e-9))

/** Contiguous runs of slots with values, so missing days break the line instead of bridging it. */
const segments = computed(() => {
  const out: number[][] = []
  let cur: number[] = []
  props.slots.forEach((s, i) => {
    if (s.value == null) {
      if (cur.length) out.push(cur)
      cur = []
    } else cur.push(i)
  })
  if (cur.length) out.push(cur)
  return out
})

const linePaths = computed(() => segments.value.map((seg) => seg.map((i, k) => `${k ? 'L' : 'M'}${cx(i).toFixed(1)},${y(props.slots[i]!.value!).toFixed(1)}`).join('')))
const singles = computed(() => segments.value.filter((s) => s.length === 1).map((s) => s[0]!))

const bandPaths = computed(() => {
  if (!props.band) return []
  return segments.value
    .filter((seg) => seg.length > 1)
    .map((seg) => {
      const top = seg.map((i, k) => `${k ? 'L' : 'M'}${cx(i).toFixed(1)},${y(props.slots[i]!.hi ?? props.slots[i]!.value!).toFixed(1)}`).join('')
      const bottom = [...seg].reverse().map((i) => `L${cx(i).toFixed(1)},${y(props.slots[i]!.lo ?? props.slots[i]!.value!).toFixed(1)}`).join('')
      return top + bottom + 'Z'
    })
})

const runs = computed(() => phaseRuns(props.slots))
const stripY = computed(() => M.top + plotH.value + 22)

const xTicks = computed(() => {
  const out: { i: number; label: string }[] = []
  let lastX = -Infinity
  props.slots.forEach((s, i) => {
    if (!s.tick) return
    if (cx(i) - lastX < 34) return
    out.push({ i, label: s.tick })
    lastX = cx(i)
  })
  return out
})

const hover = ref<number | null>(null)
function onMove(e: PointerEvent) {
  const rect = (e.currentTarget as SVGElement).getBoundingClientRect()
  const i = Math.floor((e.clientX - rect.left - M.left) / step.value)
  hover.value = i >= 0 && i < props.slots.length ? i : null
}
function onKey(e: KeyboardEvent) {
  const n = props.slots.length
  if (e.key === 'ArrowRight') hover.value = Math.min(n - 1, (hover.value ?? -1) + 1)
  else if (e.key === 'ArrowLeft') hover.value = Math.max(0, (hover.value ?? n) - 1)
  else return
  e.preventDefault()
}
const hovered = computed(() => (hover.value == null ? null : props.slots[hover.value] ?? null))
const tipStyle = computed(() => {
  if (hover.value == null) return {}
  const x = cx(hover.value)
  const right = x > width.value * 0.6
  return { top: `${M.top}px`, ...(right ? { right: `${width.value - x + 12}px` } : { left: `${x + 12}px` }) }
})
</script>

<template>
  <div ref="root" class="chart">
    <svg
      :width="width"
      :height="totalH"
      role="img"
      :aria-label="title"
      tabindex="0"
      @pointermove="onMove"
      @pointerleave="hover = null"
      @keydown="onKey"
      @blur="hover = null"
    >
      <!-- Faint phase wash behind the plot -->
      <rect
        v-for="r in runs"
        :key="'w' + r.from"
        :x="M.left + r.from * step"
        :y="M.top"
        :width="(r.to - r.from + 1) * step"
        :height="plotH"
        :fill="`var(--ph-${r.phase})`"
        opacity="0.06"
      />

      <g>
        <line v-for="t in ticks" :key="t.value" :x1="M.left" :x2="M.left + plotW" :y1="y(t.value)" :y2="y(t.value)" stroke="var(--grid)" stroke-width="1" />
        <text v-for="t in ticks" :key="'l' + t.value" :x="M.left - 8" :y="y(t.value) + 4" text-anchor="end">{{ t.label }}</text>
      </g>

      <path v-for="(d, k) in bandPaths" :key="'b' + k" :d="d" fill="var(--band)" />
      <path v-for="(d, k) in linePaths" :key="'p' + k" :d="d" fill="none" stroke="var(--ink-line)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
      <circle v-for="i in singles" :key="'s' + i" :cx="cx(i)" :cy="y(slots[i]!.value!)" r="3" fill="var(--ink-line)" />

      <!-- x axis -->
      <text v-for="t in xTicks" :key="'x' + t.i" :x="cx(t.i)" :y="M.top + plotH + 14" text-anchor="middle">{{ t.label }}</text>

      <!-- Phase strip, segments separated by a 2px surface gap and labelled in text -->
      <g>
        <rect
          v-for="r in runs"
          :key="'r' + r.from"
          :x="M.left + r.from * step + 1"
          :y="stripY"
          :width="Math.max(1, (r.to - r.from + 1) * step - 2)"
          :height="STRIP"
          rx="3"
          :fill="`var(--ph-${r.phase})`"
        />
        <template v-for="r in runs" :key="'t' + r.from">
          <text
            v-if="(r.to - r.from + 1) * step > PHASE_LABEL[r.phase].length * 6.4 + 6"
            :x="M.left + ((r.from + r.to + 1) / 2) * step"
            :y="stripY + STRIP + 13"
            text-anchor="middle"
            style="fill: var(--text-secondary)"
          >
            {{ PHASE_LABEL[r.phase] }}
          </text>
        </template>
      </g>

      <!-- Hover layer -->
      <g v-if="hover != null && hovered">
        <line :x1="cx(hover)" :x2="cx(hover)" :y1="M.top" :y2="M.top + plotH" stroke="var(--axis)" stroke-width="1" />
        <circle v-if="hovered.value != null" :cx="cx(hover)" :cy="y(hovered.value)" r="5" fill="var(--ink-line)" stroke="var(--surface-1)" stroke-width="2" />
      </g>
      <rect :x="M.left" :y="0" :width="plotW" :height="totalH" fill="transparent" />
    </svg>

    <div v-if="hovered" class="tooltip" :style="tipStyle">
      <div>
        <strong>{{ hovered.label }}</strong>
      </div>
      <div v-if="hovered.phase" style="display: flex; align-items: center; gap: 6px" class="sub">
        <span class="phase-dot" :class="'phase-' + hovered.phase" />{{ PHASE_LABEL[hovered.phase] }}
      </div>
      <div>{{ fmt(metric, hovered.value) }}</div>
      <div v-if="band && hovered.lo != null && hovered.value != null" class="sub">Middle half: {{ fmt(metric, hovered.lo) }} – {{ fmt(metric, hovered.hi) }}</div>
      <div v-if="hovered.detail" class="sub">{{ hovered.detail }}</div>
    </div>
  </div>
</template>
