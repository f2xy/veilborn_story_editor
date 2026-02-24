<template>
  <div class="vf-node" :class="{ selected }">
    <Handle type="target" :position="Position.Top" id="input" />

    <div class="node-header" :style="{ background: 'var(--c-dialogue)' }">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      Dialogue
    </div>

    <div class="node-body">
      <div v-if="data.character" class="node-char">{{ data.character }}</div>
      <div class="node-preview" :class="{ empty: !data.text }">
        {{ data.text ? clip(data.text, 90) : 'Click to add text…' }}
      </div>
    </div>

    <Handle type="source" :position="Position.Bottom" id="output" />
  </div>
</template>

<script setup>
import { Handle, Position } from '@vue-flow/core'

defineProps({
  id: String,
  data: { type: Object, default: () => ({}) },
  selected: Boolean
})

function clip(text, max) {
  return text.length > max ? text.slice(0, max) + '…' : text
}
</script>
