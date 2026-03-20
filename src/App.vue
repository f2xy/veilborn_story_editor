<template>
  <div class="editor-root">
    <EditorToolbar
      @addNode="handleAddNode"
      @importJson="handleImportJson"
      @exportJson="handleExportJson"
      @newStory="handleNewStory"
      @playStory="handlePlayStory"
    />

    <div class="editor-body">
      <StoriesPanel
        @switchTo="switchStory"
        @createStory="handleCreateStory"
        @deleteStory="handleDeleteStory"
      />

      <ContextPanel />

      <!-- Canvas -->
      <div class="canvas-wrap">
        <VueFlow
          :id="FLOW_ID"
          :node-types="nodeTypes"
          :default-edge-options="{ type: 'smoothstep' }"
          :connect-on-click="false"
          :is-valid-connection="isValidConnection"
          delete-key-code="Delete"
          fit-view-on-init
          @node-click="onNodeClick"
          @pane-click="onPaneClick"
          @connect="onConnect"
          @nodes-change="onNodesChange"
          @edges-change="scheduleSave"
        >
          <Background :variant="BackgroundVariant.Dots" :gap="24" :size="1" />
          <Controls />
          <MiniMap
            :node-color="minimapNodeColor"
            :masked-color="'#0b0b16'"
          />
        </VueFlow>

        <!-- Scene name badge -->
        <div class="scene-badge">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          {{ activeStoryTitle }}
        </div>

        <!-- Auto-save indicator -->
        <div class="autosave-badge" :class="{ visible: autosaveVisible }">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          Auto-saved
        </div>
      </div>

      <PropertiesPanel />
    </div>

    <!-- Play mode overlay -->
    <StoryPlayer
      v-if="playModeActive"
      :story="playStoryData"
      @close="playModeActive = false"
    />

    <!-- Hidden import input -->
    <input ref="fileInput" type="file" accept=".json" style="display:none" @change="onFileSelected" />

    <!-- Toast notifications -->
    <div class="toast-container">
      <transition-group name="toast">
        <div v-for="t in toasts" :key="t.id" class="toast" :class="`toast-${t.type}`">
          {{ t.message }}
        </div>
      </transition-group>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, markRaw, watch, nextTick, onMounted } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background, BackgroundVariant } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'

import EditorToolbar from '@/components/EditorToolbar.vue'
import ContextPanel from '@/components/ContextPanel.vue'
import PropertiesPanel from '@/components/PropertiesPanel.vue'
import StoriesPanel from '@/components/StoriesPanel.vue'
import StoryPlayer from '@/components/StoryPlayer.vue'

import DialogueNode from '@/components/nodes/DialogueNode.vue'
import ConditionNode from '@/components/nodes/ConditionNode.vue'
import ConditionSwitchNode from '@/components/nodes/ConditionSwitchNode.vue'
import SetVariableNode from '@/components/nodes/SetVariableNode.vue'
import StoryJumpNode from '@/components/nodes/StoryJumpNode.vue'

import {
  FLOW_ID,
  uiStore, contextStore, storiesStore,
  genNodeId, genEdgeId, createNodeData,
  createStory, deleteStory,
  loadStory, exportStory
} from '@/store.js'

// ── Node type registry ────────────────────────────────────────────────────────
const nodeTypes = {
  dialogue:        markRaw(DialogueNode),
  condition:       markRaw(ConditionNode),
  conditionSwitch: markRaw(ConditionSwitchNode),
  setVariable:     markRaw(SetVariableNode),
  storyJump:       markRaw(StoryJumpNode)
}

// ── VueFlow instance ──────────────────────────────────────────────────────────
const flowInstance = useVueFlow(FLOW_ID)
const { addNodes, addEdges, removeEdges, getViewport, removeNodes, nodes, edges, setNodes, setEdges } = flowInstance

// ── Active story info ─────────────────────────────────────────────────────────
const activeStoryTitle = computed(() =>
  storiesStore.stories.find(s => s.id === storiesStore.activeStoryId)?.title ?? ''
)

// ── Node placement ────────────────────────────────────────────────────────────
function viewportCenter() {
  const vp = getViewport()
  const el = document.querySelector('.canvas-wrap') || document.body
  const w = el.clientWidth
  const h = el.clientHeight
  return {
    x: (-vp.x + w / 2) / vp.zoom + (Math.random() * 60 - 30),
    y: (-vp.y + h / 2) / vp.zoom + (Math.random() * 60 - 30)
  }
}

function handleAddNode(type) {
  const pos = viewportCenter()
  addNodes([{
    id: genNodeId(type),
    type,
    position: pos,
    data: createNodeData(type)
  }])
}

// ── Selection ─────────────────────────────────────────────────────────────────
function onNodeClick({ node }) {
  uiStore.selectedNodeId = node.id
}

