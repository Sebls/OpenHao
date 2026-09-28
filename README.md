# 🇨🇳 Sistema Personal de Aprendizaje de Chino Mandarín (Typst)

Este repositorio contiene una plantilla y formato modular de **fichas y tarjetas de vocabulario (Flashcards)** en [Typst](https://typst.app) para el estudio sistemático del chino mandarín.

---

## 📁 Estructura del Proyecto

```text
chinois/
├── templates/
│   └── card.typ          # Módulo principal con diseño y componentes Typst
├── data/
│   └── saludos.json      # Base de datos estructurada de vocabulario y frases
├── main.typ              # Documento principal listo para compilar
├── output.pdf            # PDF generado con alta calidad tipográfica
└── README.md             # Documentación y guía de uso
```

---

## 🎨 Características de la Plantilla

1. **Tipografía China Nativa**:
   - Integración automática con fuentes serifa tradicionales y modernas (`Songti SC`, `STSong`, `Hiragino Sans GB`, `Heiti SC`).
2. **Doble Fonética Pinyin**:
   - Distinción clara entre **Fonética** (pronunciación real / cambio de tono sandhi) y **Bien escrito** (capitalización estándar).
3. **Soporte Multilingüe**:
   - 🇪🇸 Español
   - 🇬🇧 Inglés
   - 🇫🇷 Francés
   - 🇨🇳 Caracteres Hanzi con destaque cromático
4. **Metadatos y Etiquetas**:
   - Categorías (e.g. Saludos, Viajes, Negocios), tags HSK (`HSK 1`, `HSK 2`, etc.), y notas pedagógicas explicativas.
5. **Doble Modalidad de Visualización**:
   - **Vista de Estudio Detallada (`vocab-card`)**: Tarjetas completas con notas lingüísticas y desglose visual.
   - **Vista de Fichas Recortables (`vocab-card-compact`)**: Cuadrícula de 2 columnas optimizada para imprimir y recortar.
6. **Alimentación mediante JSON**:
   - Puedes escribir las tarjetas directamente en Typst o mantener tus listas en archivos `.json` en `data/` para cargarlas con `#render-vocab-list(data)`.

---

## 🚀 Uso Rápido

### Compilar a PDF
```bash
typst compile main.typ output.pdf
```

### Previsualizar en vivo mientras editas (Watch Mode)
```bash
typst watch main.typ
```

### Exportar imágenes (PNG)
```bash
typst compile main.typ preview-{n}.png
```

---

## 📝 Ejemplo de Entrada en Typst

```typst
#import "templates/card.typ": vocab-card

#vocab-card(
  hanzi: "你好",
  pinyin-phonetic: "nǐ hǎo",
  pinyin-written: "Nǐ hǎo",
  es: "Hola",
  en: "Hello / Hi",
  fr: "Bonjour / Salut",
  category: "Saludos / 问候",
  tags: ("HSK 1", "Básico", "Diario"),
  note: "Regla del 3er tono (sandhi): al juntarse dos terceros tonos (nǐ + hǎo), 'nǐ' se pronuncia en segundo tono (ní hǎo)."
)
```
