<template>
  <div class="player-overlay" @click.self="$emit('close')">
    <div class="player-modal">

      <!-- Header -->
      <div class="player-header">
        <div class="player-header-left">
          <svg class="play-icon" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          <span class="play-label">Play Mode</span>
          <span class="play-sep">—</span>
          <span class="play-title">{{ story.title }}</span>
        </div>
        <div class="player-header-right">
          <button class="ph-btn" @click="restart">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 .49-4.24"/>
            </svg>
            Restart
          </button>
          <button class="ph-btn ph-close" @click="$emit('close')" title="Close (Esc)">✕</button>
        </div>
      </div>

      <!-- Body -->
      <div class="player-body">

        <!-- Empty story -->
        <div v-if="!story.nodes?.length" class="player-state">
          <p class="state-icon">⬡</p>
          <p class="state-title">Hikaye boş</p>
          <p class="state-msg">Önce editörde node'lar ekleyin.</p>
        </div>

        <!-- End state -->
        <div v-else-if="phase === 'ended'" class="player-state">
          <p class="state-icon">⬡</p>
          <p class="state-title">Hikaye Sona Erdi</p>
          <p class="state-msg">{{ endMessage }}</p>
          <button class="restart-btn" @click="restart">Yeniden Başlat</button>
        </div>

        <!-- Active step -->
        <template v-else>
          <!-- Auto-processing log (condition / setVar etc.) -->
          <div v-if="stepLog.length" class="step-log">
            <div
              v-for="(entry, i) in stepLog"
              :key="i"
              class="log-entry"
              :class="entry.kind"
            >
              <span class="log-icon">{{ entry.icon }}</span>
              <span class="log-text">{{ entry.text }}</span>
            </div>
          </div>

          <!-- Dialogue -->
          <div v-if="currentNode?.type === 'dialogue'" class="dialogue-box">
            <div v-if="currentNode.data.character" class="char-name">
              {{ currentNode.data.character }}
            </div>
            <div class="dialogue-text" v-html="renderedText"></div>
          </div>

          <!-- Choice -->
          <div v-else-if="currentNode?.type === 'choice'" class="choice-box">
            <p v-if="currentNode.data.prompt" class="choice-prompt">
              {{ currentNode.data.prompt }}
            </p>
            <p v-else class="choice-prompt empty">Ne yapmak istersin?</p>
          </div>
        </template>
      </div>

      <!-- Footer actions -->
      <div class="player-footer" v-if="phase === 'playing' && story.nodes?.length">
        <!-- Choice buttons -->
        <template v-if="currentNode?.type === 'choice'">
          <div class="choices-list">
            <button
              v-for="ch in visibleChoices"
              :key="ch.id"
              class="choice-btn"
              @click="pickChoice(ch)"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
              {{ ch.text || '(boş seçenek)' }}
            </button>
            <p v-if="!visibleChoices.length" class="no-choices">
              Mevcut koşulları karşılayan seçenek bulunamadı.
            </p>
          </div>
        </template>

        <!-- Continue button for dialogue -->
        <button
          v-else-if="currentNode?.type === 'dialogue'"
          class="continue-btn"
          @click="advance"
        >
          Devam Et
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

      <!-- Context debug bar -->
      <div class="ctx-bar" v-if="Object.keys(context).length">
        <span class="ctx-label">Değişkenler</span>
        <span v-for="(val, key) in context" :key="key" class="ctx-item">
          <span class="ctx-key">{{ key }}</span>
          <span class="ctx-eq">=</span>
          <span class="ctx-val" :class="valClass(val)">{{ String(val) }}</span>
        </span>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  story: { type: Object, required: true }
})

const emit = defineEmits(['close'])

// ── Lookup maps ───────────────────────────────────────────────────────────────
const nodesById = Object.fromEntries(
  (props.story.nodes || []).map(n => [n.id, n])
)

