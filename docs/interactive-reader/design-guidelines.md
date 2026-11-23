# Design guidelines — Interactive Language Learning Reader

Reviewed: 2026-11-19.

Primary reference: [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/).

Project visual specification: [Current visual design and reference roles](design-references/README.md), including the implemented palette, typography, spacing, and component treatments; [System design](system-design.md) describes the wider architecture. These project choices apply alongside the guidance below and remain subordinate to current requirements.

## 1. Scope and how to use this file

This is an original, scope-specific synthesis of Apple's guidance for the reader described in [requirements.md](requirements.md). It covers relevant foundations, interaction patterns, components, and inputs. It is not a verbatim extraction or a complete reproduction of Apple's cross-platform documentation. Sources are linked beside the guidance they support.

Each section distinguishes **Apple guidance**, paraphrased from the linked pages, from **Reader application**, our interpretation for this web application. Reader-specific rules are project design decisions, not statements that Apple specifies a language-learning interface. They guide implementation within approved functionality; they do not bring future features into the initial release.

The [current requirements](current-requirements.md) record later user decisions and take precedence over the original requirements and this guidance. In particular: preserve exact source pages with overlays, prepare content through an external agent skill, work privately/offline, and defer saved personal progress. Preserve reading/practice state during in-app navigation only; references below to existing saved preferences or save-failure states apply only if persistence is later authorized. Offline content storage is still required under the selected delivery mechanism. Use [agent-guidelines.md](agent-guidelines.md) for implementation discipline. If these documents conflict, record the conflict and resolve it explicitly. Revisit the live HIG when implementing a platform-specific feature because Apple's guidance evolves.

Apple's native components, point measurements, system colors, materials, and APIs are not directly interchangeable with browser features. Use established web semantics and browser behavior when translating these principles. Do not claim native Apple behavior or accessibility compliance from visual resemblance.

### Confirmed learner and content behavior, 2026-11-20

The learner starts Chinese from zero and uses English explanations. Show a brief contextual meaning and tone-mark Mandarin pinyin first, then expandable character/word breakdowns, relevant grammar, and separately labeled phonetic transcription (IPA by default). Explain unfamiliar notation and terminology without forcing a tutorial. Prioritize the original dialogue; keep supplemental examples sparse and clearly labeled.

Lesson 1 is the first reference for teaching quality and interface behavior. Show page preparation states so a PDF with some prepared pages feels intentional; an unprepared page remains readable in its original form and must not display misleading empty annotation controls. Adding pages must not move the current reading location. Keep stable correction references available through a quiet copy action, with selectable text as fallback.

Practice includes character recognition, both translation directions, sentence comprehension, missing-word and grammar questions, and listening where offline speech works. These use the same multiple-choice interaction, with English instructions and beginner-friendly feedback. Do not reveal the answer through auxiliary labels. Always prefer reviewing content and the experience in the agent browser, such as the Codex browser; clipboard/audio limitations should have usable fallbacks.

## 2. Design principles

**Apple guidance:** Eight principles provide a framework for design decisions: purpose, agency, responsibility, familiarity, flexibility, simplicity, craft, and delight. Focus on meaningful tasks, preserve control and recovery, respect privacy, use recognizable patterns, accommodate different needs, establish hierarchy, refine details, and choose an appropriate emotional character. [Source: Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles/).

**Reader application:**

| Principle      | Application to this product                                                                |
| -------------- | ------------------------------------------------------------------------------------------ |
| Purpose        | Optimize the path from reading a passage to understanding and practicing it.               |
| Agency         | Let learners inspect, listen, select, dismiss, and return without forced sequences.        |
| Responsibility | Keep learning records trustworthy and explain any external processing.                     |
| Familiarity    | Use recognizable document navigation, selection, playback, and question controls.          |
| Flexibility    | Offer the same essential tasks through keyboard, pointer, touch, and assistive technology. |
| Simplicity     | Show the passage first; disclose linguistic depth on demand.                               |
| Craft          | Check Chinese glyphs, tone marks, alignment, focus, and state transitions carefully.       |
| Delight        | Aim for calm curiosity and confidence through clear, responsive interactions.              |

