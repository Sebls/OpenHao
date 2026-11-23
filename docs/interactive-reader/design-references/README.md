# Current visual design and reference roles

Updated 2026-11-22. This guide records the user's reference choices and the styles implemented in [app/style.css](../../../app/style.css). It overrides conflicting older palette, font, panel and appearance guidance. Original PDF pages retain their source layout, text and artwork.

## Reference ownership

| Reference                                     | Source                     | Role in this app                                                                                                                                                                                                                                                                             |
| --------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Reference 2](website-style-reference-2.json) | Anthropic research article | Primary guide for minimal, elegant structure: generous whitespace, restrained hierarchy, aligned sections, fine dividers, few containers and no decorative shadows. Adapt those principles to learning tasks rather than copying the blog layout. Exclude this reference's fonts and colors. |
| [Reference 1](website-style-reference-1.json) | Supermemory                | Typography, colors and finishing details: Geist, Geist Mono, white canvas, near-black text, blue actions, muted supporting text, small control corners and the dark book-cover pairing. Its site layout does not determine the reader layout.                                                |

The JSON files are preserved reference captures, not application configuration. Their recorded viewport dimensions and site-specific navigation are not requirements for this app. They are documentation inputs and are not loaded by the running reader. Keep them in this directory and update this guide when changing their roles.

## Palette and semantic roles

| Role                          | Implemented value     | Use                                                                           |
| ----------------------------- | --------------------- | ----------------------------------------------------------------------------- |
| Canvas and surface            | `#ffffff`             | App background, reader surroundings and detail surfaces                       |
| Main text                     | `#0b1015`             | Headings, labels and learning text                                            |
| Supporting text               | `rgb(11 16 21 / 68%)` | Explanations, metadata and secondary labels                                   |
| Dividers and quiet boundaries | `rgb(11 16 21 / 18%)` | Section rules and control outlines                                            |
| Primary accent                | `#0562ef`             | Primary buttons, active navigation underline, focus and annotation indicators |
| Selected background           | `rgb(5 98 239 / 7%)`  | Selected controls and practice choices                                        |
| Pressed or active overlay     | `rgb(5 98 239 / 12%)` | Press feedback and selected source region                                     |
| Dark supporting surface       | `#1a2838`             | Library book cover and primary-button hover                                   |
| Warm light label              | `#fffbf5`             | Book-cover text and primary-button hover text                                 |

Use the selected light appearance regardless of system theme. Do not invert source pages. Increased-contrast preference strengthens dividers and supporting text; state labels and outlines supplement color. Token values alone do not constitute verified contrast or accessibility compliance.

## Typography

Geist Variable and Geist Mono Variable are installed through Fontsource, imported by [app/main.jsx](../../../app/main.jsx), and bundled into the local build. Studying requires no remote font service. Chinese text falls back to available Chinese fonts, including PingFang SC and Microsoft YaHei; retain fallback coverage for pinyin and IPA.

| Element                             | Current treatment                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------- |
| Body                                | Geist, 16px equivalent, line height 1.6                                               |
| Library title                       | Responsive 40–64px equivalent, regular weight, line height 1.12, tight Latin tracking |
| Study title                         | 32px equivalent, regular weight                                                       |
| Library section and document titles | 24px equivalent, regular weight                                                       |
| Practice prompt                     | 24px equivalent, line height 1.4; 22px on narrow screens                              |
| Selected Chinese form               | 40px equivalent, line height 1.4, no added tracking                                   |
| Text companion                      | 18px equivalent, line height 1.9, wrapping preserved                                  |
| Controls and summaries              | 14px equivalent; summaries use medium weight                                          |
| Eyebrows                            | Geist Mono, 11px equivalent, medium weight, uppercase, 0.06em tracking                |
| Supporting metadata                 | Usually 12–13px equivalent; compact decorative book/header labels are smaller         |

Most sizes use rem units so browser text enlargement can scale the interface. Avoid applying Latin display-title tracking to learning passages.

## Layout and component details

| Area                | Implemented design                                                                                                                                                                            |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header              | Quiet three-part alignment: brand, centered destinations, local-use label. Current destination uses a thin blue underline.                                                                    |
| Library             | Centered container, maximum 1120px including horizontal padding; 80px top spacing on wide screens. Intro and library list are separated by generous space.                                    |
| Document list       | Open rows with fine bottom rules; no enclosing card or shadow. A 180px book cover sits beside document information with a 48px gap.                                                           |
| Study area          | Maximum 1500px including padding. Document identity, practice actions and a ruled toolbar precede the source page.                                                                            |
| Original page       | Maximum 820px when reading alone. No decorative shadow or source recoloring; preserve page aspect ratio and zoom.                                                                             |
| Learning details    | Appears beside the source only when selected: 320px column, 40px gap, a fine left rule, and 28px inner spacing. Long details can scroll.                                                      |
| Text companion      | Fine section rules and expandable summaries; learning-unit controls remain available for equivalent access.                                                                                   |
| Practice            | Open column, maximum 720px. Answers use aligned rows and fine dividers. The selected row adds pale blue fill and an inset blue marker; radio controls retain an explicit selection indicator. |
| Buttons and selects | Small 4px corners, minimum 44px height, restrained borders; one blue primary action where appropriate.                                                                                        |
| Focus and feedback  | Blue 2px focus outline with 4px offset. Source selection has an outline and fill. Feedback uses written labels, not color alone.                                                              |
| Motion              | Brief 150ms color/border changes; reduced-motion preference removes transitions. No decorative entrance animations.                                                                           |

## Responsive behavior

At 1100px and below, document actions move below the heading and the detail column narrows. At 850px and below, the local-use label is hidden and details become a focused view with a visible return action, preserving reader state. At 500px and below, library rows stack vertically, book-cover text becomes horizontal, and controls wrap. The PDF itself stays faithful and may be zoomed or panned rather than reflowed.

## Review preference and evidence

Always prefer reviewing content and interface changes in the agent browser, such as the Codex browser. Review the prepared content, source fidelity, reader/detail relationship, practice feedback and responsive controls there when relevant. Record limitations such as unavailable local speech or clipboard access; do not claim an unobserved result.

The redesign passed a production build and local HTTP availability check, and the localhost preview was opened in Codex. An interaction or visual review of the redesign has not been recorded. See [verification](../verification.md) for historical evidence and current limits.
