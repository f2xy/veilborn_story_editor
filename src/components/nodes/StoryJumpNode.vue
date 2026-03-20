<template>
  <div class="vf-node" :class="{ selected }">
    <Handle type="target" position="top" id="input" />

    <div class="node-header" style="background: var(--c-storyjump)">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
        <line x1="6" y1="1" x2="6" y2="4"/>
        <line x1="10" y1="1" x2="10" y2="4"/>
        <line x1="14" y1="1" x2="14" y2="4"/>
      </svg>
      Story Jump
    </div>

    <div class="node-body">
      <div v-if="targetTitle" class="jump-destination">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M5 12h14"/>
          <path d="m12 5 7 7-7 7"/>
        </svg>
        <span class="jump-name">{{ targetTitle }}</span>
      </div>
      <div v-else class="jump-destination empty">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        Select target scene…
      </div>
      <div v-if="targetNodeLabel" class="jump-node-row">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        <span class="jump-node-label">{{ targetNodeLabel }}</span>
      </div>
      <div v-else-if="targetTitle" class="jump-node-row muted">scene start</div>
      <div v-if="data.label" class="jump-label">{{ data.label }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Handle } from '@vue-flow/core'
import { storiesStore } from '@/store.js'

const props = defineProps({
  id:       String,
  data:     Object,
  selected: Boolean
})

const targetTitle = computed(() => {
  if (!props.data?.targetStoryId) return null
  return storiesStore.stories.find(s => s.id === props.data.targetStoryId)?.title ?? null
})

const targetNodeLabel = computed(() => {
  if (!props.data?.targetNodeId || !props.data?.targetStoryId) return null
  const story = storiesStore.stories.find(s => s.id === props.data.targetStoryId)
  const node = (story?.nodes || []).find(n => n.id === props.data.targetNodeId)
  if (!node) return null
  if (node.type === 'dialogue') {
    const char = node.data?.character ? `${node.data.character}: ` : ''
    const text = (node.data?.text || '').slice(0, 28) || '(empty)'
    return `${char}${text}`
  }
  return node.id
})
</script>

<style scoped>
.jump-destination {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-primary);
  font-weight: 500;
  overflow: hidden;
}

.jump-destination svg {
  flex-shrink: 0;
  color: var(--c-storyjump);
}

.jump-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.jump-destination.empty {
  color: var(--text-muted);
  font-style: italic;
}

.jump-node-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 10px;
  color: var(--text-secondary);
  overflow: hidden;
}
.jump-node-row svg { flex-shrink: 0; color: var(--c-storyjump); }
.jump-node-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.jump-node-row.muted {
  color: var(--text-muted);
  font-style: italic;
}

.jump-label {
  margin-top: 5px;
  font-size: 10px;
  color: var(--text-muted);
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
