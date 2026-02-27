<template>
  <div class="vf-node" :class="{ selected }">
    <Handle type="target" :position="Position.Top" id="input" />

    <div class="node-header" :style="{ background: 'var(--c-condswitch)' }">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="17 1 21 5 17 9"/>
        <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
        <polyline points="7 23 3 19 7 15"/>
        <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
      </svg>
      Switch
    </div>

    <div class="node-body">
      <div class="switch-var">{{ data.variable || '?' }}</div>

      <div class="cases">
        <div v-for="(c, i) in displayCases" :key="c.id" class="case-row">
          <span class="case-op">{{ c.operator }}</span>
          <span class="case-val">{{ c.value !== '' && c.value !== undefined ? String(c.value) : '?' }}</span>
          <span v-if="c.label" class="case-label">{{ clip(c.label, 12) }}</span>
        </div>
        <div v-if="data.cases.length > maxDisplay" class="more-hint">
          +{{ data.cases.length - maxDisplay }} more
        </div>
        <div v-if="data.hasDefault" class="case-row case-default">
          <span class="case-op">default</span>
        </div>
      </div>
    </div>

    <!-- One handle per case -->
    <Handle
      v-for="(c, i) in data.cases"
      :key="`h-${c.id}`"
      type="source"
      :position="Position.Right"
      :id="`case-${c.id}`"
      :style="handleStyle(i, totalHandles)"
    />
    <!-- Default handle -->
    <Handle
      v-if="data.hasDefault"
      type="source"
      :position="Position.Right"
      id="default"
      :style="handleStyle(data.cases.length, totalHandles)"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'

const props = defineProps({
  id: String,
  data: { type: Object, default: () => ({ variable: '', cases: [], hasDefault: true }) },
  selected: Boolean
})

const maxDisplay = 4
const displayCases = computed(() => props.data.cases.slice(0, maxDisplay))
const totalHandles = computed(() =>
  props.data.cases.length + (props.data.hasDefault ? 1 : 0)
)

function handleStyle(index, total) {
  const pct = ((index + 1) / (total + 1)) * 100
  return { top: `${pct}%`, right: '-6px', transform: 'translateY(-50%)' }
}

function clip(text, max) {
  return text.length > max ? text.slice(0, max) + '…' : text
}
</script>

<style scoped>
.switch-var {
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  font-size: 13px;
  font-weight: 700;
  color: #c4b5fd;
  padding: 4px 9px 8px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 6px;
}

.cases { display: flex; flex-direction: column; gap: 3px; }

.case-row {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  background: rgba(255,255,255,0.04);
  border-radius: 5px;
  font-size: 11px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
}
.case-default {
  background: rgba(109,40,217,0.15);
  color: #a78bfa;
  font-style: italic;
}

.case-op  { color: #fbbf24; flex-shrink: 0; }
.case-val { color: #86efac; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.case-label {
  font-size: 10px;
  color: var(--text-muted);
  background: rgba(255,255,255,0.06);
  padding: 1px 5px;
  border-radius: 3px;
  flex-shrink: 0;
  font-style: normal;
}

.more-hint {
  font-size: 10px;
  color: var(--text-muted);
  text-align: center;
  padding: 2px 0;
}
</style>
