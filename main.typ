#import "templates/card.typ": card-doc, vocab-card, vocab-card-compact, render-vocab-list

#show: card-doc.with(
  title: "Vocabulario de Chino Mandarín",
  subtitle: "Sistema Personal de Aprendizaje · Tarjetas de Vocabulario y Expresiones",
  author: "Personal Language System"
)

== Lección 1: Saludos y Fórmulas de Cortesía / 第一课：问候与礼貌

// Carga directa desde JSON de datos
#let saludos-data = json("data/saludos.json")

#render-vocab-list(saludos-data)

#pagebreak()

== Vista en Cuadrícula / Tarjetas Recortables (Compact Grid)
#v(6pt)

#grid(
  columns: (1fr, 1fr),
  column-gutter: 14pt,
  row-gutter: 14pt,
  ..saludos-data.map(item => vocab-card-compact(
    hanzi: item.at("hanzi"),
    pinyin-phonetic: item.at("phonetic", default: none),
    pinyin-written: item.at("written", default: none),
    es: item.at("es", default: none),
    en: item.at("en", default: none),
    fr: item.at("fr", default: none),
    category: item.at("category", default: "HSK 1")
  ))
)