// edgesBySource: `nodeId__handleId` → targetNodeId
const edgesBySource = {}
for (const e of (props.story.edges || [])) {
  edgesBySource[`${e.source}__${e.sourceHandle}`] = e.target
}

// ── Runtime state ─────────────────────────────────────────────────────────────
const context    = ref(buildInitialContext())
const currentId  = ref(null)
const stepLog    = ref([])   // auto-processed node events since last user action
const phase      = ref('playing')   // 'playing' | 'ended'
const endMessage = ref('')

function buildInitialContext() {
  const ctx = {}
  for (const [k, v] of Object.entries(props.story.context || {})) {
    ctx[k] = v.default ?? (v.type === 'number' ? 0 : v.type === 'boolean' ? false : '')
  }
  return ctx
}

// ── Navigation engine ─────────────────────────────────────────────────────────
const MAX_AUTO = 50

function navigate(nodeId, depth = 0) {
  if (depth > MAX_AUTO) { endStory('Sonsuz döngü tespit edildi.'); return }
  if (!nodeId)           { endStory('Hikaye sona erdi.'); return }

  const node = nodesById[nodeId]
  if (!node) { endStory(`Node bulunamadı: ${nodeId}`); return }

  currentId.value = nodeId

  if (node.type === 'condition') {
    const result = evalCondition(node.data)
    stepLog.value.push({
      kind: 'condition',
      icon: result ? '✓' : '✗',
      text: `Koşul [${describeCondition(node.data)}] → ${result ? 'Doğru' : 'Yanlış'}`
    })
    navigate(edgesBySource[`${nodeId}__${result ? 'true' : 'false'}`], depth + 1)

  } else if (node.type === 'conditionSwitch') {
    const handle = evalSwitch(node.data)
    const label  = handle === 'default'
      ? 'varsayılan'
      : `case: ${(node.data.cases || []).find(c => `case-${c.id}` === handle)?.label || handle}`
    stepLog.value.push({ kind: 'switch', icon: '⇒', text: `Switch [${node.data.variable}] → ${label}` })
    navigate(edgesBySource[`${nodeId}__${handle}`], depth + 1)

  } else if (node.type === 'setVariable') {
    const desc = execSetVar(node.data)
    stepLog.value.push({ kind: 'setvar', icon: '⚙', text: `Değişken: ${desc}` })
    navigate(edgesBySource[`${nodeId}__output`], depth + 1)
  }
  // dialogue and choice: stay here, await user input
}

function endStory(msg) {
  phase.value = 'ended'
  endMessage.value = msg
  currentId.value = null
}

// ── User actions ──────────────────────────────────────────────────────────────
function advance() {
  stepLog.value = []
  const next = edgesBySource[`${currentId.value}__output`]
  if (!next) { endStory('Diyalogdan sonra bağlantı bulunamadı.'); return }
  navigate(next)
}

function pickChoice(choice) {
  stepLog.value = []
  const next = edgesBySource[`${currentId.value}__choice-${choice.id}`]
  if (!next) { endStory(`"${choice.text}" seçeneğinden sonra bağlantı bulunamadı.`); return }
  navigate(next)
}

function restart() {
  context.value  = buildInitialContext()
  stepLog.value  = []
  phase.value    = 'playing'
  endMessage.value = ''
  navigate(props.story.startNodeId || props.story.nodes?.[0]?.id)
}

// ── Computed helpers ──────────────────────────────────────────────────────────
const currentNode = computed(() => currentId.value ? nodesById[currentId.value] : null)

const visibleChoices = computed(() => {
  if (currentNode.value?.type !== 'choice') return []
  return (currentNode.value.data.choices || []).filter(ch => {
    if (!ch.condition) return true
    return evalSingleCond(ch.condition)
  })
})

