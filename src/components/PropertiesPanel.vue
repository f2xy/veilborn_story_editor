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
          <textarea class="input" ref="dialogueTextarea" :value="data.text"
            @input="patch({ text: $event.target.value })"
            placeholder="Enter the dialogue or narration text…"></textarea>
          <div v-if="hasContextParams" class="var-chips">
            <span class="var-chips-label">Insert variable:</span>
            <button
              v-for="(_, name) in contextStore.params"
              :key="name"
              class="var-chip"
              :title="`Insert {${name}}`"
              @click="insertVariable(name)"
            >{{ '{' + name + '}' }}</button>
          </div>
          <div class="var-hint">Use <code>{varName}</code> to embed context values in text</div>
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

        <!-- Logic + Negate row -->
        <div class="form-group">
          <label class="form-label">Logic</label>
          <div class="logic-row">
            <select class="input" :value="condLogic" @change="changeCondLogic($event.target.value)">
              <option value="single">Single condition</option>
              <option value="and">AND — all must match</option>
              <option value="or">OR — any must match</option>
            </select>
            <label class="toggle-label negate-toggle">
              <input type="checkbox" :checked="condNegate"
                @change="patch({ logic: condLogic, negate: $event.target.checked, conditions: condConditions })" />
              <span>NOT</span>
            </label>
          </div>
        </div>

        <!-- Condition rows -->
        <div class="form-label" style="margin-bottom:6px">
          {{ condLogic === 'single' ? 'Condition' : 'Conditions' }}
        </div>

        <div class="cond-list">
          <template v-for="(cond, i) in condConditions" :key="i">
            <div v-if="i > 0" class="logic-sep-label">{{ condLogic.toUpperCase() }}</div>
            <div class="cond-editor">
              <div class="cond-row">
                <select class="input input-sm" :value="cond.variable"
                  @change="updateCond(i, 'variable', $event.target.value)">
                  <option value="">— variable —</option>
                  <option v-for="(_, n) in contextStore.params" :key="n" :value="n">{{ n }}</option>
                </select>
                <select class="input input-sm cond-op-select" :value="cond.operator"
                  @change="updateCond(i, 'operator', $event.target.value)">
                  <option v-for="op in operators" :key="op" :value="op">{{ op }}</option>
                </select>
                <template v-if="getParamType(cond.variable) === 'boolean'">
                  <select class="input input-sm cond-val-input" :value="String(cond.value)"
                    @change="updateCond(i, 'value', $event.target.value === 'true')">
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                </template>
                <template v-else>
                  <input class="input input-sm cond-val-input" :value="String(cond.value ?? '')"
                    @input="updateCond(i, 'value', parseCondValue(cond.variable, $event.target.value))"
                    placeholder="value" />
                </template>
                <button v-if="condLogic !== 'single'"
                  class="btn btn-icon btn-ghost btn-danger"
                  @click="removeCond(i)"
                  :disabled="condConditions.length <= 1"
                  title="Remove">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>
          </template>
        </div>

        <button v-if="condLogic !== 'single'" class="btn" style="width:100%;margin-top:6px" @click="addCond">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Condition
        </button>

        <!-- Preview -->
        <div class="condition-preview" style="margin-top:10px; flex-wrap: wrap; gap: 4px;">
          <span v-if="condNegate" class="co" style="color:#e879f9">NOT</span>
          <span class="co">(</span>
          <template v-for="(cond, i) in condConditions" :key="i">
            <span v-if="i > 0" class="co">{{ condLogic.toUpperCase() }}</span>
            <span class="cv">{{ cond.variable || '?' }}</span>
            <span class="co">{{ cond.operator }}</span>
            <span class="cv2">{{ fmtPreviewVal(cond) }}</span>
          </template>
          <span class="co">)</span>
        </div>

        <div class="branch-info" style="margin-top:8px">
          <div class="bi bi-true">→ <strong>True</strong>: right top handle</div>
          <div class="bi bi-false">→ <strong>False</strong>: right bottom handle</div>
        </div>
      </template>

      <!-- ── CONDITION SWITCH ────────────────────────────────────────── -->
      <template v-else-if="node.type === 'conditionSwitch'">
        <div class="form-group">
          <label class="form-label">Variable</label>
          <select class="input" :value="data.variable" @change="patch({ variable: $event.target.value })">
            <option value="">— select variable —</option>
            <option v-for="(_, n) in contextStore.params" :key="n" :value="n">{{ n }}</option>
          </select>
        </div>

        <div class="form-label" style="margin-bottom:6px">Cases</div>

        <div class="choice-list">
          <div v-for="(c, i) in data.cases" :key="c.id" class="choice-editor">
            <div class="choice-editor-header" style="margin-bottom:5px">
              <span class="choice-num" style="background:var(--c-condswitch)">{{ i + 1 }}</span>
              <input class="input" :value="c.label"
                @input="updateCase(i, 'label', $event.target.value)"
                placeholder="Label (optional)" />
              <button class="btn btn-icon btn-ghost btn-danger" @click="removeCase(i)"
                :disabled="data.cases.length <= 1" title="Remove case">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div class="cond-row">
              <select class="input input-sm cond-op-select" :value="c.operator"
                @change="updateCase(i, 'operator', $event.target.value)">
                <option v-for="op in operators" :key="op" :value="op">{{ op }}</option>
              </select>
              <template v-if="switchParamType === 'boolean'">
                <select class="input input-sm" style="flex:1" :value="String(c.value)"
                  @change="updateCase(i, 'value', $event.target.value === 'true')">
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              </template>
              <template v-else>
                <input class="input input-sm" style="flex:1" :value="String(c.value ?? '')"
                  @input="updateCase(i, 'value', parseCondValue(data.variable, $event.target.value))"
                  :placeholder="switchParamType === 'number' ? '0' : 'value'" />
              </template>
            </div>
          </div>
        </div>

        <button class="btn" style="width:100%;margin-top:6px" @click="addCase">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Case
        </button>

        <div class="form-group" style="margin-top:10px">
          <label class="toggle-label">
            <input type="checkbox" :checked="data.hasDefault"
              @change="patch({ hasDefault: $event.target.checked })" />
            <span>Default output (fallthrough)</span>
          </label>
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
import { computed, ref, nextTick } from 'vue'
import { useVueFlow } from '@vue-flow/core'
import { uiStore, contextStore, genChoiceId, genCaseId, FLOW_ID } from '@/store.js'

