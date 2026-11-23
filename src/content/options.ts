export interface Options {
  id?: string;
  input?: string;
  pages?: string;
  title?: string;
  ref?: string;
  page?: string;
  help?: boolean;
  ocr?: boolean;
  "all-pages"?: boolean;
}
export function parseOptions(args: string[]): Options {
  const result: Record<string, string | boolean> = {};
  const flags = new Set(["help", "ocr", "all-pages"]);
  const values = new Set(["id", "input", "pages", "title", "ref", "page"]);
  for (let i = 0; i < args.length; i++) {
    if (!args[i].startsWith("--")) throw Error("Expected --option");
    const name = args[i].slice(2);
    if (flags.has(name)) result[name] = true;
    else if (values.has(name)) {
      const value = args[++i];
      if (!value || value.startsWith("--"))
        throw Error("Provide a value for --" + name);
      result[name] = value;
    } else throw Error("Unknown option: --" + name);
  }
  return result;
}
