import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

/** Tracks an element's content width so SVG charts can lay out in real pixels. */
export function useWidth(el: Ref<HTMLElement | null>, fallback = 600) {
  const width = ref(fallback)
  let ro: ResizeObserver | null = null
  onMounted(() => {
    if (!el.value) return
    width.value = el.value.clientWidth || fallback
    ro = new ResizeObserver(([entry]) => {
      if (entry) width.value = Math.max(240, Math.floor(entry.contentRect.width))
    })
    ro.observe(el.value)
  })
  onBeforeUnmount(() => ro?.disconnect())
  return width
}

export function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) return [min]
  const span = max - min
  const step0 = span / count
  const mag = 10 ** Math.floor(Math.log10(step0))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) ?? step0
  const ticks: number[] = []
  for (let t = Math.ceil(min / step) * step; t <= max + 1e-9; t += step) ticks.push(Number(t.toFixed(10)))
  return ticks
}

export function compact(v: number): string {
  if (Math.abs(v) >= 1000) return `${+(v / 1000).toFixed(1)}K`
  return String(+v.toFixed(1))
}
