// Chinese Language Flashcards & Vocabulary System Template
// Designed for Typst 0.13+ / 0.15+

#let primary-chinese-font = ("Songti SC", "STSong", "Hiragino Sans GB", "Heiti SC")
#let primary-text-font = ("Helvetica Neue", "Arial", "Heiti SC")

// Document layout function
#let card-doc(
  title: "Chinese Flashcards / 中文卡片",
  subtitle: "Personal Language Learning System",
  author: "User",
  body
) = {
  set document(title: title, author: author)
  set page(
    paper: "a4",
    margin: (x: 1.5cm, top: 1.8cm, bottom: 1.8cm),
    header: context {
      let page-num = counter(page).get().first()
      if page-num > 1 [
        #grid(
          columns: (1fr, auto),
          align(left)[#text(size: 8.5pt, fill: rgb("#718096"), weight: "medium")[#title · #subtitle]],
          align(right)[#text(size: 8.5pt, fill: rgb("#a0aec0"))[Pág. #page-num]]
        )
        #v(2pt)
        #line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))
      ]
    },
    footer: context {
      let page-num = counter(page).get().first()
      align(center)[
        #text(size: 8pt, fill: rgb("#a0aec0"))[
          🇨🇳 Sistema Personal de Aprendizaje de Chino Mandarín · #page-num
        ]
      ]
    }
  )

  set text(
    font: primary-text-font,
    size: 11pt,
    fill: rgb("#2d3748"),
    lang: "es"
  )

  // Header Title banner
  align(center)[
    #block(
      width: 100%,
      fill: rgb("#fffaf0"),
      inset: (x: 18pt, y: 16pt),
      radius: 12pt,
      stroke: 1pt + rgb("#feebc8"),
      [
        #text(size: 22pt, weight: "bold", fill: rgb("#c53030"))[🇨🇳 #title]
        #v(4pt)
        #text(size: 10.5pt, fill: rgb("#744210"))[#subtitle]
      ]
    )
  ]
  v(10pt)

  body
}

// Single vocabulary / phrase card component
#let vocab-card(
  hanzi: "",
  pinyin-phonetic: none,
  pinyin-written: none,
  pinyin: none, // fallback if both are same
  es: none,
  en: none,
  fr: none,
  tags: (),
  note: none,
  category: "Saludos / 问候"
) = {
  let p-phonetic = if pinyin-phonetic != none { pinyin-phonetic } else { pinyin }
  let p-written = if pinyin-written != none { pinyin-written } else { pinyin }

  [
    #block(
      width: 100%,
      stroke: 1pt + rgb("#e2e8f0"),
      radius: 10pt,
      clip: true,
      fill: white,
      inset: 0pt,
      [
        // Card Header
        #block(
          fill: rgb("#fff5f5"),
          inset: (x: 14pt, y: 7pt),
          width: 100%,
          stroke: (bottom: 0.8pt + rgb("#fed7d7")),
          [
            #grid(
              columns: (1fr, auto),
              align(left + horizon)[
                #text(size: 9pt, weight: "bold", fill: rgb("#e53e3e"))[🏷️ #upper(category)]
              ],
              align(right + horizon)[
                #for tag in tags [
                  #box(
                    fill: rgb("#fed7d7"),
                    inset: (x: 6pt, y: 2pt),
                    radius: 4pt,
                    baseline: 0pt,
                    [#text(size: 8pt, fill: rgb("#9b2c2c"), weight: "bold")[#tag]]
                  )
                  #h(3pt)
                ]
              ]
            )
          ]
        )

        // Main Content Grid: Left (Chinese & Pronunciation) | Right (Translations)
        #pad(x: 14pt, y: 12pt)[
          #grid(
            columns: (1.1fr, 1.3fr),
            column-gutter: 14pt,
            
            // Column 1: Hanzi & Phonetics
            [
              #align(center)[
                // Big Hanzi representation
                #block(
                  inset: (y: 2pt),
                  [
                    #text(
                      font: primary-chinese-font,
                      size: 32pt,
                      weight: "bold",
                      fill: rgb("#9b2c2c")
                    )[#hanzi]
                  ]
                )

                #v(4pt)

                // Phonetics badge / pill
                #box(
                  fill: rgb("#edf2f7"),
                  inset: (x: 10pt, y: 6pt),
                  radius: 6pt,
                  [
                    #grid(
                      columns: 1,
                      row-gutter: 4pt,
                      align: left,
                      [
                        #text(size: 8pt, fill: rgb("#718096"), weight: "bold")[FONÉTICA: ]
                        #text(size: 10pt, weight: "bold", fill: rgb("#2b6cb0"))[#p-phonetic]
                      ],
                      if p-written != none and p-written != p-phonetic [
                        #line(length: 100%, stroke: 0.5pt + rgb("#cbd5e0"))
                        #text(size: 8pt, fill: rgb("#718096"), weight: "bold")[ESCRITO: ]
                        #text(size: 9.5pt, weight: "bold", fill: rgb("#2d3748"))[#p-written]
                      ]
                    )
                  ]
                )
              ]
            ],

            // Column 2: Translations in multi-language list
            [
              #block(
                fill: rgb("#f7fafc"),
                inset: (x: 10pt, y: 8pt),
                radius: 8pt,
                stroke: 0.5pt + rgb("#edf2f7"),
                [
                  #stack(
                    spacing: 7pt,
                    if es != none [
                      #grid(
                        columns: (22pt, 1fr),
                        align: (left + horizon, left + horizon),
                        [#text(size: 12pt)[🇪🇸]],
                        [#text(size: 10pt, weight: "medium", fill: rgb("#1a202c"))[#es]]
                      )
                    ],
                    if en != none [
                      #grid(
                        columns: (22pt, 1fr),
                        align: (left + horizon, left + horizon),
                        [#text(size: 12pt)[🇬🇧]],
                        [#text(size: 10pt, fill: rgb("#4a5568"))[#en]]
                      )
                    ],
                    if fr != none [
                      #grid(
                        columns: (22pt, 1fr),
                        align: (left + horizon, left + horizon),
                        [#text(size: 12pt)[🇫🇷]],
                        [#text(size: 10pt, fill: rgb("#4a5568"))[#fr]]
                      )
                    ],
                    [
                      #grid(
                        columns: (22pt, 1fr),
                        align: (left + horizon, left + horizon),
                        [#text(size: 12pt)[🇨🇳]],
                        [#text(font: primary-chinese-font, size: 11pt, weight: "bold", fill: rgb("#c53030"))[#hanzi]]
                      )
                    ]
                  )
                ]
              )

              #if note != none [
                #v(4pt)
                #text(size: 8pt, fill: rgb("#718096"), style: "italic")[💡 #note]
              ]
            ]
          )
        ]
      ]
    )
    #v(10pt)
  ]
}