// Substitute $varName$ tokens with live context values
const renderedText = computed(() => {
  const raw = currentNode.value?.data?.text || ''
  const escaped = raw
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return escaped.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)\$/g, (_, name) => {
    const val = context.value[name]
    if (val === undefined) return `<span class="var-unknown">$${name}$</span>`
    return `<span class="var-live">${String(val)}</span>`
  })
})

// ── Condition evaluation ──────────────────────────────────────────────────────
function evalSingleCond(cond) {
  const lhs = context.value[cond.variable]
  const rhs = coerce(cond.value, typeof lhs)
  switch (cond.operator) {
    case '==': return lhs == rhs
    case '!=': return lhs != rhs
    case '>':  return lhs > rhs
    case '<':  return lhs < rhs
    case '>=': return lhs >= rhs
    case '<=': return lhs <= rhs
    default:   return false
  }
}

function evalCondition(data) {
  // Legacy flat format support
  if (data.variable !== undefined) return evalSingleCond(data)
  const conds = data.conditions || []
  if (!conds.length) return false
  let result
  if (data.logic === 'and') result = conds.every(c => evalSingleCond(c))
  else if (data.logic === 'or') result = conds.some(c => evalSingleCond(c))
  else result = evalSingleCond(conds[0])
  return data.negate ? !result : result
}

function evalSwitch(data) {
  const lhs = context.value[data.variable]
  for (const c of (data.cases || [])) {
    const rhs = coerce(c.value, typeof lhs)
    let match = false
    switch (c.operator) {
      case '==': match = lhs == rhs; break
      case '!=': match = lhs != rhs; break
      case '>':  match = lhs > rhs;  break
      case '<':  match = lhs < rhs;  break
      case '>=': match = lhs >= rhs; break
      case '<=': match = lhs <= rhs; break
    }
    if (match) return `case-${c.id}`
  }
  return data.hasDefault ? 'default' : null
}

function execSetVar(data) {
  const { variable, operation, value } = data
  if (!variable || !(variable in context.value)) return `${variable} (tanımlanmamış)`
  const curr = context.value[variable]
  let next
  switch (operation) {
    case 'set':      next = coerce(value, typeof curr); break
    case 'add':      next = curr + coerce(value, 'number'); break
    case 'subtract': next = curr - coerce(value, 'number'); break
    case 'multiply': next = curr * coerce(value, 'number'); break
    case 'toggle':   next = !curr; break
    default:         next = value
  }
  context.value[variable] = next
  const sym = { set: '=', add: '+=', subtract: '-=', multiply: '*=', toggle: '= !' }[operation] || '='
  return `${variable} ${sym} ${operation === 'toggle' ? String(next) : value}`
}

function coerce(val, type) {
  if (type === 'number')  return Number(val)
  if (type === 'boolean') return (val === true || val === 'true')
  return String(val)
}

function describeCondition(data) {
  if (data.variable !== undefined) return `${data.variable} ${data.operator} ${data.value}`
  const conds = data.conditions || []
  if (!conds.length) return '(boş)'
  const sep  = data.logic === 'and' ? ' AND ' : data.logic === 'or' ? ' OR ' : ''
  const expr = conds.map(c => `${c.variable} ${c.operator} ${c.value}`).join(sep)
  return data.negate ? `NOT (${expr})` : expr
}

function valClass(val) {
  if (typeof val === 'boolean') return 'v-bool'
  if (typeof val === 'number')  return 'v-num'
  return 'v-str'
}

