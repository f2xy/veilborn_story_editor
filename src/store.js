import { reactive } from 'vue'

export const FLOW_ID = 'veilborn-editor'

// ── ID generators ────────────────────────────────────────────────────────────
let _counter = 0
export function genNodeId(type) {
  return `${type}_${++_counter}_${Date.now()}`
}
export function genChoiceId() {
  return `ch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}
export function genCaseId() {
  return `case_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}
export function genEdgeId() {
  return `edge_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

// ── Default node data per type ────────────────────────────────────────────────
export function createNodeData(type) {
  switch (type) {
    case 'dialogue':
      return { character: '', text: '' }
    case 'choice':
      return {
        prompt: '',
        choices: [
          { id: genChoiceId(), text: '', condition: null },
          { id: genChoiceId(), text: '', condition: null }
        ]
      }
    case 'condition':
      return {
        logic: 'single',   // 'single' | 'and' | 'or'
        negate: false,
        conditions: [{ variable: '', operator: '==', value: '' }]
      }
    case 'conditionSwitch':
      return {
        variable: '',
        cases: [
          { id: genCaseId(), operator: '==', value: '', label: '' },
          { id: genCaseId(), operator: '==', value: '', label: '' }
        ],
        hasDefault: true
      }
    case 'setVariable':
      return { variable: '', operation: 'set', value: '' }
    default:
      return {}
  }
}

// ── UI state (selected node, panels open/closed) ──────────────────────────────
export const uiStore = reactive({
  selectedNodeId: null,
  contextPanelOpen: true,
  storyTitle: 'Untitled Story'
})

// ── Context parameter store ───────────────────────────────────────────────────
export const contextStore = reactive({
  // { name: { type: 'number'|'boolean'|'string', default: value } }
  params: {}
})

export function addContextParam(name, type) {
  if (!name || contextStore.params[name]) return false
  const defaults = { number: 0, boolean: false, string: '' }
  contextStore.params[name] = { type, default: defaults[type] }
  return true
}

export function removeContextParam(name) {
  delete contextStore.params[name]
}

export function updateContextParamDefault(name, value) {
  if (contextStore.params[name]) {
    contextStore.params[name].default = value
  }
}

export function updateContextParamType(name, type) {
  if (contextStore.params[name]) {
    const defaults = { number: 0, boolean: false, string: '' }
    contextStore.params[name].type = type
    contextStore.params[name].default = defaults[type]
  }
}

// ── Load / Export ─────────────────────────────────────────────────────────────
export function loadStory(json, flowInstance) {
  const { nodes, edges, context, title } = json

  uiStore.storyTitle = title || 'Untitled Story'
  uiStore.selectedNodeId = null

  // Rebuild context
  contextStore.params = {}
  if (context) {
    Object.entries(context).forEach(([k, v]) => {
      contextStore.params[k] = { ...v }
    })
  }

  // Reset node counter to avoid collisions
  _counter = 200_000

  // Inject edges with smoothstep type
  const enrichedEdges = (edges || []).map(e => ({ ...e, type: 'smoothstep' }))

  flowInstance.setNodes(nodes || [])
  flowInstance.setEdges(enrichedEdges)
}

export function exportStory(flowInstance) {
  const { nodes: flowNodes, edges: flowEdges } = flowInstance

  return {
    version: '1.0',
    title: uiStore.storyTitle,
    startNodeId: flowNodes.value?.[0]?.id ?? null,
    context: JSON.parse(JSON.stringify(contextStore.params)),
    nodes: (flowNodes.value || []).map(n => ({
      id: n.id,
      type: n.type,
      position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
      data: n.data
    })),
    edges: (flowEdges.value || []).map(e => ({
      id: e.id,
      source: e.source,
      sourceHandle: e.sourceHandle,
      target: e.target,
      targetHandle: e.targetHandle
    }))
  }
}
