<template>
  <div class="vf-node" :class="{ selected }">
    <Handle type="target" :position="Position.Top" id="input" />

    <div class="node-header" :style="{ background: 'var(--c-condition)' }">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
      Condition
    </div>

    <div class="node-body">
      <div class="cond-expr">
        <span class="cond-var">{{ data.variable || '?' }}</span>
        <span class="cond-op">{{ data.operator }}</span>
        <span class="cond-val">{{ displayValue }}</span>
      </div>

      <div class="branches">
        <div class="branch branch-true">✓ True</div>
        <div class="branch branch-false">✗ False</div>
      </div>
    </div>

    <Handle type="source" :position="Position.Right" id="true"
      style="top: 63%; right: -6px; transform: translateY(-50%)" />
    <Handle type="source" :position="Position.Right" id="false"
      style="top: 83%; right: -6px; transform: translateY(-50%)" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'

const props = defineProps({
  id: String,
  data: { type: Object, default: () => ({ variable: '', operator: '==', value: '' }) },
  selected: Boolean
})

const displayValue = computed(() => {
  const v = props.data.value
  if (v === undefined || v === null || v === '') return '?'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return String(v)
})
</script>

<style scoped>
.cond-expr {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 9px;
  background: rgba(255,255,255,0.04);
  border-radius: 6px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  font-size: 12px;
  margin-bottom: 8px;
}
.cond-var { color: #93c5fd; font-weight: 600; }
.cond-op  { color: #fbbf24; }
.cond-val { color: #86efac; }

.branches { display: flex; flex-direction: column; gap: 3px; }
.branch {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  text-align: right;
  font-weight: 500;
}
.branch-true  { background: rgba(5,150,105,0.15); color: #34d399; }
.branch-false { background: rgba(220,38,38,0.15); color: #f87171; }
</style>
