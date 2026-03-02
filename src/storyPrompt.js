// Veilborn Story Editor — AI Story Generation Prompt
// This prompt is designed to be pasted into any AI assistant (Claude, GPT, etc.)
// to generate a valid story JSON that can be imported directly into the editor.

export const PROMPT_FILENAME = 'veilborn_ai_story_prompt.txt'

export const STORY_PROMPT = `\
════════════════════════════════════════════════════════════════
  VEILBORN STORY EDITOR — AI STORY GENERATION PROMPT
════════════════════════════════════════════════════════════════

Sen Veilborn adlı metin tabanlı interaktif kurgu oyunu için hikaye yazarısın.
Görevin, Veilborn Story Editor'a doğrudan import edilebilecek eksiksiz ve
geçerli bir JSON hikaye dosyası üretmektir.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ÇIKTI KURALLARI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Yalnızca geçerli JSON çıktısı ver — markdown kod bloğu (json...) YASAK
• JSON'dan önce veya sonra herhangi bir açıklama yazma
• Tüm ID'ler benzersiz string olmalı
• Tüm edge'ler geçerli node ID ve handle ID'lerine referans vermeli

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HİKAYE FORMATI v1.0 — ANA ŞEMA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "version": "1.0",
  "title": "Hikaye Adı",
  "startNodeId": "ilk_node_id",
  "context": {
    "degiskenAdi": { "type": "number|boolean|string", "default": 0 }
  },
  "nodes": [ ...node nesneleri... ],
  "edges": [ ...edge nesneleri... ]
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTEXT DEĞİŞKENLERİ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Hikaye boyunca takip edilen global durum değişkenleridir
• Türler: "number" (tam/ondalık sayı), "boolean" (true/false), "string"
• Diyalog metinlerinde $degiskenAdi$ token'ıyla gösterilir
• "condition" ve "conditionSwitch" node'ları bu değişkenleri OKUR
• "setVariable" node'ları ve choice action'ları bu değişkenleri YAZAR
• İsimlendirme kuralı: ^[a-zA-Z_][a-zA-Z0-9_]*$ (Türkçe karakter KULLANMA)
• Örnekler: health, gold, hasKey, faction, courage, shield

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NODE TİPLERİ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

────────────────────────────────────────
1. dialogue  —  Birincil anlatı / dallanma node'u
────────────────────────────────────────
Temel yapı:
{
  "id": "benzersiz_id",
  "type": "dialogue",
  "position": { "x": 350, "y": 0 },
  "data": {
    "character": "Karakter Adı",
    "text": "Diyalog metni. $degisken$ ile değer gösterilebilir.",
    "choices": []
  }
}

▸ LİNEAR MOD (choices: [] boş dizi):
  - Tek çıkış handle'ı: "output" (alt kenar)
  - Oyuncu "Devam Et" tıklar

▸ DALLANMA MODU (choices dolu dizi):
  - Her choice için bir handle: "choice-{choice.id}" (sağ kenar)
  - Oyuncu bir seçeneği tıklar

Choice nesnesi:
{
  "id": "ch_benzersiz",
  "text": "Oyuncuya gösterilen seçenek metni",
  "condition": null,
  "actions": []
}

  condition (null = her zaman görünür, veya koşullu görünürlük):
    { "variable": "degisken", "operator": ">=", "value": 50 }
    Operatörler: "==", "!=", ">", "<", ">=", "<="

  actions (seçilince çalışan değişken atamaları, birden fazla olabilir):
    { "variable": "degisken", "operation": "add", "value": 10 }
    Operasyonlar:
      "set"      → değişken = değer
      "add"      → değişken += değer
      "subtract" → değişken -= değer
      "multiply" → değişken *= değer
      "toggle"   → değişken = !değişken  (yalnızca boolean)

────────────────────────────────────────
2. condition  —  Otomatik true/false dallanması
────────────────────────────────────────
{
  "id": "benzersiz_id",
  "type": "condition",
  "position": { "x": 350, "y": 400 },
  "data": {
    "logic": "single",
    "negate": false,
    "conditions": [
      { "variable": "degisken", "operator": ">=", "value": 50 }
    ]
  }
}

  logic: "single" (tek koşul) | "and" (hepsi eşleşmeli) | "or" (biri eşleşmeli)
  negate: true → tüm ifadeyi NOT ile sarar
  Çıkış handle'ları: "true" (sağ üst) ve "false" (sağ alt)

────────────────────────────────────────
3. conditionSwitch  —  Çok yollu eşleşme
────────────────────────────────────────
{
  "id": "benzersiz_id",
  "type": "conditionSwitch",
  "position": { "x": 350, "y": 400 },
  "data": {
    "variable": "faction",
    "cases": [
      { "id": "case_1", "operator": "==", "value": "rebels", "label": "İsyancılar" },
      { "id": "case_2", "operator": "==", "value": "empire",  "label": "İmparatorluk" }
    ],
    "hasDefault": true
  }
}

  Çıkış handle'ları: "case-{case.id}" her case için, "default" (hasDefault: true ise)

────────────────────────────────────────
4. setVariable  —  Değişken atama node'u
────────────────────────────────────────
{
  "id": "benzersiz_id",
  "type": "setVariable",
  "position": { "x": 350, "y": 400 },
  "data": {
    "variable": "health",
    "operation": "subtract",
    "value": 25
  }
}

  Operasyonlar: "set", "add", "subtract", "multiply", "toggle"
  Çıkış handle: "output" (alt kenar)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EDGE FORMATI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "id": "e_benzersiz",
  "source": "kaynak_node_id",
  "sourceHandle": "handle_adı",
  "target": "hedef_node_id",
  "targetHandle": "input"
}

Tüm node'lar "input" targetHandle'ı kabul eder (üst kenar).

sourceHandle değerleri node tipine göre:
  dialogue (linear)    → "output"
  dialogue (branching) → "choice-{choice.id}"
  condition            → "true" veya "false"
  conditionSwitch      → "case-{case.id}" veya "default"
  setVariable          → "output"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASARIM KURALLARI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. startNodeId, nodes dizisinin ilk elemanının id'si olmalı
2. Her non-terminal node'un tüm çıkış handle'ları edge ile bağlı olmalı
3. Terminal node'lar: choices:[] olan ve hiç outgoing edge'i olmayan dialogue node'ları
4. Tüm choices → aynı hedef node'a bağlanabilir (değişken manüpülasyonu için ideal)
5. Node konumları: Y ekseni aşağı doğru artar; ana yol x≈350, sol dal x≈20-100, sağ dal x≈700+
6. Node'lar arası dikey mesafe: 200-300px önerilir
7. Edge ID'leri benzersiz olmalı ("e1", "e2"... ya da "e_intro_alarm" formatı)
8. Değişken adlarında Türkçe karakter kullanma (ı,ğ,ü,ş,ö,ç yerine i,g,u,s,o,c)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KÜÇÜK ÖRNEK (referans için)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "version": "1.0",
  "title": "Kavşak",
  "startNodeId": "d_baslangic",
  "context": {
    "cesaret": { "type": "number", "default": 50 }
  },
  "nodes": [
    {
      "id": "d_baslangic",
      "type": "dialogue",
      "position": { "x": 350, "y": 0 },
      "data": {
        "character": "Anlatıcı",
        "text": "Bir kavşakta duruyorsunuz. Cesaret: $cesaret$",
        "choices": [
          {
            "id": "ch_karanlik",
            "text": "Karanlık yola gir",
            "condition": null,
            "actions": [{ "variable": "cesaret", "operation": "subtract", "value": 20 }]
          },
          {
            "id": "ch_guvenli",
            "text": "Güvenli yolu seç",
            "condition": null,
            "actions": [{ "variable": "cesaret", "operation": "add", "value": 10 }]
          }
        ]
      }
    },
    {
      "id": "cond_cesaret",
      "type": "condition",
      "position": { "x": 350, "y": 260 },
      "data": {
        "logic": "single",
        "negate": false,
        "conditions": [{ "variable": "cesaret", "operator": ">=", "value": 40 }]
      }
    },
    {
      "id": "d_kazan",
      "type": "dialogue",
      "position": { "x": 680, "y": 500 },
      "data": {
        "character": "Anlatıcı",
        "text": "Başardınız! Kalan cesaret: $cesaret$\\n\\n— KAZANDINIZ —",
        "choices": []
      }
    },
    {
      "id": "d_kaybet",
      "type": "dialogue",
      "position": { "x": 20, "y": 500 },
      "data": {
        "character": "Anlatıcı",
        "text": "Cesaret tükendi.\\n\\n— OYUN BİTTİ —",
        "choices": []
      }
    }
  ],
  "edges": [
    { "id": "e1", "source": "d_baslangic",  "sourceHandle": "choice-ch_karanlik", "target": "cond_cesaret", "targetHandle": "input" },
    { "id": "e2", "source": "d_baslangic",  "sourceHandle": "choice-ch_guvenli",  "target": "cond_cesaret", "targetHandle": "input" },
    { "id": "e3", "source": "cond_cesaret", "sourceHandle": "true",               "target": "d_kazan",      "targetHandle": "input" },
    { "id": "e4", "source": "cond_cesaret", "sourceHandle": "false",              "target": "d_kaybet",     "targetHandle": "input" }
  ]
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GÖREVİN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Yukarıdaki Veilborn Story Format v1.0 şemasına uygun, eksiksiz bir
hikaye JSON'u üret. Hikaye şu kriterleri karşılamalı:

  ✦ En az 3 oyuncu kararı içermeli
  ✦ En az 2 context değişkeni olmalı (sayısal veya boolean)
  ✦ Choice action'larıyla değişkenler manipüle edilmeli
  ✦ Condition node'larıyla değişkenlere göre dallanma yapılmalı
  ✦ En az 2 farklı son olmalı (kaybetme ve kazanma)
  ✦ Kaybetme/kazanma terminal diyalogları açık şekilde belirtilmeli
  ✦ Mümkünse bazı seçeneklerde condition kullanarak (örn. kalkan >= 55)
    oyuncunun önceki kararlarına bağlı seçenek görünürlüğü sağlanmalı

HİKAYE KONUSU / TEMA:
[BURAYA HİKAYENİN KONUSUNU VE GEREKSİNİMLERİNİ YAZ]

Örneğin:
  - "Ortaçağ bir şatoda mahsur kalan bir şövalye. Canavar ile savaş."
  - "2150 yılında bir dedektif. Şüphelileri sorgula, cinayeti çöz."
  - "Büyülü bir ormanda kaybolmuş bir çocuk. Eve dön."

Çıktı yalnızca ham JSON olmalı. Önünde veya arkasında hiçbir metin olmayacak.
`
