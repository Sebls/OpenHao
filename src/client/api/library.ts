import type {
  Catalog,
  Manifest,
  StudyDocument,
} from "../../contracts/content.ts";
async function get<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok)
    throw Error("The material could not be loaded. Try reopening it.");
  // Only the loopback server's validated catalog/revisions are consumed here.
  return response.json() as Promise<T>;
}
const base = import.meta.env.BASE_URL;
export const getCatalog = () => get<Catalog>(`${base}api/catalog.json`);
export async function getDocument(manifest: Manifest): Promise<StudyDocument> {
  const data = await get<StudyDocument>(
    `${base}api/document/${manifest.documentId}/${manifest.contentRevision}.json`,
  );
  return {
    ...data,
    pages: Object.fromEntries(
      Object.entries(data.pages).map(([pageId, page]) => [
        pageId,
        {
          ...page,
          questions: {
            ...page.questions,
            questions: page.questions.questions.map((question) => ({
              ...question,
              pageId,
            })),
          },
        },
      ]),
    ),
  };
}
