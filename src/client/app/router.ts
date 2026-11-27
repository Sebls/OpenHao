import type { Locale } from "../i18n/messages.ts";

export type AppRoute =
  | { view: "library" }
  | {
      view: "reader";
      documentId: string;
      pageNumber?: number;
      annotationId?: string;
    }
  | {
      view: "practice";
      documentId: string;
      pageNumber?: number;
    }
  | {
      view: "writing";
      documentId: string;
      pageNumber: number;
      annotationId: string;
    };

function normalizeBase(baseUrl: string): string {
  const withLeading = baseUrl.startsWith("/") ? baseUrl : `/${baseUrl}`;
  return withLeading.endsWith("/") ? withLeading : `${withLeading}/`;
}

function stripBase(pathname: string, baseUrl: string): string {
  const base = normalizeBase(baseUrl);
  if (base !== "/") {
    if (pathname.startsWith(base)) {
      return pathname.slice(base.length - 1);
    }
    if (pathname === base.slice(0, -1)) {
      return "/";
    }
  }
  return pathname || "/";
}

export { localeFromPath } from "../i18n/locale.ts";

function parsePositiveInt(
  value: string | null | undefined,
): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 1 ? n : undefined;
}

/**
 * Parses a URL path + query string (relative to `baseUrl`) into a typed `AppRoute`.
 * Returns `null` if the path does not match any known route.
 */
export function parseRoute(
  pathAndSearch: string,
  baseUrl = "/",
): AppRoute | null {
  const url = new URL(pathAndSearch, "http://localhost");
  const relPath =
    stripBase(url.pathname, baseUrl).replace(/^\/(en|fr)(?=\/|$)/, "") || "/";
  const cleanPath = relPath.length > 1 ? relPath.replace(/\/+$/, "") : relPath;

  if (cleanPath === "/") {
    return { view: "library" };
  }

  const rawSegments = cleanPath.slice(1).split("/");
  const segments = rawSegments.map((s) => decodeURIComponent(s));

  if (segments[0] !== "doc" || !segments[1]) {
    return null;
  }

  const documentId = segments[1];

  // /doc/:documentId
  if (segments.length === 2) {
    const annotationId = url.searchParams.get("annotation") || undefined;
    return { view: "reader", documentId, annotationId };
  }

  // /doc/:documentId/page/:pageNumber
  if (segments.length === 4 && segments[2] === "page") {
    const pageNumber = parsePositiveInt(segments[3]);
    if (!pageNumber) return null;
    const annotationId = url.searchParams.get("annotation") || undefined;
    return { view: "reader", documentId, pageNumber, annotationId };
  }

  // /doc/:documentId/practice
  if (segments.length === 3 && segments[2] === "practice") {
    const pageNumber = parsePositiveInt(url.searchParams.get("page"));
    return {
      view: "practice",
      documentId,
      ...(pageNumber !== undefined ? { pageNumber } : {}),
    };
  }

  // /doc/:documentId/writing/:pageNumber/:annotationId
  if (segments.length === 5 && segments[2] === "writing" && segments[4]) {
    const pageNumber = parsePositiveInt(segments[3]);
    if (!pageNumber) return null;
    return {
      view: "writing",
      documentId,
      pageNumber,
      annotationId: segments[4],
    };
  }

  return null;
}

/**
 * Formats an `AppRoute` into a URL path + query string prefixed with `baseUrl`.
 */
export function formatRoute(
  route: AppRoute,
  baseUrl = "/",
  language?: Locale,
): string {
  const base = normalizeBase(baseUrl) + (language ? `${language}/` : "");
  const prefix = base === "/" ? "" : base.slice(0, -1);

  switch (route.view) {
    case "library":
      return base;
    case "reader": {
      const doc = encodeURIComponent(route.documentId);
      const pathname = route.pageNumber
        ? `${prefix}/doc/${doc}/page/${route.pageNumber}`
        : `${prefix}/doc/${doc}`;
      if (!route.annotationId) return pathname;
      const params = new URLSearchParams({ annotation: route.annotationId });
      return `${pathname}?${params.toString()}`;
    }
    case "practice": {
      const doc = encodeURIComponent(route.documentId);
      const pathname = `${prefix}/doc/${doc}/practice`;
      const params = new URLSearchParams();
      if (route.pageNumber !== undefined) {
        params.set("page", String(route.pageNumber));
      }
      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    }
    case "writing": {
      const doc = encodeURIComponent(route.documentId);
      const ann = encodeURIComponent(route.annotationId);
      return `${prefix}/doc/${doc}/writing/${route.pageNumber}/${ann}`;
    }
  }
}