// ── Keyboard: Esc to close, Enter / Space to continue ─────────────────────────
function onKey(e) {
  if (e.key === 'Escape') { emit('close'); return }
  if ((e.key === 'Enter' || e.key === ' ') && currentNode.value?.type === 'dialogue') {
    e.preventDefault()
    advance()
  }
}
onMounted(() => {
  window.addEventListener('keydown', onKey)
  navigate(props.story.startNodeId || props.story.nodes?.[0]?.id)
})
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
/* ── Overlay ── */
.player-overlay {
  position: fixed;
  inset: 0;
  background: rgba(5, 5, 14, 0.82);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.player-modal {
  display: flex;
  flex-direction: column;
  width: min(640px, 95vw);
  max-height: 90vh;
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 24px 80px rgba(0,0,0,0.6);
}

/* ── Header ── */
.player-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.player-header-left {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.play-icon { color: #4ade80; flex-shrink: 0; }

.play-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #4ade80;
  flex-shrink: 0;
}

.play-sep { color: var(--border-light); }

.play-title {
  font-size: 12px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-header-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.ph-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 5px;
  color: var(--text-secondary);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}
.ph-btn:hover { border-color: var(--border-light); color: var(--text-primary); }

.ph-close {
  padding: 4px 8px;
  border-color: transparent;
}
.ph-close:hover { background: rgba(220,38,38,0.15); border-color: rgba(220,38,38,0.4); color: #f87171; }

/* ── Body ── */
.player-body {
  flex: 1;
  overflow-y: auto;
  padding: 28px 32px;
  min-height: 180px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── State screens ── */
.player-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
  padding: 16px;
}

.state-icon {
  font-size: 32px;
  color: var(--accent);
  margin: 0;
  line-height: 1;
}

.state-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.state-msg {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

.restart-btn {
  margin-top: 12px;
  padding: 7px 20px;
  background: var(--accent);
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s;
}
.restart-btn:hover { background: var(--accent-hover); }

/* ── Step log ── */
.step-log {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.log-entry {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 10px;
  border-radius: 5px;
  font-size: 11px;
  border: 1px solid;
}

.log-entry.condition {
  background: rgba(180,83,9,0.12);
  border-color: rgba(180,83,9,0.3);
  color: #fbbf24;
}

.log-entry.switch {
  background: rgba(109,40,217,0.12);
  border-color: rgba(109,40,217,0.3);
  color: #a78bfa;
}

.log-entry.setvar {
  background: rgba(190,24,93,0.12);
  border-color: rgba(190,24,93,0.3);
  color: #f472b6;
}

.log-icon { flex-shrink: 0; font-size: 12px; }
.log-text { color: inherit; }

/* ── Dialogue ── */
.dialogue-box {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px 22px;
}

.char-name {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--accent);
  margin-bottom: 10px;
}

.dialogue-text {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-primary);
  white-space: pre-wrap;
}

:deep(.var-live) {
  color: #a78bfa;
  font-weight: 600;
}

:deep(.var-unknown) {
  color: #f87171;
  text-decoration: underline dotted;
}

/* ── Choice ── */
.choice-box { }

.choice-prompt {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary);
  margin: 0;
}

.choice-prompt.empty { color: var(--text-muted); font-style: italic; }

/* ── Footer ── */
.player-footer {
  padding: 0 32px 22px;
  flex-shrink: 0;
}

.continue-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}
.continue-btn:hover { background: rgba(124,110,245,0.15); border-color: var(--accent); color: var(--accent); }

.choices-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.choice-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s;
}
.choice-btn:hover {
  background: rgba(13,148,136,0.12);
  border-color: rgba(13,148,136,0.5);
  color: #2dd4bf;
}
.choice-btn svg { color: var(--text-muted); flex-shrink: 0; transition: color 0.15s; }
.choice-btn:hover svg { color: #2dd4bf; }

.no-choices {
  font-size: 12px;
  color: var(--text-muted);
  font-style: italic;
  padding: 8px 0;
  margin: 0;
}

/* ── Context debug bar ── */
.ctx-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 8px 16px;
  background: var(--bg-panel);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.ctx-label {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.ctx-item {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-family: 'Courier New', monospace;
}

.ctx-key  { color: var(--text-secondary); }
.ctx-eq   { color: var(--text-muted); }
.ctx-val.v-num  { color: #60a5fa; }
.ctx-val.v-bool { color: #4ade80; }
.ctx-val.v-str  { color: #fbbf24; }
</style>
