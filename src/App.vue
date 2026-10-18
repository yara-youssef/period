<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import LogoMark from './components/LogoMark.vue'
import CyclesView from './views/CyclesView.vue'
import DashboardView from './views/DashboardView.vue'
import ImportView from './views/ImportView.vue'
import InfoView from './views/InfoView.vue'
import LogView from './views/LogView.vue'

const TABS = [
  { key: 'dashboard', label: 'Dashboard', short: 'Dashboard' },
  { key: 'log', label: 'Log today', short: 'Log' },
  { key: 'cycles', label: 'Cycles', short: 'Cycles' },
  { key: 'info', label: 'Information', short: 'Info' },
  { key: 'import', label: 'Import & data', short: 'Data' },
] as const
type Tab = (typeof TABS)[number]['key']

const fromHash = () => (TABS.find((t) => '#' + t.key === location.hash)?.key ?? 'dashboard') as Tab
const tab = ref<Tab>(fromHash())
window.addEventListener('hashchange', () => (tab.value = fromHash()))
function go(t: string) {
  location.hash = t
}

type Theme = 'system' | 'light' | 'dark'
const readTheme = (): Theme => {
  try {
    return (localStorage.getItem('cycle-insights:theme') as Theme) || 'system'
  } catch {
    return 'system'
  }
}
const theme = ref<Theme>(readTheme())
watchEffect(() => {
  if (theme.value === 'system') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', theme.value)
  try {
    localStorage.setItem('cycle-insights:theme', theme.value)
  } catch {
    // Theme still applies for this visit.
  }
})
const nextTheme = () => (theme.value = theme.value === 'system' ? 'dark' : theme.value === 'dark' ? 'light' : 'system')
</script>

<template>
  <header class="top">
    <div class="brand">
      <LogoMark />
      <h1>Cycle Insights</h1>
    </div>
    <nav aria-label="Sections">
      <a v-for="t in TABS" :key="t.key" :href="'#' + t.key" :aria-current="tab === t.key ? 'page' : undefined">
        <span class="long">{{ t.label }}</span><span class="short">{{ t.short }}</span>
      </a>
    </nav>
    <button class="btn theme" :aria-label="`Theme: ${theme}`" :title="`Theme: ${theme}`" @click="nextTheme">
      {{ theme === 'system' ? 'Auto' : theme === 'dark' ? 'Dark' : 'Light' }}
    </button>
  </header>
  <main>
    <DashboardView v-if="tab === 'dashboard'" @go="go" />
    <LogView v-else-if="tab === 'log'" />
    <CyclesView v-else-if="tab === 'cycles'" />
    <InfoView v-else-if="tab === 'info'" />
    <ImportView v-else @go="go" />
  </main>
  <footer class="sub">Your data stays in this browser. Patterns shown are correlations in your own data, not medical advice.</footer>
</template>

<style scoped>
.top {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 12px max(16px, calc((100vw - 1200px) / 2));
  background: var(--page);
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}
.brand h1 {
  font-size: 18px;
}
nav {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  flex: 1;
}
nav a {
  text-decoration: none;
  color: var(--text-secondary);
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 14px;
  white-space: nowrap;
}
nav a:hover {
  background: var(--surface-2);
}
nav a[aria-current='page'] {
  background: var(--surface-2);
  color: var(--text-primary);
  font-weight: 600;
}
.theme {
  font-size: 13px;
  padding: 5px 10px;
}
main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px 16px 32px;
}
footer {
  text-align: center;
  padding: 0 16px 32px;
}
.short {
  display: none;
}
.top {
  padding-top: max(12px, env(safe-area-inset-top));
}
@media (max-width: 640px) {
  /* Tabs move to a bottom bar, within thumb reach. */
  nav {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    justify-content: space-around;
    gap: 0;
    padding: 6px 4px max(6px, env(safe-area-inset-bottom));
    background: var(--page);
    border-top: 1px solid var(--border);
  }
  nav a {
    flex: 1;
    text-align: center;
    padding: 10px 2px;
    font-size: 13px;
  }
  .long {
    display: none;
  }
  .short {
    display: inline;
  }
  .brand {
    flex: 1;
  }
  main {
    padding-bottom: 24px;
  }
  footer {
    padding-bottom: calc(80px + env(safe-area-inset-bottom));
  }
}
</style>