function onPaneClick() {
  uiStore.selectedNodeId = null
}

// ── Connection ────────────────────────────────────────────────────────────────
function isValidConnection(connection) {
  if (connection.source === connection.target) return false
  if (connection.targetHandle !== 'input') return false
  if (connection.sourceHandle === 'input') return false
  return true
}

function onConnect(params) {
  const dupSource = edges.value.filter(
    e => e.source === params.source && e.sourceHandle === params.sourceHandle
  )
  if (dupSource.length) removeEdges(dupSource.map(e => e.id))

  addEdges([{
    id: genEdgeId(),
    source: params.source,
    sourceHandle: params.sourceHandle,
    target: params.target,
    targetHandle: params.targetHandle,
    type: 'smoothstep'
  }])
}

// ── Track node removals (via Delete key) ──────────────────────────────────────
function onNodesChange(changes) {
  for (const c of changes) {
    if (c.type === 'remove' && c.id === uiStore.selectedNodeId) {
      uiStore.selectedNodeId = null
    }
  }
  scheduleSave()
}

// ── Minimap color ─────────────────────────────────────────────────────────────
function minimapNodeColor(node) {
  const colors = {
    dialogue:        '#4f46e5',
    condition:       '#b45309',
    conditionSwitch: '#6d28d9',
    setVariable:     '#be185d',
    storyJump:       '#0e7490'
  }
  return colors[node.type] ?? '#6c5ce7'
}

// ── Story switching ───────────────────────────────────────────────────────────
// Save current VueFlow canvas into storiesStore, then load the new story.
async function switchStory(newStoryId) {
  if (newStoryId === storiesStore.activeStoryId) return

  _suppressSave = true

  // Snapshot current story's canvas into storiesStore
  const currentIdx = storiesStore.stories.findIndex(s => s.id === storiesStore.activeStoryId)
  if (currentIdx >= 0) {
    storiesStore.stories[currentIdx] = {
      ...storiesStore.stories[currentIdx],
      nodes: nodes.value.map(n => ({
        id: n.id,
        type: n.type,
        position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
        data: JSON.parse(JSON.stringify(n.data))
      })),
      edges: edges.value.map(e => ({
        id: e.id,
        source: e.source,
        sourceHandle: e.sourceHandle,
        target: e.target,
        targetHandle: e.targetHandle
      }))
    }
  }

  uiStore.selectedNodeId = null
  storiesStore.activeStoryId = newStoryId

  const newStory = storiesStore.stories.find(s => s.id === newStoryId)
  setNodes(newStory?.nodes ?? [])
  setEdges((newStory?.edges ?? []).map(e => ({ ...e, type: 'smoothstep' })))

  await nextTick()
  _suppressSave = false
  scheduleSave()
}

// ── Story create ──────────────────────────────────────────────────────────────
function handleCreateStory() {
  const newId = createStory()
  switchStory(newId)
}

// ── Story delete ──────────────────────────────────────────────────────────────
async function handleDeleteStory(id) {
  if (storiesStore.stories.length <= 1) return

  _suppressSave = true

  const wasActive = storiesStore.activeStoryId === id
  const nextId = deleteStory(id)   // removes from storiesStore.stories

  if (wasActive && nextId) {
    uiStore.selectedNodeId = null
    storiesStore.activeStoryId = nextId
    const story = storiesStore.stories.find(s => s.id === nextId)
    setNodes(story?.nodes ?? [])
    setEdges((story?.edges ?? []).map(e => ({ ...e, type: 'smoothstep' })))
  }

  await nextTick()
  _suppressSave = false
  scheduleSave()
}

// ── Import JSON ───────────────────────────────────────────────────────────────
const fileInput = ref(null)

function handleImportJson() {
  fileInput.value?.click()
}

async function onFileSelected(event) {
  const file = event.target.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    const json = JSON.parse(text)
    _suppressSave = true
    loadStory(json, flowInstance)
    _suppressSave = false
    toast('Story imported successfully.', 'success')
  } catch (e) {
    _suppressSave = false
    toast('Failed to parse JSON: ' + e.message, 'error')
  }
  event.target.value = ''
}

// ── Export JSON ───────────────────────────────────────────────────────────────
function handleExportJson() {
  const data = exportStory(flowInstance)
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const slug = (uiStore.storyTitle || 'story').toLowerCase().replace(/\s+/g, '_')
  a.download = `${slug}.json`
  a.click()
  URL.revokeObjectURL(url)
  toast('Story exported.', 'success')
}

// ── Play story ────────────────────────────────────────────────────────────────
const playModeActive = ref(false)
const playStoryData  = ref(null)

