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
export function genStoryId() {
  return `story_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

// ── Default node data per type ────────────────────────────────────────────────
export function createNodeData(type) {
  switch (type) {
    case 'dialogue':
      return { character: '', text: '', choices: [] }
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
    case 'storyJump':
      return { targetStoryId: '', targetNodeId: '', label: '' }
    default:
      return {}
  }
}

// ── UI state (selected node, panels open/closed) ──────────────────────────────
export const uiStore = reactive({
  selectedNodeId: null,
  contextPanelOpen: true,
  storiesPanelOpen: true,
  storyTitle: 'Untitled Story',
  playFromNodeId: null   // set by a node to trigger play-from-here
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

// ── Stories store ─────────────────────────────────────────────────────────────
// Each story is: { id, title, nodes: [], edges: [] }
// The active story's nodes/edges are in VueFlow; storiesStore holds snapshots
// of non-active stories plus the last-saved snapshot of the active story.

const _initialStoryId = genStoryId()

export const storiesStore = reactive({
  stories: [
    { id: _initialStoryId, title: 'Main Story', nodes: [], edges: [] }
  ],
  activeStoryId: _initialStoryId
})

export function createStory(title = 'New Scene') {
  const id = genStoryId()
  storiesStore.stories.push({ id, title, nodes: [], edges: [] })
  return id
}

export function deleteStory(id) {
  const idx = storiesStore.stories.findIndex(s => s.id === id)
  if (idx < 0 || storiesStore.stories.length <= 1) return null
  const wasActive = storiesStore.activeStoryId === id
  storiesStore.stories.splice(idx, 1)
  if (wasActive) {
    const nextIdx = Math.min(idx, storiesStore.stories.length - 1)
    return storiesStore.stories[nextIdx].id
  }
  return null
}

export function renameStory(id, title) {
  const story = storiesStore.stories.find(s => s.id === id)
  if (story) story.title = title
}

// ── Node migration helper ─────────────────────────────────────────────────────
function _migrateNode(n) {
  if (n.type !== 'choice') return n
  return {
    ...n,
    type: 'dialogue',
    data: {
      character: '',
      text: n.data?.prompt || '',
      choices: n.data?.choices || []
    }
  }
}

// ── Load / Export ─────────────────────────────────────────────────────────────
export function loadStory(json, flowInstance) {
  uiStore.selectedNodeId = null
  uiStore.storyTitle = json.title || 'Untitled Story'

  // Rebuild context
  contextStore.params = {}
  if (json.context) {
    Object.entries(json.context).forEach(([k, v]) => {
      contextStore.params[k] = { ...v }
    })
  }

  // Reset node counter to avoid collisions
  _counter = 200_000

  if (json.version === '2.0' && Array.isArray(json.stories)) {
    // ── Multi-story format ────────────────────────────────────────────────────
    storiesStore.stories = json.stories.map(s => ({
      id: s.id,
      title: s.title || 'Untitled Scene',
      nodes: (s.nodes || []).map(_migrateNode),
      edges: (s.edges || []).map(e => ({ ...e, type: 'smoothstep' }))
    }))

    const activeId = (json.activeStoryId && storiesStore.stories.find(s => s.id === json.activeStoryId))
      ? json.activeStoryId
      : storiesStore.stories[0]?.id

    storiesStore.activeStoryId = activeId

    const active = storiesStore.stories.find(s => s.id === activeId)
    flowInstance.setNodes(active?.nodes || [])
    flowInstance.setEdges(active?.edges || [])

  } else {
    // ── Legacy v1.0 — wrap as a single story ─────────────────────────────────
    const nodes = (json.nodes || []).map(_migrateNode)
    const edges = (json.edges || []).map(e => ({ ...e, type: 'smoothstep' }))
    const id = genStoryId()

    storiesStore.stories = [{ id, title: json.title || 'Main Story', nodes, edges }]
    storiesStore.activeStoryId = id

    flowInstance.setNodes(nodes)
    flowInstance.setEdges(edges)
  }
}

export function exportStory(flowInstance) {
  const { nodes: flowNodes, edges: flowEdges } = flowInstance

  const stories = storiesStore.stories.map(s => {
    if (s.id === storiesStore.activeStoryId) {
      // Use live VueFlow data for the active story
      return {
        id: s.id,
        title: s.title,
        startNodeId: flowNodes.value?.[0]?.id ?? null,
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
    // Non-active stories use their stored snapshot
    return {
      id: s.id,
      title: s.title,
      startNodeId: s.nodes[0]?.id ?? null,
      nodes: s.nodes,
      edges: s.edges
    }
  })

  return {
    version: '2.0',
    title: uiStore.storyTitle,
    activeStoryId: storiesStore.activeStoryId,
    context: JSON.parse(JSON.stringify(contextStore.params)),
    stories
  }
}
