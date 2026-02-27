# Veilborn Story Editor — Agent Kılavuzu

Bu dosya, gelecekteki geliştirme oturumlarında yapay zeka ajanlarının projeyi sıfırdan anlayarak işe başlayabilmesi için yazılmıştır.

---

## Projenin Amacı

**Veilborn**, metin tabanlı bir hikaye oyunudur. Bu repo; hikaye içeriklerini **görsel, node tabanlı** bir arayüzde tasarlamak için kullanılan **Story Editor** uygulamasını içerir. Editörde oluşturulan hikayeler **JSON** dosyası olarak dışa aktarılır ve oyun motoru tarafından tüketilir.

---

## Teknoloji Yığını

| Katman | Araç |
|--------|------|
| UI Framework | Vue 3 (Composition API + `<script setup>`) |
| Canvas / Flow | `@vue-flow/core` v1 + `@vue-flow/background`, `@vue-flow/controls`, `@vue-flow/minimap` |
| State | Vue `reactive` — harici store kütüphanesi yok |
| Build | Vite 5 |
| Stil | Scoped `<style>` + global `src/styles/base.css` (CSS variables) |

---

## Dosya Yapısı

```
veilborn_story_editor/
├── index.html
├── vite.config.js
├── package.json
├── src/
│   ├── main.js                          # Vue uygulamasını mount eder
│   ├── App.vue                          # Kök bileşen; canvas, toolbar, paneller, localStorage
│   ├── store.js                         # Tüm state + yardımcı fonksiyonlar
│   ├── styles/
│   │   └── base.css                     # Global reset, CSS değişkenleri, ortak sınıflar
│   └── components/
│       ├── EditorToolbar.vue            # Üst bar: marka, node ekleme, import/export
│       ├── ContextPanel.vue             # Sol panel: context parametre yönetimi
│       ├── PropertiesPanel.vue          # Sağ panel: seçili node'un özellikleri
│       └── nodes/
│           ├── DialogueNode.vue         # Diyalog node görünümü (canvas üzerinde)
│           ├── ChoiceNode.vue           # Seçim node görünümü
│           ├── ConditionNode.vue        # Koşul node görünümü (AND/OR/NOT desteği)
│           ├── ConditionSwitchNode.vue  # Switch/case node görünümü
│           └── SetVariableNode.vue      # Değişken atama node görünümü
```

---

## Mimari Genel Bakış

```
App.vue
 ├── EditorToolbar  →  emit: addNode | importJson | exportJson | newStory
 ├── ContextPanel   →  store.contextStore okur/yazar
 ├── VueFlow Canvas →  nodeTypes kaydı, bağlantı, seçim olayları
 │    └── <NodeComponent>  (DialogueNode, ChoiceNode, …)
 └── PropertiesPanel →  seçili node'u store.uiStore.selectedNodeId üzerinden bulur
```

**State akışı:**
`store.js` → `reactive` nesneler (`uiStore`, `contextStore`) → bileşenler direkt import eder.
VueFlow'un kendi node/edge state'i `useVueFlow(FLOW_ID)` composable'ı üzerinden erişilir.

**Auto-save:**
`App.vue` içinde `watch(nodes, ...)`, `watch(contextStore.params, ...)` ve `watch(uiStore.storyTitle, ...)` ile değişiklikler 600ms debounce ile `localStorage['veilborn_autosave']` anahtarına yazılır. Uygulama açılışında `onMounted` içinde bu veri otomatik yüklenir.

---

## `store.js` — Temel Varlıklar

### `uiStore`
```js
{
  selectedNodeId: string | null,  // seçili node'un ID'si
  contextPanelOpen: boolean,      // sol panel açık mı?
  storyTitle: string              // hikaye başlığı (toolbar'da düzenlenir)
}
```

### `contextStore`
```js
{
  params: {
    [name: string]: {
      type: 'number' | 'boolean' | 'string',
      default: number | boolean | string
    }
  }
}
```

### Önemli Fonksiyonlar
| Fonksiyon | Açıklama |
|-----------|----------|
| `genNodeId(type)` | `dialogue_1_1234567890` formatında benzersiz ID üretir |
| `genChoiceId()` | Choice'lar için kısa rastgele ID |
| `genCaseId()` | ConditionSwitch case'leri için kısa rastgele ID |
| `genEdgeId()` | Edge'ler için kısa rastgele ID |
| `createNodeData(type)` | Tipin varsayılan `data` nesnesini döner |
| `addContextParam(name, type)` | Yeni parametre ekler, başarı/başarısızlık `boolean` döner |
| `removeContextParam(name)` | Parametre siler |
| `updateContextParamDefault(name, value)` | Varsayılan değeri günceller |
| `updateContextParamType(name, type)` | Tipi değiştirir, default'u resetler |
| `loadStory(json, flowInstance)` | JSON'dan hikaye yükler (import) |
| `exportStory(flowInstance)` | Mevcut canvas'ı JSON'a çevirir (export) |

