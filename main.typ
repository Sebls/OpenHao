#import "templates/card.typ": card-doc, vocab-card, vocab-card-compact, render-vocab-list

#show: card-doc.with(
  title: "Chinese Mandarin Learning System",
  subtitle: "Personal Vocabulary Cards · Character Breakdown, Etymology & Sentence Examples",
  author: "Personal Language System"
)

== Lesson 1: Greetings & Politeness / 第一课：问候与礼貌

// Automatic rendering directly from structured JSON
#let greetings-data = json("data/saludos.json")

#render-vocab-list(greetings-data)

#pagebreak()

== Printable Flashcards / Cutout Grid View (2-Column)
#v(8pt)

#grid(
  columns: (1fr, 1fr),
  column-gutter: 14pt,
  row-gutter: 14pt,
  ..greetings-data.map(item => vocab-card-compact(
    hanzi: item.at("hanzi"),
    pinyin-phonetic: item.at("phonetic", default: none),
    pinyin-written: item.at("written", default: none),
    es: item.at("es", default: none),
    en: item.at("en", default: none),
    fr: item.at("fr", default: none),
    category: item.at("category", default: "Greetings"),
    breakdown: item.at("breakdown", default: ())
  ))
)
