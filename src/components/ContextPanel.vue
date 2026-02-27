<template>
  <aside class="context-panel" v-if="uiStore.contextPanelOpen">
    <div class="panel-header">
      <span class="panel-title">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
        </svg>
        Context Params
      </span>
      <span class="param-count">{{ paramCount }}</span>
    </div>

    <div class="panel-body">
      <!-- Existing params -->
      <div
        v-for="(param, name) in contextStore.params"
        :key="name"
        class="param-item"
      >
        <div class="param-name">
          <span class="param-name-text">{{ name }}</span>
          <span class="param-type-badge" :class="`type-${param.type}`">{{ param.type[0].toUpperCase() }}</span>
        </div>
        <div class="param-row">
          <select class="input input-sm" :value="param.type" @change="changeType(name, $event.target.value)">
            <option value="number">number</option>
            <option value="boolean">boolean</option>
            <option value="string">string</option>
          </select>
          <span class="param-eq">=</span>
          <template v-if="param.type === 'boolean'">
            <select class="input input-sm" :value="String(param.default)" @change="changeDefault(name, $event.target.value === 'true')">
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </template>
          <template v-else-if="param.type === 'number'">
            <input type="number" class="input input-sm" :value="param.default"
              @change="changeDefault(name, Number($event.target.value))" />
          </template>
          <template v-else>
            <input type="text" class="input input-sm" :value="param.default"
              @input="changeDefault(name, $event.target.value)" />
          </template>
          <button class="btn btn-icon btn-ghost btn-danger" @click="removeParam(name)" title="Remove">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      <div v-if="paramCount === 0" class="empty-hint">
        No parameters yet.<br/>Add one below.
      </div>
    </div>

    <!-- Add new param form -->
    <div class="add-param">
      <div class="add-param-title">Add Parameter</div>
      <div class="form-group">
        <label class="form-label">Name</label>
        <input class="input" v-model="newName" placeholder="e.g. health" @keydown.enter="addParam" />
      </div>
      <div class="form-group">
        <label class="form-label">Type</label>
        <select class="input" v-model="newType">
          <option value="number">number</option>
          <option value="boolean">boolean</option>
          <option value="string">string</option>
        </select>
      </div>
      <button class="btn btn-accent" style="width:100%" @click="addParam">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add
      </button>
      <div v-if="addError" class="add-error">{{ addError }}</div>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed } from 'vue'
import { uiStore, contextStore, addContextParam, removeContextParam, updateContextParamDefault, updateContextParamType } from '@/store.js'

const newName = ref('')
const newType = ref('number')
const addError = ref('')

const paramCount = computed(() => Object.keys(contextStore.params).length)

function addParam() {
  const name = newName.value.trim()
  if (!name) { addError.value = 'Name is required.'; return }
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) { addError.value = 'Only letters, digits, _'; return }
  if (!addContextParam(name, newType.value)) { addError.value = `"${name}" already exists.`; return }
  newName.value = ''
  addError.value = ''
}

function removeParam(name) { removeContextParam(name) }
function changeDefault(name, value) { updateContextParamDefault(name, value) }
function changeType(name, type) { updateContextParamType(name, type) }
</script>

<style scoped>
.context-panel {
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
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--text-secondary);
}

.param-count {
  font-size: 10px;
  background: var(--bg-tertiary);
  color: var(--text-muted);
  padding: 1px 6px;
  border-radius: 10px;
  border: 1px solid var(--border);
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.param-item {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 8px 9px;
}

.param-name {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.param-name-text {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: 'JetBrains Mono', 'Courier New', monospace;
}

.param-type-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.type-number  { background: rgba(59,130,246,0.2); color: #60a5fa; }
.type-boolean { background: rgba(16,185,129,0.2); color: #34d399; }
.type-string  { background: rgba(245,158,11,0.2); color: #fbbf24; }

.param-row {
  display: flex;
  align-items: center;
  gap: 5px;
}

.param-row .input { flex: 1; min-width: 0; }
.input-sm { padding: 4px 7px; font-size: 11px; }

.param-eq {
  color: var(--text-muted);
  font-family: monospace;
  font-size: 12px;
}

.empty-hint {
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.6;
  padding: 24px 8px;
}

.add-param {
  padding: 12px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
  background: var(--bg-secondary);
}

.add-param-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--text-muted);
  margin-bottom: 10px;
}

.add-error {
  margin-top: 6px;
  font-size: 11px;
  color: #f87171;
}
</style>