const { findNode, updateNode, removeNodes, removeEdges, getEdges } = useVueFlow(FLOW_ID)

const node = computed(() => {
  if (!uiStore.selectedNodeId) return null
  return findNode(uiStore.selectedNodeId) || null
})

const data = computed(() => node.value?.data ?? {})

const operators = ['==', '!=', '>', '<', '>=', '<=']

// ── Dialogue variable interpolation ─────────────────────────────────────────
const dialogueTextarea = ref(null)
const hasContextParams = computed(() => Object.keys(contextStore.params).length > 0)

function insertVariable(name) {
  const el = dialogueTextarea.value
  if (!el) return
  const start = el.selectionStart
  const end = el.selectionEnd
  const token = `{${name}}`
  const newText = el.value.slice(0, start) + token + el.value.slice(end)
  patch({ text: newText })
  nextTick(() => {
    el.focus()
    const pos = start + token.length
    el.setSelectionRange(pos, pos)
  })
}

const typeLabel = computed(() => {
  const labels = {
    dialogue: 'Dialogue',
    choice: 'Choice',
    condition: 'Condition',
    conditionSwitch: 'Switch',
    setVariable: 'Set Variable'
  }
  return labels[node.value?.type] ?? node.value?.type
})

const typeColor = computed(() => {
  const colors = {
    dialogue: 'var(--c-dialogue)',
    choice: 'var(--c-choice)',
    condition: 'var(--c-condition)',
    conditionSwitch: 'var(--c-condswitch)',
    setVariable: 'var(--c-setvar)'
  }
  return colors[node.value?.type] ?? 'var(--accent)'
})