---

## Node Tipleri

Her node, VueFlow'da bir `{ id, type, position, data }` nesnesidir.
Canvas üzerindeki görsel bileşenler `src/components/nodes/` içindedir.
Özellikleri `PropertiesPanel.vue` içinde düzenlenir.

### 1. `dialogue`
Karakter konuşması veya anlatı metni.

```jsonc
{
  "character": "Narrator",  // opsiyonel
  "text": "Karanlık bir ormanda uyandın…"
}
```

**Handle'lar:** `input` (top) → `output` (bottom)

---

### 2. `choice`
Oyuncuya seçenek sunar. Her seçeneğin kendi handle'ı vardır (sağ kenarda).

```jsonc
{
  "prompt": "Ne yapmak istersin?",
  "choices": [
    {
      "id": "ch_abc123",
      "text": "Ormana gir",
      "condition": null
      // veya condition varsa:
      // "condition": { "variable": "health", "operator": ">", "value": 20 }
    }
  ]
}
```

**Handle'lar:** `input` (top) + her choice için `choice-{choice.id}` (right, dikey olarak dağıtılmış)

---

### 3. `condition`
Context parametresine göre otomatik `true/false` dallanması yapar.
AND / OR mantıksal operatörleriyle birden fazla koşul birleştirilebilir.
NOT ile tüm ifade terslenebilir.

```jsonc
{
  "logic": "and",     // "single" | "and" | "or"
  "negate": false,    // true → tüm ifadeyi NOT ile sarar
  "conditions": [
    { "variable": "health", "operator": ">=", "value": 50 },
    { "variable": "hasKey", "operator": "==", "value": true }
  ]
}
```

**Operatörler:** `==`, `!=`, `>`, `<`, `>=`, `<=`

**Handle'lar:** `input` (top) + `true` (right-top) + `false` (right-bottom)

**Geriye uyumluluk:** Eski format `{ variable, operator, value }` canvas'ta ve panelde doğru şekilde gösterilir. Herhangi bir değişiklik yapılırsa yeni formata otomatik geçer.

---

### 4. `conditionSwitch`
Bir değişkeni birden fazla case'e karşı karşılaştırır ve eşleşen case'in handle'ına yönlendirir.

```jsonc
{
  "variable": "faction",
  "cases": [
    { "id": "case_abc", "operator": "==", "value": "rebels", "label": "Rebels" },
    { "id": "case_def", "operator": "==", "value": "empire", "label": "Empire" },
    { "id": "case_ghi", "operator": ">",  "value": 50,       "label": ">50" }
  ],
  "hasDefault": true
}
```

**Handle'lar:** `input` (top) + her case için `case-{case.id}` (right, dağıtılmış) + `default` (right-bottom, `hasDefault` ise)

---

### 5. `setVariable`
Context parametresinin değerini günceller, sonra tek bir çıkışla devam eder.

```jsonc
{
  "variable": "gold",
  "operation": "add",   // set | add | subtract | multiply | toggle
  "value": 10           // toggle operasyonunda value kullanılmaz
}
```

