// Chinese Language Flashcards & Vocabulary System Template
// Designed for Typst 0.13+ / 0.15+

#let primary-chinese-font = ("Songti SC", "STSong", "Hiragino Sans GB", "Heiti SC")
#let primary-text-font = ("Helvetica Neue", "Arial", "Heiti SC")

// Document layout function
#let card-doc(
  title: "Chinese Learning System / 中文闪卡",
  subtitle: "Personal Language Vocabulary, Character Breakdown & Grammatical Notes",
  author: "Personal Language System",
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
          align(right)[#text(size: 8.5pt, fill: rgb("#a0aec0"))[Page #page-num]]
        )
        #v(2pt)
        #line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))
      ]
    },
    footer: context {
      let page-num = counter(page).get().first()
      align(center)[
        #text(size: 8pt, fill: rgb("#a0aec0"))[
          🇨🇳 Personal Chinese Mandarin System · Page #page-num
        ]
      ]
    }
  )

  set text(
    font: primary-text-font,
    size: 10.5pt,
    fill: rgb("#2d3748"),
    lang: "en"
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

// Single vocabulary / phrase card component with definition, breakdown, and examples
#let vocab-card(
  hanzi: "",
  pinyin-phonetic: none,
  pinyin-written: none,
  pinyin: none,
  ipa: none,
  zipf: none,
  frequency-tier: none,
  definition: none,
  breakdown: (),
  composition-note: none,
  es: none,
  en: none,
  fr: none,
  example: none,
  tags: (),
  note: none,
  category: "Greetings / 问候"
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
      breakable: false,
      [
        // 1. Header ribbon
        #block(
          fill: rgb("#fff5f5"),
          inset: (x: 14pt, y: 7pt),
          width: 100%,
          stroke: (bottom: 0.8pt + rgb("#fed7d7")),
          [
            #grid(
              columns: (1fr, auto),
              align(left + horizon)[
                #text(size: 8.5pt, weight: "bold", fill: rgb("#e53e3e"))[🏷️ #upper(category)]
                #if zipf != none [
                  #h(6pt)
                  #box(
                    fill: rgb("#ebf8ff"),
                    inset: (x: 5pt, y: 1.5pt),
                    radius: 3pt,
                    baseline: 0pt,
                    [#text(size: 7.5pt, fill: rgb("#2b6cb0"), weight: "bold")[📊 Zipf: #zipf #if frequency-tier != none [· #frequency-tier]]]
                  )
                ]
              ],
              align(right + horizon)[
                #for tag in tags [
                  #box(
                    fill: rgb("#fed7d7"),
                    inset: (x: 6pt, y: 2pt),
                    radius: 4pt,
                    baseline: 0pt,
                    [#text(size: 7.5pt, fill: rgb("#9b2c2c"), weight: "bold")[#tag]]
                  )
                  #h(3pt)
                ]
              ]
            )
          ]
        )

        #pad(x: 14pt, top: 12pt, bottom: 12pt)[
          // 2. Main Row: Hanzi + Phonetics | Translations & Definition
          #grid(
            columns: (1.05fr, 1.35fr),
            column-gutter: 14pt,
            
            // Left Column: Big Hanzi & Phonetics badge
            [
              #align(center)[
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

                #v(3pt)

                #box(
                  fill: rgb("#edf2f7"),
                  inset: (x: 10pt, y: 6pt),
                  radius: 6pt,
                  [
                    #grid(
                      columns: 1,
                      row-gutter: 3pt,
                      align: left,
                      [
                        #text(size: 7.5pt, fill: rgb("#718096"), weight: "bold")[PINYIN: ]
                        #text(size: 9.5pt, weight: "bold", fill: rgb("#2b6cb0"))[#p-phonetic]
                      ],
                      if ipa != none [
                        #line(length: 100%, stroke: 0.5pt + rgb("#cbd5e0"))
                        #text(size: 7.5pt, fill: rgb("#718096"), weight: "bold")[IPA: ]
                        #text(size: 9pt, weight: "bold", fill: rgb("#6b46c1"))[#ipa]
                      ],
                      if p-written != none and p-written != p-phonetic [
                        #line(length: 100%, stroke: 0.5pt + rgb("#cbd5e0"))
                        #text(size: 7.5pt, fill: rgb("#718096"), weight: "bold")[WRITTEN: ]
                        #text(size: 8.5pt, weight: "bold", fill: rgb("#2d3748"))[#p-written]
                      ]
                    )
                  ]
                )
              ]
            ],

            // Right Column: Definition & Translations
            [
              #if definition != none [
                #text(size: 9pt, fill: rgb("#4a5568"), weight: "medium", style: "italic")[
                  "#definition"
                ]
                #v(5pt)
              ]

              #block(
                fill: rgb("#f7fafc"),
                inset: (x: 10pt, y: 7pt),
                radius: 7pt,
                stroke: 0.5pt + rgb("#edf2f7"),
                [
                  #stack(
                    spacing: 5pt,
                    if en != none [
                      #grid(
                        columns: (20pt, 1fr),
                        align: (left + horizon, left + horizon),
                        [#text(size: 11pt)[🇬🇧]],
                        [#text(size: 9.5pt, weight: "bold", fill: rgb("#1a202c"))[#en]]
                      )
                    ],
                    if es != none [
                      #grid(
                        columns: (20pt, 1fr),
                        align: (left + horizon, left + horizon),
                        [#text(size: 11pt)[🇪🇸]],
                        [#text(size: 9pt, fill: rgb("#4a5568"))[#es]]
                      )
                    ],
                    if fr != none [
                      #grid(
                        columns: (20pt, 1fr),
                        align: (left + horizon, left + horizon),
                        [#text(size: 11pt)[🇫🇷]],
                        [#text(size: 9pt, fill: rgb("#4a5568"))[#fr]]
                      )
                    ],
                    [
                      #grid(
                        columns: (20pt, 1fr),
                        align: (left + horizon, left + horizon),
                        [#text(size: 11pt)[🇨🇳]],
                        [#text(font: primary-chinese-font, size: 10.5pt, weight: "bold", fill: rgb("#c53030"))[#hanzi]]
                      )
                    ]
                  )
                ]
              )
            ]
          )

          // 3. Character Decomposition / Radical breakdown with IPA
          #if breakdown.len() > 0 [
            #v(8pt)
            #line(length: 100%, stroke: 0.5pt + rgb("#edf2f7"))
            #v(4pt)
            #text(size: 8pt, weight: "bold", fill: rgb("#718096"))[CHARACTER COMPOSITION, RADICALS & PHONETICS (IPA):]
            #v(4pt)
            
            #grid(
              columns: (1fr,) * breakdown.len(),
              column-gutter: 8pt,
              ..breakdown.map(item => block(
                fill: rgb("#f8fafc"),
                inset: (x: 6pt, y: 6pt),
                radius: 6pt,
                stroke: 0.5pt + rgb("#e2e8f0"),
                align(center)[
                  #text(font: primary-chinese-font, size: 18pt, weight: "bold", fill: rgb("#2d3748"))[#item.at("char")]
                  #v(1pt)
                  #text(size: 8.5pt, weight: "bold", fill: rgb("#2b6cb0"))[#item.at("pinyin")]
                  #if "ipa" in item [
                    #v(1pt)
                    #text(size: 7.5pt, fill: rgb("#6b46c1"), weight: "bold")[#item.at("ipa")]
                  ]
                  #v(1pt)
                  #text(size: 7.5pt, fill: rgb("#4a5568"))[#item.at("meaning")]
                  #if "radical" in item [
                    #v(1pt)
                    #text(size: 7pt, fill: rgb("#a0aec0"))[Rad: #item.at("radical")]
                  ]
                ]
              ))
            )

            #if composition-note != none [
              #v(3pt)
              #text(size: 8pt, fill: rgb("#718096"))[🧩 *Etymology / Logic:* #composition-note]
            ]
          ]

          // 4. Practical Example Section with IPA
          #if example != none [
            #v(6pt)
            #block(
              fill: rgb("#ebf8ff"),
              inset: (x: 10pt, y: 6pt),
              radius: 6pt,
              stroke: 0.5pt + rgb("#bee3f8"),
              [
                #grid(
                  columns: (auto, 1fr),
                  column-gutter: 8pt,
                  align: (top, left),
                  [#text(size: 11pt)[💬]],
                  [
                    #text(font: primary-chinese-font, size: 10pt, weight: "bold", fill: rgb("#2b6cb0"))[#example.at("zh")]
                    #h(6pt)
                    #text(size: 8.5pt, fill: rgb("#4a5568"), style: "italic")[#example.at("pinyin")]
                    #if "ipa" in example [
                      #h(6pt)
                      #text(size: 8pt, fill: rgb("#6b46c1"))[IPA: #example.at("ipa")]
                    ]
                    #v(2pt)
                    #text(size: 8pt, fill: rgb("#2d3748"))[
                      *EN:* #example.at("en") · *ES:* #example.at("es", default: "")
                    ]
                  ]
                )
              ]
            )
          ]

          // 5. Pedagogical note
          #if note != none [
            #v(4pt)
            #text(size: 7.5pt, fill: rgb("#718096"), style: "italic")[💡 Note: #note]
          ]
        ]
      ]
    )
    #v(10pt)
  ]
}

