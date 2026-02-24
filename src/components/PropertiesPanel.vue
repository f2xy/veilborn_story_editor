<template>
  <aside class="props-panel" v-if="node">
    <!-- Panel header -->
    <div class="panel-header">
      <div class="panel-title">
        <span class="type-dot" :style="{ background: typeColor }"></span>
        <span>{{ typeLabel }} Properties</span>
      </div>
      <button class="btn btn-icon btn-ghost" @click="close" title="Close">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <div class="panel-body">
      <div class="node-id-badge">id: {{ node.id }}</div>

      <!-- ── DIALOGUE ─────────────────────────────────────────────────── -->
      <template v-if="node.type === 'dialogue'">
        <div class="form-group">
          <label class="form-label">Character (optional)</label>
          <input class="input" :value="data.character" @input="patch({ character: $event.target.value })"
            placeholder="e.g. Narrator, Hero…" />
        </div>
        <div class="form-group">
          <label class="form-label">Text</label>
          <textarea class="input" :value="data.text" @input="patch({ text: $event.target.value })"
            placeholder="Enter the dialogue or narration text…"></textarea>
        </div>
      </template>

      <!-- ── CHOICE ──────────────────────────────────────────────────── -->
      <template v-else-if="node.type === 'choice'">
        <div class="form-group">
          <label class="form-label">Prompt</label>
          <textarea class="input" :value="data.prompt" @input="patch({ prompt: $event.target.value })"
            placeholder="What is the question / prompt for the player?" style="min-height:56px"></textarea>
        </div>

        <div class="form-label" style="margin-bottom:6px">Choices</div>

        <div class="choice-list">
          <div v-for="(choice, i) in data.choices" :key="choice.id" class="choice-editor">
            <div class="choice-editor-header">
              <span class="choice-num">{{ i + 1 }}</span>
              <input class="input" :value="choice.text"
                @input="updateChoice(i, 'text', $event.target.value)"
                :placeholder="`Choice ${i + 1} text…`" />
              <button class="btn btn-icon btn-ghost btn-danger" @click="removeChoice(i)"
                :disabled="data.choices.length <= 1" title="Remove choice">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <!-- Condition toggle -->
            <div class="condition-toggle">
              <label class="toggle-label">
                <input type="checkbox" :checked="!!choice.condition"
                  @change="toggleChoiceCondition(i, $event.target.checked)" />
                <span>Condition</span>
              </label>
            </div>

            <!-- Condition fields -->
            <div v-if="choice.condition" class="condition-fields">
              <div class="cond-row">
                <select class="input input-sm" :value="choice.condition.variable"
                  @change="updateChoiceCond(i, 'variable', $event.target.value)">
                  <option value="">— variable —</option>
                  <option v-for="(_, n) in contextStore.params" :key="n" :value="n">{{ n }}</option>
                </select>
                <select class="input input-sm cond-op-select" :value="choice.condition.operator"
                  @change="updateChoiceCond(i, 'operator', $event.target.value)">
                  <option v-for="op in operators" :key="op" :value="op">{{ op }}</option>
                </select>
                <input class="input input-sm cond-val-input"
                  :value="String(choice.condition.value)"
                  @input="updateChoiceCond(i, 'value', parseCondValue(choice.condition.variable, $event.target.value))"
                  placeholder="value" />
              </div>
            </div>
          </div>
        </div>

        <button class="btn" style="width:100%;margin-top:6px" @click="addChoice">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Choice
        </button>
      </template>

      <!-- ── CONDITION ───────────────────────────────────────────────── -->
      <template v-else-if="node.type === 'condition'">
        <div class="form-group">
          <label class="form-label">Variable</label>
          <select class="input" :value="data.variable" @change="patch({ variable: $event.target.value })">
            <option value="">— select variable —</option>
            <option v-for="(_, n) in contextStore.params" :key="n" :value="n">{{ n }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Operator</label>
          <select class="input" :value="data.operator" @change="patch({ operator: $event.target.value })">
            <option v-for="op in operators" :key="op" :value="op">{{ op }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Value</label>
          <template v-if="selectedParamType === 'boolean'">
            <select class="input" :value="String(data.value)" @change="patch({ value: $event.target.value === 'true' })">
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </template>
          <template v-else>
            <input class="input" :value="String(data.value ?? '')"
              @input="patch({ value: parseCondValue(data.variable, $event.target.value) })"
              placeholder="comparison value" />
          </template>
        </div>
        <div class="condition-preview">
          <span class="cv">{{ data.variable || '?' }}</span>
          <span class="co">{{ data.operator }}</span>
          <span class="cv2">{{ data.value !== undefined && data.value !== '' ? String(data.value) : '?' }}</span>
        </div>
        <div class="branch-info">
          <div class="bi bi-true">→ <strong>True</strong> output: right top handle</div>
          <div class="bi bi-false">→ <strong>False</strong> output: right bottom handle</div>
        </div>
      </template>

      <!-- ── SET VARIABLE ────────────────────────────────────────────── -->
      <template v-else-if="node.type === 'setVariable'">
        <div class="form-group">
          <label class="form-label">Variable</label>
          <select class="input" :value="data.variable" @change="patch({ variable: $event.target.value })">
            <option value="">— select variable —</option>
            <option v-for="(_, n) in contextStore.params" :key="n" :value="n">{{ n }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Operation</label>
          <select class="input" :value="data.operation" @change="onOperationChange($event.target.value)">
            <option value="set">set (=)</option>
            <option value="add">add (+=)</option>
            <option value="subtract">subtract (-=)</option>
            <option value="multiply">multiply (*=)</option>
            <option value="toggle">toggle (= !)</option>
          </select>
        </div>
        <div class="form-group" v-if="data.operation !== 'toggle'">
          <label class="form-label">Value</label>
          <template v-if="selectedParamType === 'boolean' && data.operation === 'set'">
            <select class="input" :value="String(data.value)" @change="patch({ value: $event.target.value === 'true' })">
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </template>
          <template v-else>
            <input class="input" :value="String(data.value ?? '')"
              @input="patch({ value: parseCondValue(data.variable, $event.target.value) })"
              :placeholder="selectedParamType === 'number' ? '0' : 'value'" />
          </template>
        </div>
        <div class="condition-preview">
          <span class="cv">{{ data.variable || '?' }}</span>
          <span class="co">{{ opSymbol }}</span>
          <span class="cv2">{{ data.operation === 'toggle' ? '!' + (data.variable || '?') : (data.value !== undefined && data.value !== '' ? String(data.value) : '?') }}</span>
        </div>
      </template>
    </div>

    <!-- Delete node -->
    <div class="panel-footer">
      <button class="btn btn-danger" style="width:100%" @click="deleteCurrentNode">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14H6L5 6"/>
          <path d="M10 11v6"/>
          <path d="M14 11v6"/>
          <path d="M9 6V4h6v2"/>
        </svg>
        Delete Node
      </button>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useVueFlow } from '@vue-flow/core'
import { uiStore, contextStore, genChoiceId, FLOW_ID } from '@/store.js'

const { findNode, updateNode, removeNodes, removeEdges, getEdges } = useVueFlow(FLOW_ID)

const node = computed(() => {
  if (!uiStore.selectedNodeId) return null
  return findNode(uiStore.selectedNodeId) || null
})

const data = computed(() => node.value?.data ?? {})

const operators = ['==', '!=', '>', '<', '>=', '<=']

const typeLabel = computed(() => {
  const labels = { dialogue: 'Dialogue', choice: 'Choice', condition: 'Condition', setVariable: 'Set Variable' }
  return labels[node.value?.type] ?? node.value?.type
})

const typeColor = computed(() => {
  const colors = {
    dialogue: 'var(--c-dialogue)',
    choice: 'var(--c-choice)',
    condition: 'var(--c-condition)',
    setVariable: 'var(--c-setvar)'
  }
  return colors[node.value?.type] ?? 'var(--accent)'
})

const selectedParamType = computed(() => {
  const varName = data.value?.variable
  return varName && contextStore.params[varName]?.type
})

const opSymbol = computed(() => {
  const ops = { set: '=', add: '+=', subtract: '-=', multiply: '*=', toggle: '= !' }
  return ops[data.value?.operation] ?? '='
})

function patch(updates) {
  if (!node.value) return
  updateNode(node.value.id, { data: { ...data.value, ...updates } })
}

function close() {
  uiStore.selectedNodeId = null
}

function deleteCurrentNode() {
  if (!node.value) return
  const id = node.value.id
  uiStore.selectedNodeId = null
  removeNodes([id])
}

// ── Choice helpers ──────────────────────────────────────────────────────────
function addChoice() {
  const choices = [...(data.value.choices || [])]
  choices.push({ id: genChoiceId(), text: '', condition: null })
  patch({ choices })
}

function removeChoice(index) {
  const choices = [...(data.value.choices || [])]
  const removed = choices.splice(index, 1)[0]
  // Clean up edges connected to this choice handle
  const edgesToRemove = getEdges.value.filter(e =>
    e.source === node.value.id && e.sourceHandle === `choice-${removed.id}`
  )
  if (edgesToRemove.length) removeEdges(edgesToRemove.map(e => e.id))
  patch({ choices })
}

function updateChoice(index, field, value) {
  const choices = data.value.choices.map((c, i) => i === index ? { ...c, [field]: value } : c)
  patch({ choices })
}

function toggleChoiceCondition(index, enabled) {
  const choices = data.value.choices.map((c, i) => {
    if (i !== index) return c
    return { ...c, condition: enabled ? { variable: '', operator: '==', value: '' } : null }
  })
  patch({ choices })
}

function updateChoiceCond(index, field, value) {
  const choices = data.value.choices.map((c, i) => {
    if (i !== index || !c.condition) return c
    return { ...c, condition: { ...c.condition, [field]: value } }
  })
  patch({ choices })
}

function parseCondValue(varName, raw) {
  const type = contextStore.params[varName]?.type
  if (type === 'number') return raw === '' ? '' : Number(raw)
  if (type === 'boolean') return raw === 'true'
  return raw
}

function onOperationChange(op) {
  patch({ operation: op, value: op === 'toggle' ? undefined : data.value.value })
}
</script>

<style scoped>
.props-panel {
  width: var(--panel-width);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-panel);
  border-left: 1px solid var(--border);
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
  gap: 7px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--text-secondary);
}