function openPlayer(startNodeId) {
  const data = exportStory(flowInstance)
  const activeStory = data.stories?.find(s => s.id === data.activeStoryId)
  if (!activeStory?.nodes?.length) {
    toast('Oynatmak için en az bir node ekleyin.', 'error')
    return
  }
  if (startNodeId) {
    data.stories = data.stories.map(s =>
      s.id === data.activeStoryId ? { ...s, startNodeId } : s
    )
  }
  playStoryData.value = data
  playModeActive.value = true
}

function handlePlayStory() { openPlayer(null) }

watch(() => uiStore.playFromNodeId, (nodeId) => {
  if (!nodeId) return
  uiStore.playFromNodeId = null
  openPlayer(nodeId)
})

// ── New story ─────────────────────────────────────────────────────────────────
function handleNewStory() {
  if (!confirm('Start a new story? All unsaved work will be lost.')) return
  _suppressSave = true
  loadStory({ nodes: [], edges: [], context: {}, title: 'Untitled Story' }, flowInstance)
  _suppressSave = false
  localStorage.removeItem(AUTOSAVE_KEY)
  toast('New story created.', 'success')
}

// ── Auto-save to localStorage ─────────────────────────────────────────────────
const AUTOSAVE_KEY = 'veilborn_autosave'
const autosaveVisible = ref(false)
let saveTimer = null
let autosaveBadgeTimer = null
let _suppressSave = false   // prevents spurious saves during load/switch

function scheduleSave() {
  if (_suppressSave) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      const data = exportStory(flowInstance)
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data))
      showAutosaveBadge()
    } catch (_) { /* ignore */ }
  }, 600)
}

function showAutosaveBadge() {
  autosaveVisible.value = true
  clearTimeout(autosaveBadgeTimer)
  autosaveBadgeTimer = setTimeout(() => { autosaveVisible.value = false }, 2000)
}

// Watch reactive state for changes → schedule save
watch(nodes, scheduleSave, { deep: true })
watch(() => uiStore.storyTitle, scheduleSave)
watch(() => contextStore.params, scheduleSave, { deep: true })
watch(() => storiesStore.stories.map(s => s.title).join('|'), scheduleSave)   // story renames
watch(() => storiesStore.stories.length, scheduleSave)                         // add / remove story

// ── Restore from localStorage on mount ────────────────────────────────────────
onMounted(() => {
  nextTick(() => {
    setTimeout(() => {
      const saved = localStorage.getItem(AUTOSAVE_KEY)
      if (!saved) return
      try {
        const json = JSON.parse(saved)
        _suppressSave = true
        loadStory(json, flowInstance)
        _suppressSave = false
        toast('Auto-saved session restored.', 'info')
      } catch (_) {
        _suppressSave = false
      }
    }, 80)
  })
})

// ── Toasts ────────────────────────────────────────────────────────────────────
const toasts = ref([])
let toastId = 0

function toast(message, type = 'info') {
  const id = ++toastId
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, 3000)
}
</script>

<style scoped>
.editor-root {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

.canvas-wrap {
  flex: 1;
  position: relative;
  min-width: 0;
}

/* ── Scene name badge ── */
.scene-badge {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  background: rgba(19,19,31,0.85);
  border: 1px solid var(--c-storyjump);
  border-radius: 20px;
  font-size: 10px;
  font-weight: 600;
  color: color-mix(in srgb, var(--c-storyjump) 90%, white);
  pointer-events: none;
  z-index: 10;
  backdrop-filter: blur(8px);
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.scene-badge svg { color: var(--c-storyjump); flex-shrink: 0; }

/* ── Auto-save badge ── */
.autosave-badge {
  position: absolute;
  top: 40px;
  left: 50%;
  transform: translateX(-50%) translateY(-6px);
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  background: rgba(19,19,31,0.9);
  border: 1px solid var(--border-light);
  border-radius: 20px;
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease, transform 0.2s ease;
  z-index: 100;
  backdrop-filter: blur(8px);
}
.autosave-badge.visible {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

/* ── Toasts ── */
.toast-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 9999;
  pointer-events: none;
}

.toast {
  padding: 9px 16px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  backdrop-filter: blur(8px);
  border: 1px solid;
  max-width: 300px;
}

.toast-success {
  background: rgba(5,150,105,0.25);
  border-color: rgba(5,150,105,0.5);
  color: #34d399;
}

.toast-error {
  background: rgba(220,38,38,0.25);
  border-color: rgba(220,38,38,0.5);
  color: #f87171;
}

.toast-info {
  background: rgba(124,110,245,0.25);
  border-color: rgba(124,110,245,0.5);
  color: #a78bfa;
}

.toast-enter-active, .toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from { opacity: 0; transform: translateY(10px); }
.toast-leave-to   { opacity: 0; transform: translateX(20px); }
</style>