// For setVariable
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

// ── Condition helpers ────────────────────────────────────────────────────────

// Normalize both legacy { variable, operator, value } and new { logic, negate, conditions } formats
const condConditions = computed(() => {
  if (data.value.conditions?.length) return data.value.conditions
  return [{ variable: data.value.variable || '', operator: data.value.operator || '==', value: data.value.value ?? '' }]
})

const condLogic = computed(() => data.value.logic || 'single')
const condNegate = computed(() => data.value.negate || false)

function changeCondLogic(newLogic) {
  patch({ logic: newLogic, negate: condNegate.value, conditions: condConditions.value })
}

function updateCond(index, field, value) {
  const conditions = condConditions.value.map((c, i) => i === index ? { ...c, [field]: value } : c)
  patch({ logic: condLogic.value, negate: condNegate.value, conditions })
}

function addCond() {
  const conditions = [...condConditions.value, { variable: '', operator: '==', value: '' }]
  patch({ logic: condLogic.value, negate: condNegate.value, conditions })
}

function removeCond(index) {
  const conditions = condConditions.value.filter((_, i) => i !== index)
  patch({ logic: condLogic.value, negate: condNegate.value, conditions })
}

function getParamType(varName) {
  return contextStore.params[varName]?.type
}

function fmtPreviewVal(cond) {
  const v = cond.value
  if (v === undefined || v === null || v === '') return '?'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return String(v)
}

// ── ConditionSwitch helpers ──────────────────────────────────────────────────

const switchParamType = computed(() => {
  if (node.value?.type !== 'conditionSwitch') return null
  return contextStore.params[data.value.variable]?.type
})

function updateCase(index, field, value) {
  const cases = data.value.cases.map((c, i) => i === index ? { ...c, [field]: value } : c)
  patch({ cases })
}

function addCase() {
  const cases = [...(data.value.cases || []), { id: genCaseId(), operator: '==', value: '', label: '' }]
  patch({ cases })
}

function removeCase(index) {
  const cases = [...(data.value.cases || [])]
  const removed = cases.splice(index, 1)[0]
  const edgesToRemove = getEdges.value.filter(e =>
    e.source === node.value.id && e.sourceHandle === `case-${removed.id}`
  )
  if (edgesToRemove.length) removeEdges(edgesToRemove.map(e => e.id))
  patch({ cases })
}

// ── Shared helpers ───────────────────────────────────────────────────────────
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

/* Condition logic */
.logic-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.negate-toggle { flex-shrink: 0; color: #e879f9; }

.cond-list { display: flex; flex-direction: column; gap: 4px; }

.cond-editor {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 7px;
}

.logic-sep-label {
  text-align: center;
  font-size: 10px;
  font-weight: 800;
  color: var(--text-muted);
  letter-spacing: 1.5px;
  padding: 2px 0;
}

/* Condition/SetVar preview */
.condition-preview {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-family: monospace;
  font-size: 12px;
  margin-top: 4px;
  margin-bottom: 10px;
  flex-wrap: wrap;
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

/* Variable interpolation chips */
.var-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
}

.var-chips-label {
  font-size: 10px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.var-chip {
  font-size: 10px;
  font-family: monospace;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
  border-radius: 4px;
  padding: 2px 6px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  line-height: 1.4;
}

.var-chip:hover {
  background: color-mix(in srgb, var(--accent) 25%, transparent);
  border-color: var(--accent);
}

.var-hint {
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 5px;
}

.var-hint code {
  font-family: monospace;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  padding: 0 3px;
  border-radius: 3px;
}
</style>