.type-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.node-id-badge {
  display: inline-block;
  font-size: 10px;
  font-family: monospace;
  color: var(--text-muted);
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 2px 7px;
  margin-bottom: 12px;
}

/* Choice editor */
.choice-list { display: flex; flex-direction: column; gap: 8px; }

.choice-editor {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 8px;
}

.choice-editor-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.choice-num {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--c-choice);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}

.condition-toggle {
  margin-bottom: 6px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-muted);
  cursor: pointer;
  user-select: none;
}

.condition-fields {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: 7px;
}

.cond-row {
  display: flex;
  gap: 5px;
  align-items: center;
}

.cond-op-select { width: 54px; flex-shrink: 0; }
.cond-val-input { width: 70px; flex-shrink: 0; }
.input-sm { padding: 4px 7px; font-size: 11px; }

/* Condition/SetVar preview */
.condition-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-family: monospace;
  font-size: 13px;
  margin-top: 4px;
  margin-bottom: 10px;
}
.cv  { color: #93c5fd; font-weight: 600; }
.co  { color: #fbbf24; }
.cv2 { color: #86efac; }

.branch-info { display: flex; flex-direction: column; gap: 4px; }
.bi { font-size: 11px; color: var(--text-muted); }
.bi-true  { color: #34d399; }
.bi-false { color: #f87171; }

.panel-footer {
  padding: 12px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}
</style>
