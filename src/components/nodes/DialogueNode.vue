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
    </div>

    <Handle type="source" :position="Position.Bottom" id="output" />
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
</style>
