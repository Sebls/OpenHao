/** Version 1 disk and HTTP contracts. Offsets are Unicode code points; rectangles
 * are normalized visible-crop coordinates. JSON remains subject to runtime checks. */
export type ReviewStatus = "draft" | "reviewed" | "needs-review";
export type UnitKind =
  "character" | "word" | "expression" | "sentence" | "grammar";
export type Rect = [number, number, number, number];
export interface Issue {
  severity: "error" | "warning" | "info";
  message?: string;
  reason?: string;
  pageId?: string;
}
export interface PageIdentity {
  documentId: string;
  pageId: string;
  extractionRevision: number;
}
export interface SourceRange {
  id?: string;
  start: number;
  end: number;
  exactText: string;
}
export interface Anchor extends SourceRange {
  pageId: string;
  extractionRevision: number;
  characterIds: string[];
}
export interface Pronunciation {
  system: string;
  value: string;
  reviewStatus: ReviewStatus;
}
export interface Entry {
  id: string;
  kind: UnitKind;
  form: string;
  meaning: string;
  pronunciations: Pronunciation[];
  reviewStatus: ReviewStatus;
  constituentIds?: string[];
  explanation?: string;
  grammar?: string;
  speechTarget?: string;
  pronunciationNote?: string;
}
export interface Annotation {
  id: string;
  entryId: string;
  kind: UnitKind;
  anchors: Anchor[];
  reviewStatus: ReviewStatus;
  formMapping?: unknown;
}
export type QuestionCategory =
  | "character-identification"
  | "zh-to-en"
  | "en-to-zh"
  | "sentence-comprehension"
  | "missing-word"
  | "grammar-comprehension"
  | "listening-comprehension";
export interface Question {
  id: string;
  type: "single-choice";
  category: QuestionCategory;
  topic?: string;
  prompt: string;
  promptLanguage: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  explanation: string;
  explanationLanguage: string;
  sourceAnnotationIds: string[];
  entryIds?: string[];
  requiresAudio: boolean;
  speechTarget?: string;
  origin: "agent-authored" | "template-generated";
  reviewStatus: ReviewStatus;
  /** Browser enrichment, never written back to prepared content. */
  pageId?: string;
}
export interface Character extends SourceRange {
  id: string;
  lineId: string;
  blockId: string;
  rect: Rect;
}
export interface Line extends SourceRange {
  id: string;
  blockId: string;
  rect: Rect;
}
export interface Block extends SourceRange {
  id: string;
  rect: Rect;
}
export interface Layout extends PageIdentity {
  width: number;
  height: number;
  rotation: number;
  textSha256: string;
  offsetUnit: "unicode-code-point";
  transcriptRange: [number, number];
  characters: Character[];
  lines: Line[];
  blocks: Block[];
}
export interface EntriesFile extends PageIdentity {
  entries: Entry[];
}
export interface AnnotationsFile extends PageIdentity {
  annotations: Annotation[];
}
export interface QuestionsFile extends PageIdentity {
  questions: Question[];
}
export interface Review extends PageIdentity {
  sourceVisualReview: boolean;
  linguisticReview: boolean;
  reviewer: string;
  textSha256?: string;
  issues: Issue[];
}
export interface PageContent {
  text: string;
  layout: Layout;
  entries: EntriesFile;
  annotations: AnnotationsFile;
  questions: QuestionsFile;
  review: Review;
}
export interface Page {
  id: string;
  pageNumber: number;
  width: number;
  height: number;
  rotation: number;
  state: "not-prepared" | "extracted" | "needs-review" | "ready";
  questionAvailability: string[];
  extractionRevision?: number;
  mediaBox?: Rect;
  cropBox?: Rect;
}
export type ItemKind = "entry" | "annotation" | "question";
export interface Manifest {
  schemaVersion: "1.0";
  documentId: string;
  contentRevision: number;
  baseRevision?: number;
  title: string;
  sourceLanguage: string;
  translationLanguage: "en";
  source: {
    pathBase: "data-root";
    path: string;
    sha256: string;
    bytes: number;
    pageCount: number;
  };
  pages: Page[];
  files: Record<string, string>;
  learningProfile: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  provenance: Record<string, unknown>;
  repairScope?: string[];
  repairTargets?: { pageId: string; kind: ItemKind; itemId: string }[];
}
export interface Catalog {
  documents: Manifest[];
  issues: { documentId: string; message: string }[];
}
export interface StudyDocument {
  manifest: Manifest;
  pages: Record<string, PageContent>;
}
export interface ValidationResult {
  ok: boolean;
  issues: Issue[];
  documentId?: string;
  revision?: number;
}
export interface SourceInspection {
  title: string | null;
  pageCount: number;
  tool: string;
  pages: Omit<Page, "id" | "state" | "questionAvailability">[];
}
