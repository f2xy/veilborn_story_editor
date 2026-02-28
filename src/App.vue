<template>
  <div class="editor-root">
    <EditorToolbar
      @addNode="handleAddNode"
      @importJson="handleImportJson"
      @exportJson="handleExportJson"
      @newStory="handleNewStory"
    />

    <div class="editor-body">
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
import { ref, markRaw, watch, nextTick, onMounted } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background, BackgroundVariant } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'

import EditorToolbar from '@/components/EditorToolbar.vue'
import ContextPanel from '@/components/ContextPanel.vue'
import PropertiesPanel from '@/components/PropertiesPanel.vue'

import DialogueNode from '@/components/nodes/DialogueNode.vue'
import ChoiceNode from '@/components/nodes/ChoiceNode.vue'
import ConditionNode from '@/components/nodes/ConditionNode.vue'
import ConditionSwitchNode from '@/components/nodes/ConditionSwitchNode.vue'
import SetVariableNode from '@/components/nodes/SetVariableNode.vue'

import { FLOW_ID, uiStore, contextStore, genNodeId, genEdgeId, createNodeData, loadStory, exportStory } from '@/store.js'

// ── Node type registry ────────────────────────────────────────────────────────
const nodeTypes = {
  dialogue:        markRaw(DialogueNode),
  choice:          markRaw(ChoiceNode),
  condition:       markRaw(ConditionNode),
  conditionSwitch: markRaw(ConditionSwitchNode),
  setVariable:     markRaw(SetVariableNode)
}

// ── VueFlow instance ──────────────────────────────────────────────────────────
const flowInstance = useVueFlow(FLOW_ID)
const { addNodes, addEdges, removeEdges, getViewport, removeNodes, nodes, edges } = flowInstance

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

// Geçerli bağlantı kuralları:
//   - Bir node kendi kendine bağlanamaz
//   - Hedef handle daima "input" adını taşır; source → target yönü zorunlu
//   - "input" handle'ından (giriş noktasından) bağlantı başlatılamaz
function isValidConnection(connection) {
  if (connection.source === connection.target) return false
  if (connection.targetHandle !== 'input') return false
  if (connection.sourceHandle === 'input') return false
  return true
}

function onConnect(params) {
  // Aynı kaynak handle'dan gelen mevcut kenarları kaldır (her çıkıştan tek bağlantı)
  const dupSource = edges.value.filter(
    e => e.source === params.source && e.sourceHandle === params.sourceHandle
  )
  // Aynı hedef handle'a gelen mevcut kenarları kaldır (her girişe tek bağlantı)
  const dupTarget = edges.value.filter(
    e => e.target === params.target && e.targetHandle === params.targetHandle
  )
  const toRemove = [...new Set([...dupSource.map(e => e.id), ...dupTarget.map(e => e.id)])]
  if (toRemove.length) removeEdges(toRemove)

  addEdges([{
    id: genEdgeId(),
    source: params.source,
    sourceHandle: params.sourceHandle,
    target: params.target,
    targetHandle: params.targetHandle,
    type: 'smoothstep'
  }])
}

// ── Track node removals (via Delete key) ─────────────────────────────────────
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
    choice:          '#0d9488',
    condition:       '#b45309',
    conditionSwitch: '#6d28d9',
    setVariable:     '#be185d'
  }
  return colors[node.type] ?? '#6c5ce7'
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
    loadStory(json, flowInstance)
    toast('Story imported successfully.', 'success')
  } catch (e) {
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

// ── New story ─────────────────────────────────────────────────────────────────
function handleNewStory() {
  if (!confirm('Start a new story? All unsaved work will be lost.')) return
  loadStory({ nodes: [], edges: [], context: {}, title: 'Untitled Story' }, flowInstance)
  localStorage.removeItem(AUTOSAVE_KEY)
  toast('New story created.', 'success')
}

// ── Auto-save to localStorage ─────────────────────────────────────────────────
const AUTOSAVE_KEY = 'veilborn_autosave'
const autosaveVisible = ref(false)
let saveTimer = null
let autosaveBadgeTimer = null
let _suppressSave = false   // prevents spurious save during initial load

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

// ── Restore from localStorage on mount ───────────────────────────────────────
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

/* ── Auto-save badge ── */
.autosave-badge {
  position: absolute;
  top: 10px;
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
