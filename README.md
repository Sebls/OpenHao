# 🇨🇳 Chinese Mandarin Personal Language System (Typst)

A modular, publication-quality **Flashcard & Vocabulary System** built with [Typst](https://typst.app) for systematic Chinese language acquisition.

It features **dual pinyin support**, **character composition and radical breakdowns**, **usage definitions**, **contextual sentence examples**, and **multilingual translations** (English, Spanish, and French).

---

## 📁 Repository Structure

```text
chinois/
├── templates/
│   └── card.typ          # Typst module with card components & page layouts
├── data/
│   └── saludos.json      # Structured vocabulary database (JSON)
├── vocabulary/
│   ├── saludos.typ       # Generated Typst document
│   └── saludos.pdf       # Compiled high-resolution PDF document
├── generate_vocab.py     # Automatic Python generator script
└── README.md             # Documentation and usage guide
```

---

## ✨ Features

1. **Native Chinese Typography**:
   - Automatic fallback using premium Chinese serif and sans-serif fonts (`Songti SC`, `STSong`, `Hiragino Sans GB`, `Heiti SC`).
2. **Frequency Intelligence via [`wordfreq`](https://github.com/rspeer/wordfreq)**:
   - Evaluates logarithmic natural word frequencies using the **Zipf Scale** (from 0 to 8) based on large Chinese text corpora with `jieba` tokenization.
   - Categorizes items into learning tiers: `Top 1k (Essential)`, `Top 5k (Very Common)`, `Common (Conversational)`, `Intermediate`, and `Advanced`.
   - Ability to sort entire vocabulary decks by usage frequency (`--sort-by-frequency`).
3. **Dual Pinyin System**:
   - **Phonetic Pronunciation**: Reflects real pronunciation (e.g. Tone Sandhi variations such as third-tone changes).
   - **Standard Written Pinyin**: Canonical capitalized orthography.
4. **Character Composition & Radical Splitting**:
   - Decomposes each compound character into its constituent glyphs, with individual pinyin, meaning, and radical classification.
   - Includes etymology and morphological logic notes (e.g. `大家` = big + family = *everyone*).
5. **Contextual Examples**:
   - Full conversational example sentences in Hanzi with pinyin and English/Spanish translations.
6. **Multilingual Support**:
   - 🇬🇧 English
   - 🇪🇸 Spanish
   - 🇫🇷 French
   - 🇨🇳 Simplified Chinese characters
7. **Dual Presentation Modes**:
   - **Detailed Study Card (`vocab-card`)**: Full card view with definition, character split boxes, Zipf score badge, example sentences, and pedagogical tips.
   - **Compact Flashcard Grid (`vocab-card-compact`)**: 2-column printable layout with frequency metrics designed for cutting out physical flashcards.

---

## 🚀 Quick Start

### 1. Automatic Python Generator (Recommended)

Convert any JSON vocabulary dataset into Typst documents and compiled PDFs inside the `vocabulary/` directory:

```bash
# Process all JSON files inside data/ and compile to vocabulary/*.pdf
python3 generate_vocab.py

# Process a specific file
python3 generate_vocab.py data/saludos.json

# Generate .typ files only without compiling to PDF
python3 generate_vocab.py --no-compile
```

### 2. Live Preview (Watch Mode)

Recompiles instantly whenever you edit any file:

```bash
typst watch --root . vocabulary/saludos.typ
```

---

## 📋 Data Schema (`data/*.json`)

You can create or expand vocabulary lists using this JSON format:

```json
{
  "hanzi": "你好",
  "phonetic": "nǐ hǎo",
  "written": "Nǐ hǎo",
  "definition": "The most fundamental and ubiquitous greeting in the Chinese language.",
  "breakdown": [
    {
      "char": "你",
      "pinyin": "nǐ",
      "meaning": "you (singular)",
      "radical": "亻 (person)"
    },
    {
      "char": "好",
      "pinyin": "hǎo",
      "meaning": "good, fine, well",
      "radical": "女 (woman)"
    }
  ],
  "composition_note": "你 (you) + 好 (good). Literally: 'You be well'.",
  "en": "Hello / Hi",
  "es": "Hola",
  "fr": "Bonjour / Salut",
  "example": {
    "zh": "你好！很高兴认识你。",
    "pinyin": "Nǐ hǎo! Hěn gāoxìng rènshí nǐ.",
    "en": "Hello! Nice to meet you.",
    "es": "¡Hola! Mucho gusto en conocerte."
  },
  "category": "Greetings / 问候",
  "tags": ["HSK 1", "Basic", "Daily"],
  "note": "Tone Sandhi: When two 3rd tones meet, the first is pronounced as a 2nd tone."
}
```

---

## ✍️ Typst Usage Example

```typst
#import "templates/card.typ": card-doc, vocab-card

#show: card-doc.with(
  title: "Chinese Mandarin Learning System",
  subtitle: "Personal Vocabulary Cards"
)

#vocab-card(
  hanzi: "你好",
  pinyin-phonetic: "nǐ hǎo",
  pinyin-written: "Nǐ hǎo",
  definition: "Standard Chinese greeting.",
  breakdown: (
    (char: "你", pinyin: "nǐ", meaning: "you", radical: "亻 (person)"),
    (char: "好", pinyin: "hǎo", meaning: "good", radical: "女 (woman)")
  ),
  composition-note: "你 (you) + 好 (good) = Wish you well.",
  en: "Hello / Hi",
  es: "Hola",
  fr: "Bonjour / Salut",
  example: (
    zh: "你好！很高兴认识你。",
    pinyin: "Nǐ hǎo! Hěn gāoxìng rènshí nǐ.",
    en: "Hello! Nice to meet you."
  ),
  tags: ("HSK 1", "Basic")
)
```