**İşlemler:**
- `set` → `variable = value`
- `add` → `variable += value`
- `subtract` → `variable -= value`
- `multiply` → `variable *= value`
- `toggle` → `variable = !variable` (yalnızca boolean'lar için)

**Handle'lar:** `input` (top) → `output` (bottom)

---

## JSON Çıktı Formatı (Story Format v1.0)

`exportStory()` tarafından üretilen, oyun motorunun tükettiği format:

```jsonc
{
  "version": "1.0",
  "title": "Hikaye Adı",
  "startNodeId": "dialogue_1_1234567890",
  "context": {
    "health": { "type": "number", "default": 100 },
    "hasKey": { "type": "boolean", "default": false },
    "faction": { "type": "string", "default": "rebels" }
  },
  "nodes": [ /* node listesi */ ],
  "edges": [ /* edge listesi */ ]
}
```

---

## Context Parametre Sistemi

Context; hikaye boyunca takip edilen **global durum değişkenleri** kümesidir.

- Editörde **sol panelden** tanımlanır (isim, tip, başlangıç değeri)
- `condition` ve `conditionSwitch` node'ları bu değişkenleri **okur**
- `setVariable` node'ları bu değişkenleri **yazar**
- `choice` node'larındaki koşullar da bu değişkenleri okur

**Desteklenen tipler:** `number`, `boolean`, `string`

**İsimlendirme kuralı:** `^[a-zA-Z_][a-zA-Z0-9_]*$`

---

## Auto-Save (localStorage)

- **Anahtar:** `veilborn_autosave`
- **Tetikleyici:** node değişimi, edge değişimi, başlık değişimi, context değişimi
- **Debounce:** 600ms (çok sık yazımı önler)
- **Yükleme:** `onMounted` + `nextTick` + 80ms gecikme (VueFlow init'i bekler)
- **Gösterge:** Canvas'ın üstünde geçici "Auto-saved" badge'i
- **Temizleme:** "New Story" ile `localStorage.removeItem(AUTOSAVE_KEY)` çağrılır
- `_suppressSave` flag'i yükleme sırasındaki sahte save tetiklenmelerini önler

---

## UI Layout

```
┌─────────────────────────────────────────────────────────┐
│  TOOLBAR: Brand | Node Ekle | Context | Import/Export   │  ← 48px sabit
├──────────┬──────────────────────────────┬───────────────┤
│          │   [Auto-saved] badge (top)   │               │
│ Context  │     VueFlow Canvas           │  Properties   │
│  Panel   │     (sonsuz canvas)          │    Panel      │
│ (280px)  │                              │   (280px)     │
│          │  Dots arka plan              │               │
│ Params   │  Minimap (sağ alt)           │ Seçili node'un│
│ listesi  │  Controls (sol alt)          │ düzenleme     │
│          │                              │ formu         │
└──────────┴──────────────────────────────┴───────────────┘
```

---

## CSS Değişkenleri (Design Tokens)

`src/styles/base.css` içinde tanımlı:

```css
/* Arka planlar */
--bg-primary:   #0b0b16
--bg-secondary: #111120
--bg-tertiary:  #181828
--bg-panel:     #13131f

/* Kenarlıklar */
--border:       #252540
--border-light: #33335a

/* Metin */
--text-primary:   #e4e4f0
--text-secondary: #8888aa
--text-muted:     #55557a

/* Vurgu */
--accent:       #7c6ef5
--accent-hover: #9485ff

/* Node tipi renkleri */
--c-dialogue:    #4f46e5   /* indigo */
--c-choice:      #0d9488   /* teal */
--c-condition:   #b45309   /* amber */
--c-condswitch:  #6d28d9   /* violet */
--c-setvar:      #be185d   /* pink */

/* Node boyutları */
--node-width:  260px
--panel-width: 280px
```

---

## Geliştirme Komutları

```bash
npm run dev      # Geliştirme sunucusu (Vite HMR)
npm run build    # Üretim derlemesi → dist/
npm run preview  # dist/ klasörünü önizle
```

---

## Gelecekte Yapılacaklar / Genişleme Alanları

- **Play/Preview modu:** Editörün içinde hikayeyi test etmek için mini bir oyun paneli
- **End node:** Hikayenin sona erdiğini işaret eden özel bir node tipi
- **Karakter sistemi:** Yeniden kullanılabilir karakter listesi
- **Hikaye doğrulama:** Bağlantısız node'lar, eksik hedef handle'lar, döngü tespiti
- **Otomatik düzenleme (layout):** Dagre veya ELK algoritmasıyla node'ları otomatik hizalama
- **Undo/Redo:** VueFlow'un `useVueFlow` üzerinden history yönetimi
- **Lokalizasyon:** Çok dilli diyalog metni desteği
- **Yorum node'u:** Canvas üzerine yapışkanlı not bırakmak için görsel-only node
- **Node gruplama / bölüm sistemi:** Büyük hikayeleri bölümlere ayırma

---

## Geliştirici Notları

- VueFlow node bileşenleri `defineProps({ id, data, selected })` alır; `data` node'un içeriğidir.
- Node verisi güncellemek için `updateNode(id, { data: { ...existing, ...patch } })` kullanılır.
- Edge'ler `smoothstep` tipindedir; import sırasında otomatik eklenir.
- `loadStory()` çağrıldığında `_counter` 200_000'e sıfırlanır.
- `condition` node'u eski `{ variable, operator, value }` formatını geriye dönük olarak destekler; panel açılıp değiştirildiğinde yeni formata geçer.
- `conditionSwitch` case handle ID'leri: `case-{case.id}`, default handle: `default`.
- Auto-save `_suppressSave` flag'i ile `loadStory()` çağrısı sırasındaki değişiklik tetiklenmelerinden korunur.
