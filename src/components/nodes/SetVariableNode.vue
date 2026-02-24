<template>
  <div class="vf-node" :class="{ selected }">
    <Handle type="target" :position="Position.Top" id="input" />

    <div class="node-header" :style="{ background: 'var(--c-setvar)' }">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="4" y1="9" x2="20" y2="9"/>
        <line x1="4" y1="15" x2="20" y2="15"/>
        <line x1="10" y1="3" x2="8" y2="21"/>
        <line x1="16" y1="3" x2="14" y2="21"/>
      </svg>
      Set Variable
    </div>

    <div class="node-body">
      <div class="setvar-expr">
        <span class="sv-var">{{ data.variable || '?' }}</span>
        <span class="sv-op">{{ opSymbol }}</span>
        <span class="sv-val">{{ displayValue }}</span>
      </div>
    </div>

    <Handle type="source" :position="Position.Bottom" id="output" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'

const props = defineProps({
  id: String,
  data: { type: Object, default: () => ({ variable: '', operation: 'set', value: '' }) },
  selected: Boolean
})

const opSymbol = computed(() => {
  const ops = { set: '=', add: '+=', subtract: '-=', multiply: '*=', toggle: '= !' }
  return ops[props.data.operation] ?? '='
})

const displayValue = computed(() => {
  const v = props.data.value
  if (v === undefined || v === null || v === '') return '?'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return String(v)
})
</script>

<style scoped>
.setvar-expr {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 9px;
  background: rgba(255,255,255,0.04);
  border-radius: 6px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  font-size: 12px;
}
.sv-var { color: #c4b5fd; font-weight: 600; }
.sv-op  { color: #fbbf24; }
.sv-val { color: #86efac; }
</style>
