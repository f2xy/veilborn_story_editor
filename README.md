# Veilborn Story Editor

**Veilborn** metin tabanlı bir hikaye oyunu için geliştirilmiş görsel, node tabanlı bir hikaye editörüdür. Editörde oluşturulan hikayeler JSON formatında dışa aktarılarak oyun motoru tarafından tüketilir.

## Özellikler

- Node tabanlı görsel editör (Vue Flow canvas)
- 5 farklı node tipi: Dialogue, Choice, Condition, ConditionSwitch, SetVariable
- Context parametre sistemi (global hikaye değişkenleri)
- Otomatik kayıt (localStorage, 600ms debounce)
- JSON import/export

## Teknoloji Yığını

- **UI:** Vue 3 (Composition API)
- **Canvas:** [@vue-flow/core](https://vueflow.dev/) v1
- **Build:** Vite 5

## Kurulum

```bash
npm install
npm run dev
```

## Geliştirme Komutları

```bash
npm run dev      # Geliştirme sunucusu (Vite HMR)
npm run build    # Üretim derlemesi → dist/
npm run preview  # dist/ klasörünü önizle
```

## Node Tipleri

| Node | Açıklama |
|------|----------|
| `dialogue` | Karakter konuşması veya anlatı metni |
| `choice` | Oyuncuya seçenek sunar |
| `condition` | AND/OR/NOT mantığıyla koşullu dallanma |
| `conditionSwitch` | Bir değişkeni birden fazla case'e karşı karşılaştırır |
| `setVariable` | Context değişkenini günceller |

## JSON Çıktı Formatı

```json
{
  "version": "1.0",
  "title": "Hikaye Adı",
  "startNodeId": "dialogue_1_...",
  "context": { },
  "nodes": [],
  "edges": []
}
```
