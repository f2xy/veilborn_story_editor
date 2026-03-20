<template>
  <aside v-if="uiStore.storiesPanelOpen" class="stories-panel">
    <!-- Header -->
    <div class="panel-header">
      <div class="panel-title">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
        Scenes
      </div>
      <button class="btn btn-icon btn-ghost add-btn" @click="handleCreate" title="New scene">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>

    <!-- Story list -->
    <div class="stories-list">
      <div
        v-for="story in storiesStore.stories"
        :key="story.id"
        class="story-item"
        :class="{ active: story.id === storiesStore.activeStoryId }"
        @click="handleSwitch(story.id)"
      >
        <span class="story-dot"></span>

        <span
          v-if="editingId !== story.id"
          class="story-title"
          @dblclick.stop="startRename(story)"
          :title="story.title"
        >{{ story.title }}</span>

        <input
          v-else
          ref="renameInput"
          class="story-rename-input"
          :value="story.title"
          @blur="finishRename(story.id, $event.target.value)"
          @keydown.enter.prevent="finishRename(story.id, $event.target.value)"
          @keydown.escape="editingId = null"
          @click.stop
        />

        <button
          class="btn btn-icon btn-ghost story-del-btn"
          :disabled="storiesStore.stories.length <= 1"
          @click.stop="handleDelete(story.id)"
          title="Delete scene"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Footer hint -->
    <div class="panel-footer-hint">
      Double-click to rename · Jump node links scenes
    </div>
  </aside>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { uiStore, storiesStore, renameStory } from '@/store.js'

const emit = defineEmits(['switchTo', 'createStory', 'deleteStory'])

const editingId = ref(null)
const renameInput = ref(null)

function handleSwitch(id) {
  if (id === storiesStore.activeStoryId) return
  emit('switchTo', id)
}

function handleCreate() {
  emit('createStory')
}

function handleDelete(id) {
  if (storiesStore.stories.length <= 1) return
  emit('deleteStory', id)
}

function startRename(story) {
  editingId.value = story.id
  nextTick(() => {
    const el = renameInput.value
    const target = Array.isArray(el) ? el[0] : el
    target?.focus()
    target?.select()
  })
}

function finishRename(id, title) {
  if (title?.trim()) renameStory(id, title.trim())
  editingId.value = null
}
</script>

<style scoped>
.stories-panel {
  width: var(--panel-width);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-panel);
  border-right: 1px solid var(--border);
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--text-muted);
}

.add-btn {
  color: var(--accent);
  border-color: transparent;
}
.add-btn:hover {
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  border-color: color-mix(in srgb, var(--accent) 40%, transparent);
}

.stories-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.story-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 7px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
  user-select: none;
  min-width: 0;
}
.story-item:hover {
  background: var(--bg-tertiary);
  border-color: var(--border);
}
.story-item.active {
  background: color-mix(in srgb, var(--c-storyjump) 12%, transparent);
  border-color: color-mix(in srgb, var(--c-storyjump) 40%, transparent);
}

.story-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  border: 1.5px solid var(--text-muted);
  flex-shrink: 0;
  transition: background 0.12s, border-color 0.12s;
}
.story-item.active .story-dot {
  background: var(--c-storyjump);
  border-color: var(--c-storyjump);
}

.story-title {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.story-item.active .story-title {
  color: var(--text-primary);
  font-weight: 500;
}

.story-rename-input {
  flex: 1;
  min-width: 0;
  background: var(--bg-primary);
  border: 1px solid var(--c-storyjump);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 12px;
  font-family: inherit;
  padding: 2px 6px;
  outline: none;
}

.story-del-btn {
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.12s;
  color: var(--text-muted);
  padding: 3px 5px;
}
.story-del-btn:disabled { cursor: not-allowed; }
.story-item:hover .story-del-btn { opacity: 1; }
.story-item.active .story-del-btn { opacity: 0.5; }
.story-item.active:hover .story-del-btn { opacity: 1; }
.story-del-btn:hover:not(:disabled) { color: #f87171; background: rgba(248,113,113,0.1); }

.panel-footer-hint {
  padding: 8px 14px;
  font-size: 10px;
  color: var(--text-muted);
  border-top: 1px solid var(--border);
  line-height: 1.5;
  flex-shrink: 0;
}
</style>
