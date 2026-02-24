<template>
  <div class="vf-node" :class="{ selected }">
    <Handle type="target" :position="Position.Top" id="input" />

    <div class="node-header" :style="{ background: 'var(--c-choice)' }">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="16 3 21 3 21 8"/>
        <line x1="4" y1="20" x2="21" y2="3"/>
        <polyline points="21 16 21 21 16 21"/>
        <line x1="15" y1="15" x2="21" y2="21"/>
      </svg>
      Choice
    </div>

    <div class="node-body">
      <div class="node-preview" :class="{ empty: !data.prompt }" style="margin-bottom: 8px;">
        {{ data.prompt ? clip(data.prompt, 60) : 'Click to add prompt…' }}
      </div>

      <div class="choices">
        <div
          v-for="(choice, i) in data.choices"
          :key="choice.id"
          class="choice-row"
        >
          <span class="choice-idx">{{ i + 1 }}</span>
          <span class="choice-text">{{ choice.text || '…' }}</span>
          <span v-if="choice.condition" class="badge-cond">if</span>
        </div>
      </div>
    </div>

    <!-- One source handle per choice, positioned proportionally on the right -->
    <Handle
      v-for="(choice, i) in data.choices"
      :key="`h-${choice.id}`"
      type="source"
      :position="Position.Right"
      :id="`choice-${choice.id}`"
      :style="choiceHandleStyle(i, data.choices.length)"
    />
  </div>
</template>

<script setup>
import { Handle, Position } from '@vue-flow/core'

defineProps({
  id: String,
  data: { type: Object, default: () => ({ prompt: '', choices: [] }) },
  selected: Boolean
})

function clip(text, max) {
  return text.length > max ? text.slice(0, max) + '…' : text
}

function choiceHandleStyle(index, total) {
  const pct = ((index + 1) / (total + 1)) * 100
  return { top: `${pct}%`, right: '-6px', transform: 'translateY(-50%)' }
}
</script>

<style scoped>
.choices { display: flex; flex-direction: column; gap: 4px; }

.choice-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 7px;
  background: rgba(255,255,255,0.04);
  border-radius: 5px;
  font-size: 11px;
}

.choice-idx {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--c-choice);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 700;
  flex-shrink: 0;
}

.choice-text {
  flex: 1;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge-cond {
  font-size: 9px;
  padding: 1px 4px;
  background: rgba(180,83,9,0.3);
  color: #fbbf24;
  border-radius: 3px;
  font-weight: 700;
  letter-spacing: 0.3px;
}
</style>
