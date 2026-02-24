<template>
  <header class="toolbar">
    <!-- Brand -->
    <div class="toolbar-brand">
      <span class="brand-icon">⬡</span>
      <span class="brand-name">Veilborn</span>
      <span class="brand-sep">|</span>
      <input
        class="story-title-input"
        :value="uiStore.storyTitle"
        @input="uiStore.storyTitle = $event.target.value"
        placeholder="Story title…"
      />
    </div>

    <!-- Add node buttons -->
    <div class="toolbar-nodes">
      <span class="toolbar-label">Add node:</span>
      <button class="btn node-btn btn-dialogue" @click="$emit('addNode', 'dialogue')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        Dialogue
      </button>
      <button class="btn node-btn btn-choice" @click="$emit('addNode', 'choice')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="16 3 21 3 21 8"/>
          <line x1="4" y1="20" x2="21" y2="3"/>
          <polyline points="21 16 21 21 16 21"/>
          <line x1="15" y1="15" x2="21" y2="21"/>
        </svg>
        Choice
      </button>
      <button class="btn node-btn btn-condition" @click="$emit('addNode', 'condition')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        Condition
      </button>
      <button class="btn node-btn btn-setvar" @click="$emit('addNode', 'setVariable')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="4" y1="9" x2="20" y2="9"/>
          <line x1="4" y1="15" x2="20" y2="15"/>
          <line x1="10" y1="3" x2="8" y2="21"/>
          <line x1="16" y1="3" x2="14" y2="21"/>
        </svg>
        Set Variable
      </button>
    </div>

    <!-- Right actions -->
    <div class="toolbar-actions">
      <button class="btn btn-ghost" title="Toggle context panel" @click="uiStore.contextPanelOpen = !uiStore.contextPanelOpen">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
          <path d="M4.93 4.93a10 10 0 0 0 0 14.14"/>
        </svg>
        Context
      </button>

      <div class="separator"></div>

      <button class="btn btn-ghost" @click="$emit('importJson')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        Import
      </button>
      <button class="btn btn-ghost" @click="$emit('exportJson')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Export
      </button>
      <button class="btn btn-ghost btn-danger" @click="$emit('newStory')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14H6L5 6"/>
          <path d="M10 11v6"/>
          <path d="M14 11v6"/>
          <path d="M9 6V4h6v2"/>
        </svg>
        New
      </button>
    </div>
  </header>
</template>

<script setup>
import { uiStore } from '@/store.js'

defineEmits(['addNode', 'importJson', 'exportJson', 'newStory'])
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 14px;
  height: 48px;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  overflow: hidden;
}

.toolbar-brand {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
}

.brand-icon {
  font-size: 18px;
  color: var(--accent);
  line-height: 1;
}

.brand-name {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--text-primary);
  text-transform: uppercase;
}

.brand-sep {
  color: var(--border-light);
  margin: 0 2px;
}

.story-title-input {
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-secondary);
  font-size: 12px;
  width: 160px;
  font-family: inherit;
}
.story-title-input:focus { color: var(--text-primary); }

.toolbar-nodes {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 8px;
  padding-left: 12px;
  border-left: 1px solid var(--border);
}

.toolbar-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  flex-shrink: 0;
}

.node-btn {
  border-color: transparent;
  font-weight: 600;
  font-size: 11px;
}

.btn-dialogue  { color: #818cf8; }
.btn-dialogue:hover  { background: rgba(79,70,229,0.2); border-color: rgba(79,70,229,0.5); }

.btn-choice    { color: #2dd4bf; }
.btn-choice:hover    { background: rgba(13,148,136,0.2); border-color: rgba(13,148,136,0.5); }

.btn-condition { color: #fbbf24; }
.btn-condition:hover  { background: rgba(180,83,9,0.2); border-color: rgba(180,83,9,0.5); }

.btn-setvar    { color: #f472b6; }
.btn-setvar:hover    { background: rgba(190,24,93,0.2); border-color: rgba(190,24,93,0.5); }

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}

.separator {
  width: 1px;
  height: 20px;
  background: var(--border);
  margin: 0 4px;
}
</style>
