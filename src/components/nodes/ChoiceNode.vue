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
      <div class="node-preview" :class="{ empty: !data.prompt }" style="margin-bottom: 8px;" v-html="promptHtml"></div>

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
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { contextStore } from '@/store.js'

const props = defineProps({
  id: String,
  data: { type: Object, default: () => ({ prompt: '', choices: [] }) },
  selected: Boolean
})

function clip(text, max) {
  return text.length > max ? text.slice(0, max) + '…' : text
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const promptHtml = computed(() => {
  if (!props.data.prompt) return '<span class="empty-placeholder">Click to add prompt…</span>'
  const clipped = clip(props.data.prompt, 60)
  const escaped = escapeHtml(clipped)
  return escaped.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)\$/g, (_, name) => {
    const known = contextStore.params[name] !== undefined
    return `<span class="var-token${known ? '' : ' var-unknown'}">$${name}$</span>`
  })
})

function choiceHandleStyle(index, total) {
  const pct = ((index + 1) / (total + 1)) * 100
  return { top: `${pct}%`, right: '-6px', transform: 'translateY(-50%)' }
}
</script>

<style scoped>
.var-token {
  color: #a78bfa;
  background: rgba(124, 110, 245, 0.15);
  border-radius: 3px;
  padding: 0 2px;
  font-style: normal;
}

.var-unknown {
  color: #f87171;
  background: rgba(248, 113, 113, 0.12);
}

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