// Compact Grid version: Displays flashcards side-by-side (ideal for printable flashcards)
#let vocab-card-compact(
  hanzi: "",
  pinyin-phonetic: none,
  pinyin-written: none,
  pinyin: none,
  es: none,
  en: none,
  fr: none,
  category: none
) = {
  let p-phonetic = if pinyin-phonetic != none { pinyin-phonetic } else { pinyin }
  let p-written = if pinyin-written != none { pinyin-written } else { pinyin }

  box(
    width: 100%,
    stroke: 1pt + rgb("#e2e8f0"),
    radius: 8pt,
    fill: white,
    inset: 10pt,
    [
      #if category != none [
        #align(right)[#text(size: 7.5pt, fill: rgb("#a0aec0"), weight: "bold")[#category]]
      ]
      #align(center)[
        #text(font: primary-chinese-font, size: 24pt, weight: "bold", fill: rgb("#c53030"))[#hanzi]
        #v(1pt)
        #text(size: 9.5pt, weight: "bold", fill: rgb("#2b6cb0"))[#p-phonetic]
        #if p-written != none and p-written != p-phonetic [
          #text(size: 8.5pt, fill: rgb("#718096"))[ (#p-written)]
        ]
      ]
      #v(6pt)
      #line(length: 100%, stroke: 0.5pt + rgb("#edf2f7"))
      #v(4pt)
      #grid(
        columns: 1,
        row-gutter: 3pt,
        if es != none [ #text(size: 8.5pt)[🇪🇸 #es] ],
        if en != none [ #text(size: 8.5pt, fill: rgb("#4a5568"))[🇬🇧 #en] ],
        if fr != none [ #text(size: 8.5pt, fill: rgb("#4a5568"))[🇫🇷 #fr] ]
      )
    ]
  )
}

// Helper function to render a list of cards directly from JSON data
#let render-vocab-list(data) = {
  for item in data [
    #vocab-card(
      hanzi: item.at("hanzi"),
      pinyin-phonetic: item.at("phonetic", default: none),
      pinyin-written: item.at("written", default: none),
      es: item.at("es", default: none),
      en: item.at("en", default: none),
      fr: item.at("fr", default: none),
      category: item.at("category", default: "Vocabulario"),
      tags: item.at("tags", default: ()),
      note: item.at("note", default: none)
    )
  ]
}