## 3. Information hierarchy and layout

**Apple guidance:** Arrange information by importance, align related elements, group through spacing, and disclose secondary detail progressively. Adapt to window size, orientation, text enlargement, and localization while maintaining understandable relationships. [Source: Layout](https://developer.apple.com/design/human-interface-guidelines/layout/).

**Reader application:**

- Keep the source document as the main visual area. Navigation and linguistic consultation support it.
- Distinguish document content, the active annotation, and the information describing it.
- Use consistent spacing and alignment; avoid enclosing every word or paragraph in a card.
- Preserve page/section identity, selected content, and reading position during layout changes.
- Reflow controls and details before shrinking text. A narrow window must still expose the complete learning loop.
- Keep fixed controls from covering focused text, answer choices, or the bottom of a document.

## 4. Navigation, sidebars, and split views

**Apple guidance:** Sidebars can express hierarchy and may be hideable. Split views work best when there is sufficient room, and highlighting selection clarifies relationships between panes. Compact configurations need logical navigation between their contents. [Sources: Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars/), [Split views](https://developer.apple.com/design/human-interface-guidelines/split-views/).

**Reader application:**

- On wide screens, consider a document outline, central reader, and supplementary detail panel. These are layout candidates, not a requirement for three permanent columns.
- Allow the outline to collapse when it reduces the reading area unnecessarily.
- On narrow screens, show focused views with a clear return action instead of squeezing several panes together.
- Keep the selected section and annotation identifiable while related details are open.
- Returning from practice restores the source location rather than reopening at the document beginning.
- If top-level tabs are useful, use them for destinations such as reading and practice. Playback and adding a word are actions, not tabs. Keep destinations stable and explain empty sections. [Source: Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars/).

## 5. Typography and multilingual reading

**Apple guidance:** Prioritize legible sizes and weights, limit typeface variation, express hierarchy consistently, and accommodate enlarged text. System text styles offer useful defaults; custom fonts need equivalent attention to accessibility. [Source: Typography](https://developer.apple.com/design/human-interface-guidelines/typography/).

**Reader application:**

- Use locally bundled Geist for interface text and Geist Mono for compact metadata, with Chinese and phonetic-symbol fallbacks. Follow the current visual specification for sizes and weights.
- Check actual Hanzi, pinyin tone marks, punctuation, and mixed-language examples before choosing sizes and line spacing.
- Keep characters and pronunciation visually associated. Enlarging text must not detach labels from the words they explain.
- Use semantic text roles: document title, section heading, reading text, pronunciation, translation, and supporting explanation.
- Avoid thin weights and compressed line spacing for dense character forms.
- Do not apply Latin display-heading tracking indiscriminately to Chinese passages.
- Preserve complete learning text; truncate secondary navigation labels only when a usable route to their full text exists.

## 6. Color and appearance

**Apple guidance:** Give colors stable meanings, check different appearances and lighting conditions, and supplement color with another indicator. Semantic colors should retain their intended roles. Respect the system appearance and test both light and dark presentations. [Sources: Color](https://developer.apple.com/design/human-interface-guidelines/color/), [Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode/).

**Reader application:**

- Define semantic color roles for reading surfaces, primary/secondary text, interaction, selection, focus, success, warning, and failure.
- Avoid using the interaction accent decoratively on ordinary passage text.
- Distinguish annotation availability from the currently selected annotation.
- Pair answer colors with labels or symbols such as “Correct” and “Try again.”
- If pinyin tones receive colors, keep tone marks or another readable representation.
- Use the reference-based light appearance selected on 2026-11-22. Preserve source PDF colors and respect reduced-motion and increased-contrast preferences.
- Retain the source appearance of scanned pages and educational illustrations; a dark interface does not justify blindly inverting their pixels.

## 7. Materials, depth, and visual restraint

**Apple guidance:** Materials establish layering and hierarchy. Liquid Glass belongs to controls and navigation rather than the content layer, and custom usage should be restrained. Choose material strength for context and legibility. [Source: Materials](https://developer.apple.com/design/human-interface-guidelines/materials/).

**Reader application:**

- Reading passages, definitions, grammar, and exercise choices need stable, legible surfaces.
- Reserve any translucent treatment for a small number of functional overlays or navigation surfaces.
- Do not place glass effects on every annotation, answer, or content card.
- An opaque surface is an acceptable default for the web. Blur is not required to satisfy this design direction.
- Test overlays above dense Hanzi, images, and tables. Provide solid fallbacks when transparency reduces legibility or performance.
- Honor reduced-transparency and increased-contrast preferences when exposed by the browser; ensure the default remains usable when those signals are unavailable.

## 8. Icons, imagery, and document fidelity

**Apple guidance:** Interface icons should communicate clearly, align optically, scale well, and have accessible labels. Meaningful images need descriptions; decorative images should not clutter screen-reader output. Image assets must suit supported display resolutions. [Sources: Icons](https://developer.apple.com/design/human-interface-guidelines/icons/), [Images](https://developer.apple.com/design/human-interface-guidelines/images/), [VoiceOver](https://developer.apple.com/design/human-interface-guidelines/voiceover/).

**Reader application:**

- Use one coherent icon family for play, repeat, close, navigation, and practice selection; verify asset permissions before distribution.
- Label unfamiliar actions visibly and provide descriptive names for icon-only controls.
- Preserve educational image proportions, tables, and embedded writing. Do not crop away source material to fit a decorative container.
- Keep interactive image regions aligned when their source image scales or zooms.
- Provide equivalent access to annotated image text and its source context without relying on visual hotspot discovery.
- Keep meaningful captions and descriptions associated with their images.

## 9. Accessibility as part of the design

**Apple guidance:** Interfaces should accommodate varied vision, hearing, mobility, speech, and cognitive needs. Support enlarged text, adequate contrast, sufficiently sized and separated controls, alternatives to gestures, and alternatives to audio-only information. [Source: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility/).

**Reader application:**

- Verify the learning loop at 200% text enlargement, with reflow and without losing controls or explanations.
- Supply text equivalents for pronunciation audio where available. Feedback must remain understandable with sound off.
- Give frequent standalone touch controls generous target areas and separation. As a project target, use at least 44 × 44 CSS pixels where feasible; this is a web design choice, not a conversion of Apple's native points.
- Dense inline annotations need an equivalent route through a readable selected-item view; do not enlarge overlapping hit areas over neighboring words.
- Check text contrast against WCAG's web definitions: at least 4.5:1 for ordinary text and 3:1 for qualifying large text. Bold alone does not qualify small text for the lower ratio. [Supplementary source: W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
- Evaluate target-size exceptions explicitly for inline content rather than claiming every word meets standalone control sizing. [Supplementary source: W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

## 10. Screen readers and content semantics

**Apple guidance:** Provide useful labels, headings, ordering, grouping, image descriptions, and notification of meaningful interface changes. These communicate relationships that visual layout alone cannot convey. [Source: VoiceOver](https://developer.apple.com/design/human-interface-guidelines/voiceover/).

**Reader application:**

- Use semantic document structure, headings, lists, tables, links, buttons, and form controls.
- Mark source and translation languages accurately so assistive speech can pronounce them appropriately.
- Name a pronunciation control for its target, for example “Play pronunciation of 你好.”
- Expose whether an item is selected for practice and whether an answer is selected or submitted.
- Announce answer feedback and important loading failures without repeatedly interrupting passage reading.
- Provide an efficient way to explore annotations without forcing hundreds of tiny controls into a single uninterrupted tab sequence. Validate that approach with a screen reader.

## 11. Keyboard, focus, and selection

**Apple guidance:** Support keyboard operation and familiar shortcuts. Make focus visible and avoid moving it unexpectedly. Focus and persistent selection communicate different aspects of interaction. [Sources: Keyboards](https://developer.apple.com/design/human-interface-guidelines/keyboards/), [Focus and selection](https://developer.apple.com/design/human-interface-guidelines/focus-and-selection/).

**Reader application:**

- Make document navigation, annotation consultation, playback, practice selection, answering, review, and return usable without a mouse.
- Preserve visible focus indicators and a logical sequence matching content relationships.
- Distinguish keyboard focus, the active linguistic item, browser text selection, and practice membership.
- Passive hover previews must not steal focus. A user-opened modal should receive focus, contain it appropriately, and restore it on dismissal.
- Use Escape to dismiss the active temporary surface when appropriate, while preserving browser and input-method behavior.
- Do not override browser find, copy, zoom, back, or other familiar shortcuts casually. Any optional practice shortcut must avoid firing while someone is typing or composing text.

## 12. Pointer, touch, and gestures

**Apple guidance:** Keep gestures familiar and responsive, offer alternative inputs, and avoid conflicts with system gestures. People should be able to switch between pointer, keyboard, and touch without relearning core tasks. [Sources: Gestures](https://developer.apple.com/design/human-interface-guidelines/gestures/), [Pointing devices](https://developer.apple.com/design/human-interface-guidelines/pointing-devices/).

**Reader application:**

- Hover supplements explicit selection; it never becomes the only route to meaning or pronunciation.
- Tap or click selects an item. Do not require double-tap, long press, or a hidden swipe for essential consultation.
- Preserve normal scrolling, browser zoom, text selection, and copying.
- Avoid turning every pointer movement into a disruptive preview change.
- If swipe-to-dismiss or drag selection is added, retain an equivalent visible control.
- Do not assume touch capability rules out a mouse or keyboard; test mixed-input devices.

## 13. Annotation previews and persistent details

**Apple guidance:** Popovers suit compact, contextual information, should relate clearly to their trigger, and should not obscure essential content. Avoid cascades; adapt to compact displays. Supplementary information that accompanies an ongoing task can use a nonmodal presentation. [Sources: Popovers](https://developer.apple.com/design/human-interface-guidelines/popovers/), [Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets/).

**Reader application:**

- A quick preview contains the selected form, available pronunciation, and a short meaning.
- Detailed consultation can add audio, definitions, characters, grammar, examples, and practice actions.
- Open one preview at a time. Keep it inside the viewport and preserve visibility of its source where possible.
- Let people move into a preview to read it without immediate disappearance. Keep passive previews separate from persistent selection.
- Selecting another annotation updates the relevant detail surface directly.
- Explore characters and words within one coherent detail hierarchy instead of stacking popovers.
- On narrow displays, a dedicated detail view or sheet may replace the desktop panel; provide a visible way back.
- The chosen detail view remains available until dismissed or replaced by an explicit selection, as required by the product specification.

## 14. Modality, sheets, and alerts

**Apple guidance:** Use modality for a clear benefit, keep modal tasks focused, and provide an obvious exit. Avoid stacking modal contexts. Alerts interrupt, so reserve them for consequential situations with useful actions; reversible routine actions usually need no confirmation. [Sources: Modality](https://developer.apple.com/design/human-interface-guidelines/modality/), [Alerts](https://developer.apple.com/design/human-interface-guidelines/alerts/), [Action sheets](https://developer.apple.com/design/human-interface-guidelines/action-sheets/).

**Reader application:**

- Ordinary vocabulary consultation should preserve the reading context and avoid unnecessary blocking.
- Do not ask for confirmation every time a learner plays audio, adds an item, changes a view, or answers a question.
- A missing pronunciation is inline status, not a modal alert.
- A short choice about an intentional action may use a menu or appropriate choice surface; an irreversible progress reset needs a specific confirmation if that feature is introduced.
- Clearly distinguish canceling an edit, saving it, and closing read-only information. Never imply an unavoidable commitment by offering only a completion action.
- Preserve selected material and completed answers when leaving practice unless the learner explicitly discards them.

## 15. Buttons, toolbars, and menus

**Apple guidance:** Buttons need sufficient spacing and press feedback. Use prominence sparingly and express preference through style. Toolbars should avoid overcrowding. Menu labels should describe their actions, and context menus should contain relevant commands that are available elsewhere too. [Sources: Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons/), [Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars/), [Menus](https://developer.apple.com/design/human-interface-guidelines/menus/), [Context menus](https://developer.apple.com/design/human-interface-guidelines/context-menus/).

**Reader application:**

- Give each task a clear primary action: open a document, start practice, check an answer, or continue.
- Keep pronunciation and practice selection near the linguistic item they affect.
- Group reader navigation separately from display preferences and document-level actions.
- Move secondary commands to a labeled overflow menu as space decreases; keep essential controls discoverable.
- Use names that describe results: “Add to practice,” “Remove from practice,” and “Return to reading.”
- If a context menu is offered, include only relevant actions and expose those actions in the detail view too.
- Missing optional capabilities may be omitted from contextual commands; stable destinations should instead explain unavailable content.

## 16. Scrolling and reading continuity

**Apple guidance:** Preserve familiar scrolling behavior, reveal that more content exists, and avoid nested scroll areas moving along the same axis. Page-by-page movement can suit some content. [Source: Scroll views](https://developer.apple.com/design/human-interface-guidelines/scroll-views/).

**Reader application:**

- Prefer browser scrolling rather than custom scroll physics.
- Avoid a reader inside several vertically scrolling wrappers.
- If the reader and a long detail panel scroll independently, make their boundaries clear and test wheel, touch, and keyboard use.
- Keep passage layout stable while annotations or audio load.
- Restore position using a reliable source anchor, not only a pixel offset that breaks when fonts or window size change.
- Support page navigation when it matches the source, without overriding browser navigation or zoom gestures.

## 17. Motion and responsiveness

**Apple guidance:** Motion should communicate meaning without distraction, follow expected spatial relationships, remain brief, and permit interruption. Make motion optional and do not use it as the sole information channel. [Source: Motion](https://developer.apple.com/design/human-interface-guidelines/motion/).

**Reader application:**

- Use subtle transitions to clarify which annotation opened a detail surface and how to return.
- Show pressed, selected, and loading feedback promptly. Never block another action until a decorative transition finishes.
- Keep recurring consultation and answer feedback visually quiet.
- Respect reduced-motion preferences with static changes or restrained fades; avoid bouncing panels, parallax, and celebratory motion around reading text.
- Do not mandate a spring library, exact duration, or physics formula as an Apple HIG requirement. Choose timings through prototype testing.

## 18. Pronunciation and audio

**Apple guidance:** Audio should respect deliberate playback, volume expectations, other audio, interruptions, and output routing. Native audio-session capabilities are platform-specific. [Source: Playing audio](https://developer.apple.com/design/human-interface-guidelines/playing-audio/).

**Reader application:**

- Start pronunciation from an explicit action; selecting text alone should not unexpectedly speak.
- Show the target and playback state. Provide replay, and a stop or pause action appropriate to clip length.
- Prevent competing pronunciation clips from overlapping.
- Distinguish unavailable audio, loading, playback, completion, and failure.
- Keep pronunciation text or a transcript accessible where content exists.
- Respect system volume rather than trying to force loudness.
- Handle browser autoplay restrictions and playback rejection visibly. Do not claim native headphone-disconnection or silent-mode handling unless the implementation can support and verify it.
- Playback must not move the document or change the selected learning item unexpectedly.

## 19. Practice, feedback, and learning progress

**Apple guidance:** Match feedback's visibility and interruption level to its significance. Communicate status, completion, warnings, and opportunities for recovery in context. Related choices should show a consistent, understandable selection state. [Sources: Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback/), [Segmented controls](https://developer.apple.com/design/human-interface-guidelines/segmented-controls/).

**Reader application:**

- Identify the selected material and session scope before practice starts.
- Show the prompt, answer options, submission state, explanation, and next action in a consistent order.
- Keep all answer choices visually equal before submission. Selecting an answer and submitting it must have clear, predictable behavior.
- Use an appropriate grouped-choice control for multiple-choice answers; a segmented control is not automatically suitable for long answers.
- After submission, identify the learner's choice and correct answer with text and state indicators.
- Keep explanations and source context available before the learner continues.
- Show truthful session counts, mistakes, and retry options. Session accuracy must not be labeled as overall language mastery.
- Avoid punishing language, forced timers, sound effects, or celebration that interrupts concentration.

## 20. Loading, empty, unavailable, and error states

**Apple guidance:** Display useful content promptly, let unrelated work continue, and use accurate progress indicators. Explain empty states and recoverable problems with clear next actions. [Sources: Loading](https://developer.apple.com/design/human-interface-guidelines/loading/), [Progress indicators](https://developer.apple.com/design/human-interface-guidelines/progress-indicators/), [Writing](https://developer.apple.com/design/human-interface-guidelines/writing/).

**Reader application:**

| State                                | Expected presentation                                                         |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| Document opening                     | Preserve the layout and identify the document being opened.                   |
| Annotation missing an optional field | Omit that field without adding an empty section.                              |
| Audio unavailable                    | Explain that pronunciation audio is unavailable for this item.                |
| Audio request failed                 | Show an inline retry action while keeping the text readable.                  |
| No practice selections               | Explain how to add material from the reader and link back.                    |
| Insufficient exercise data           | Explain why a valid question cannot be generated and offer selection changes. |
| No mistakes in a completed session   | Show completion without inventing remedial work.                              |
| Progress cannot be saved             | Identify the unsaved state and provide a recovery option where possible.      |

Show measurable progress only when it can be computed. An indeterminate operation must not display invented percentages. Avoid artificial waiting periods or full-page blocking for small asset requests.

## 21. Writing, onboarding, and help

**Apple guidance:** Use concise, inclusive language, specific action labels, consistent terminology, and useful recovery instructions. Teach in context and through interaction; keep prerequisite onboarding short and make tutorials optional when possible. [Sources: Writing](https://developer.apple.com/design/human-interface-guidelines/writing/), [Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding/), [Offering help](https://developer.apple.com/design/human-interface-guidelines/offering-help/), [Inclusion](https://developer.apple.com/design/human-interface-guidelines/inclusion/).

**Reader application:**

- Use consistent terms for document, section, character, word, expression, sentence, pronunciation, and practice.
- Explain linguistic terminology briefly when needed; avoid presenting internal data or rendering terminology to learners.
- A first-use hint can invite selecting an annotated word, then disappear after successful use.
- Do not require a tutorial or setup questionnaire before opening the first document.
- Prefer input-neutral instructions such as “Select a word” when mouse and touch are both possible.
- Write errors around recovery: “Audio could not play. Try again.”
- Keep success feedback supportive and specific. Never blame learners for missing data or technical failures.

## 22. Preferences, search, and text input

**Apple guidance:** Choose useful defaults and limit settings. Put task-specific options near the task. If search exists, clarify its scope and make it easy to find. Fields need clear purpose, labels, logical focus order, and appropriate validation. [Sources: Settings](https://developer.apple.com/design/human-interface-guidelines/settings/), [Searching](https://developer.apple.com/design/human-interface-guidelines/searching/), [Text fields](https://developer.apple.com/design/human-interface-guidelines/text-fields/).

**Reader application:**

- If reading preferences are implemented, put text size, pronunciation visibility, and annotation visibility near the reader.
- Preserve existing preferences without a repeated configuration step.
- Search is not an initial requirement. If introduced, distinguish searching the current document from searching the library.
- Keep search queries and useful scope information when showing results and returning from a result.
- Test Chinese input-method composition; do not treat each intermediate composition update as a final answer or search command.
- Keep field labels available after typing. Validate at a helpful point and preserve entered text after a recoverable error.

## 23. Recovery, privacy, and localization

**Apple guidance:** Make reversals predictable and show their results. Request only necessary data, explain its use, and prefer on-device processing when possible. Localized layouts must respect script direction without indiscriminately mirroring images or symbols. [Sources: Undo and redo](https://developer.apple.com/design/human-interface-guidelines/undo-and-redo/), [Privacy](https://developer.apple.com/design/human-interface-guidelines/privacy/), [Right to left](https://developer.apple.com/design/human-interface-guidelines/right-to-left/).

**Reader application:**

- Adding or removing practice material should be readily reversible.
- Preserve reading position and completed session work during ordinary navigation. If discard is unavoidable, state exactly what would be lost.
- Do not introduce accounts, analytics, microphone permissions, notifications, or cloud uploads as a design prerequisite.
- If future OCR, translation, speech, or synchronization uses a remote service, explain the relevant data transfer at the point of use and handle refusal gracefully.
- Prepare layouts for longer translations. Keep source text language distinct from interface language.
- If additional languages are introduced, use script-aware text direction and logical layout properties. Do not mirror source pages, Chinese characters, photographs, or universal symbols.

## 24. Scope boundaries and future consultation

This file covers relevant web-reader guidance. It does not prescribe every Apple platform's hardware interactions or services. Watch, TV, spatial interfaces, CarPlay, games, camera controls, payments, health integrations, widgets, ratings, and App Store presentation are outside the current product scope.

Revisit the corresponding HIG pages if future work adds file import/export, printing, drag and drop, notifications, sharing/collaboration, accounts, synchronization, generative AI, advanced charts, video, or handwriting. The [Patterns](https://developer.apple.com/design/human-interface-guidelines/patterns/), [Components](https://developer.apple.com/design/human-interface-guidelines/components/), [Inputs](https://developer.apple.com/design/human-interface-guidelines/inputs/), and [Technologies](https://developer.apple.com/design/human-interface-guidelines/technologies/) indexes provide entry points. A link in this file does not authorize adding a feature.

## 25. Design review checklist

Use this checklist alongside the functional acceptance checks, recording actual evidence during implementation:

- [ ] The original material is readable and remains the visual priority.
- [ ] The entire reading → consultation → pronunciation → practice → return loop works on wide and narrow layouts.
- [ ] Annotations can be explored without hover and without precision-only interactions.
- [ ] Word/character/sentence relationships remain understandable without stacked overlays.
- [ ] Keyboard focus, persistent selection, and practice membership have distinct states.
- [ ] Keyboard-only and screen-reader users can complete the core loop and dismiss details.
- [ ] Chinese glyphs, tone marks, translated text, and enlarged text render without clipping.
- [ ] Contrast and touch targets are measured, including dense annotation alternatives.
- [ ] Relevant light/dark, reduced-motion, contrast, and transparency configurations are checked.
- [ ] Scanned pages and image hotspots retain fidelity and alignment after resizing.
- [ ] Playback starts deliberately, has clear states, and does not compete with another pronunciation clip.
- [ ] Correct/incorrect states remain clear without color or audio.
- [ ] Loading, empty, unavailable, error, and save-failure states provide appropriate next steps.
- [ ] Returning from details or practice preserves source location and meaningful learner state.
- [ ] Labels, shortcuts, scrolling, selection, and browser gestures behave consistently.
- [ ] Effects and motion improve understanding and remain responsive on representative devices.
- [ ] No out-of-scope feature was introduced solely to imitate a native Apple application.
- [ ] English beginner explanations stay concise, original-source content takes priority, and secondary phonetic notation does not crowd the reading view.
- [ ] Prepared/unprepared page states and stable correction references are understandable in the agent browser, preferably the Codex browser.

## 26. Maintenance and provenance

This document paraphrases the linked Apple sources and adds clearly labeled project interpretations. Apple retains ownership of its source documentation; illustrations, screenshots, font files, and symbol assets are not copied into this repository by this task.

Research used Apple's public HIG pages, including their linked Markdown representations where accessible. Motion, feedback, Dark Mode, and right-to-left guidance were also available through indexed Apple page content when direct Markdown retrieval was unavailable. This review does not claim an exhaustive crawl of every HIG page.

For future changes, update the review date, check the affected live source pages, and record any deliberate deviation with its usability rationale. Keep implementation measurements and chosen visual tokens separate from claims about what Apple requires.