// Compact Flashcard version (Cutout printable card)
#let vocab-card-compact(
  hanzi: "",
  pinyin-phonetic: none,
  pinyin-written: none,
  pinyin: none,
  ipa: none,
  zipf: none,
  frequency-tier: none,
  es: none,
  en: none,
  fr: none,
  category: none,
  breakdown: ()
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
      #grid(
        columns: (1fr, auto),
        align: (left + horizon, right + horizon),
        if zipf != none [
          #text(size: 7pt, fill: rgb("#3182ce"), weight: "bold")[📊 Zipf #zipf]
        ] else [ #none ],
        if category != none [
          #text(size: 7.5pt, fill: rgb("#a0aec0"), weight: "bold")[#category]
        ] else [ #none ]
      )
      #align(center)[
        #text(font: primary-chinese-font, size: 24pt, weight: "bold", fill: rgb("#c53030"))[#hanzi]
        #v(1pt)
        #text(size: 9.5pt, weight: "bold", fill: rgb("#2b6cb0"))[#p-phonetic]
        #if ipa != none [
          #h(4pt)
          #text(size: 8pt, fill: rgb("#6b46c1"), weight: "bold")[#ipa]
        ]
        #if p-written != none and p-written != p-phonetic [
          #v(1pt)
          #text(size: 8pt, fill: rgb("#718096"))[(#p-written)]
        ]
      ]

      #if breakdown.len() > 0 [
        #v(4pt)
        #align(center)[
          #text(size: 7.5pt, fill: rgb("#718096"))[
            #breakdown.map(b => b.at("char") + " (" + b.at("meaning") + ")").join(" + ")
          ]
        ]
      ]

      #v(6pt)
      #line(length: 100%, stroke: 0.5pt + rgb("#edf2f7"))
      #v(4pt)
      #grid(
        columns: 1,
        row-gutter: 3pt,
        if en != none [ #text(size: 8.5pt, weight: "medium")[🇬🇧 #en] ],
        if es != none [ #text(size: 8.5pt, fill: rgb("#4a5568"))[🇪🇸 #es] ],
        if fr != none [ #text(size: 8.5pt, fill: rgb("#4a5568"))[🇫🇷 #fr] ]
      )
    ]
  )
}

// Helper to batch-render flashcards directly from JSON
#let render-vocab-list(data) = {
  for item in data [
    #vocab-card(
      hanzi: item.at("hanzi"),
      pinyin-phonetic: item.at("phonetic", default: none),
      pinyin-written: item.at("written", default: none),
      ipa: item.at("ipa", default: none),
      zipf: item.at("zipf", default: none),
      frequency-tier: item.at("frequency_tier", default: none),
      definition: item.at("definition", default: none),
      breakdown: item.at("breakdown", default: ()),
      composition-note: item.at("composition_note", default: none),
      es: item.at("es", default: none),
      en: item.at("en", default: none),
      fr: item.at("fr", default: none),
      example: item.at("example", default: none),
      category: item.at("category", default: "Vocabulary"),
      tags: item.at("tags", default: ()),
      note: item.at("note", default: none)
    )
  ]
}
