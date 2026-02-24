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
      <!-- NOT badge -->
      <div v-if="negate" class="negate-badge">NOT</div>

      <!-- Single condition -->
      <div v-if="conditions.length === 1" class="cond-expr">
        <span class="cond-var">{{ conditions[0].variable || '?' }}</span>
        <span class="cond-op">{{ conditions[0].operator }}</span>
        <span class="cond-val">{{ fmtVal(conditions[0]) }}</span>
      </div>

      <!-- Multiple conditions -->
      <template v-else>
        <template v-for="(cond, i) in displayConditions" :key="i">
          <div class="cond-expr cond-compact">
            <span class="cond-var">{{ cond.variable || '?' }}</span>
            <span class="cond-op">{{ cond.operator }}</span>
            <span class="cond-val">{{ fmtVal(cond) }}</span>
          </div>
          <div v-if="i < displayConditions.length - 1" class="logic-sep">{{ logicLabel }}</div>
        </template>
        <div v-if="conditions.length > maxDisplay" class="more-hint">+{{ conditions.length - maxDisplay }} more</div>
      </template>

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
  data: { type: Object, default: () => ({}) },
  selected: Boolean
})

// Handle both legacy format { variable, operator, value } and new format { logic, negate, conditions }
const conditions = computed(() => {
  if (props.data.conditions?.length) return props.data.conditions
  return [{ variable: props.data.variable || '', operator: props.data.operator || '==', value: props.data.value ?? '' }]
})

const negate = computed(() => props.data.negate || false)
const logicLabel = computed(() => (props.data.logic || 'single') === 'or' ? 'OR' : 'AND')

const maxDisplay = 3
const displayConditions = computed(() => conditions.value.slice(0, maxDisplay))

function fmtVal(cond) {
  const v = cond.value
  if (v === undefined || v === null || v === '') return '?'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return String(v)
}
</script>

<style scoped>
.negate-badge {
  display: inline-block;
  font-size: 9px;
  font-weight: 800;
  padding: 1px 6px;
  background: rgba(255,255,255,0.08);
  color: #e879f9;
  border-radius: 4px;
  letter-spacing: 1px;
  margin-bottom: 5px;
}

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
.cond-compact {
  padding: 4px 8px;
  margin-bottom: 0;
  border-radius: 5px;
}
.cond-var { color: #93c5fd; font-weight: 600; }
.cond-op  { color: #fbbf24; }
.cond-val { color: #86efac; }

.logic-sep {
  text-align: center;
  font-size: 9px;
  font-weight: 800;
  color: var(--text-muted);
  letter-spacing: 1.5px;
  padding: 2px 0;
}

.more-hint {
  font-size: 10px;
  color: var(--text-muted);
  text-align: center;
  padding: 2px 0 4px;
}

.branches { display: flex; flex-direction: column; gap: 3px; margin-top: 8px; }
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
