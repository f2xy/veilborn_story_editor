<template>
  <div class="vf-node" :class="{ selected }">
    <Handle type="target" :position="Position.Top" id="input" />

    <div class="node-header" :style="{ background: 'var(--c-dialogue)' }">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      Dialogue
      <button
        class="play-from-btn"
        title="Buradan oyna"
        @click.stop="uiStore.playFromNodeId = id"
      >
        <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
      </button>
    </div>

    <div class="node-body">
      <div v-if="data.character" class="node-char">{{ data.character }}</div>
      <div class="node-preview" :class="{ empty: !data.text }" v-html="previewHtml"></div>

      <div v-if="data.choices?.length" class="choices">
        <div
          v-for="(choice, i) in data.choices"
          :key="choice.id"
          class="choice-row"
        >
          <span class="choice-idx">{{ i + 1 }}</span>
          <span class="choice-text">{{ choice.text || '…' }}</span>
          <span v-if="choice.condition" class="badge-cond">if</span>
          <span v-if="choice.actions?.length" class="badge-action">⚙{{ choice.actions.length }}</span>
        </div>
      </div>
    </div>

    <!-- Linear mode: single output at bottom -->
    <Handle v-if="!data.choices?.length" type="source" :position="Position.Bottom" id="output" />

    <!-- Branching mode: one handle per choice on the right -->
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
import { contextStore, uiStore } from '@/store.js'

const props = defineProps({
  id: String,
  data: { type: Object, default: () => ({}) },
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

const previewHtml = computed(() => {
  if (!props.data.text) return '<span class="empty-placeholder">Click to add text…</span>'
  const clipped = clip(props.data.text, 90)
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
.node-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.play-from-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  width: 18px;
  height: 18px;
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 3px;
  color: rgba(255,255,255,0.8);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s;
  padding: 0;
  flex-shrink: 0;
}

.vf-node:hover .play-from-btn,
.vf-node.selected .play-from-btn {
  opacity: 1;
}

.play-from-btn:hover {
  background: rgba(74, 222, 128, 0.35);
  border-color: rgba(74, 222, 128, 0.6);
  color: #4ade80;
}

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

.choices { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }

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
  background: var(--c-dialogue);
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

.badge-action {
  font-size: 9px;
  padding: 1px 4px;
  background: rgba(190,24,93,0.25);
  color: #f472b6;
  border-radius: 3px;
  font-weight: 700;
  letter-spacing: 0.3px;
}
</style>
