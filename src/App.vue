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
          delete-key-code="Delete"
          fit-view-on-init
          @node-click="onNodeClick"
          @pane-click="onPaneClick"
          @connect="onConnect"
          @nodes-change="onNodesChange"
        >
          <Background :variant="BackgroundVariant.Dots" :gap="24" :size="1" />
          <Controls />
          <MiniMap
            :node-color="minimapNodeColor"
            :masked-color="'#0b0b16'"
          />
        </VueFlow>
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
import { ref, markRaw, computed } from 'vue'
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
import SetVariableNode from '@/components/nodes/SetVariableNode.vue'

import { FLOW_ID, uiStore, contextStore, genNodeId, genEdgeId, createNodeData, loadStory, exportStory } from '@/store.js'

// ── Node type registry ────────────────────────────────────────────────────────
const nodeTypes = {
  dialogue:    markRaw(DialogueNode),
  choice:      markRaw(ChoiceNode),
  condition:   markRaw(ConditionNode),
  setVariable: markRaw(SetVariableNode)
}

// ── VueFlow instance ──────────────────────────────────────────────────────────
const { addNodes, addEdges, getViewport, removeNodes } = useVueFlow(FLOW_ID)

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
function onConnect(params) {
  // Allow only one edge per source-handle combo
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
}

// ── Minimap color ─────────────────────────────────────────────────────────────
function minimapNodeColor(node) {
  const colors = {
    dialogue: '#4f46e5',
    choice: '#0d9488',
    condition: '#b45309',
    setVariable: '#be185d'
  }
  return colors[node.type] ?? '#6c5ce7'
}

// ── Import JSON ───────────────────────────────────────────────────────────────
const fileInput = ref(null)
const flowInstance = useVueFlow(FLOW_ID)

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
  // Reset so same file can be re-selected
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
  toast('New story created.', 'success')
}

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
