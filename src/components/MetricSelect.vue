<script setup lang="ts">
import { availableMetrics } from '@/store'
import type { MetricKey } from '@/lib/types'

const model = defineModel<MetricKey>({ required: true })
defineProps<{ label?: string }>()
</script>

<template>
  <label class="sub" style="display: inline-flex; align-items: center; gap: 8px">
    <span>{{ label ?? 'Metric' }}</span>
    <select v-model="model">
      <option v-for="m in availableMetrics" :key="m.key" :value="m.key">{{ m.label }}</option>
    </select>
  </label>
</template>
