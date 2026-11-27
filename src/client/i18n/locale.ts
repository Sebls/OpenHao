import type { Locale } from "./messages.ts";

/** Unprefixed legacy links default to English, independently of browser storage. */
export function localeFromPath(pathname: string, baseUrl = "/"): Locale {
  const base = `/${baseUrl.replace(/^\/+|\/+$/g, "")}/`.replace(/^\/\//, "/");
  const relative =
    base !== "/" && pathname.startsWith(base)
      ? pathname.slice(base.length - 1)
      : pathname;
  return relative.split("/")[1] === "fr" ? "fr" : "en";
}
