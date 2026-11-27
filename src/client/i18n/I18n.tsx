import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { localeFromPath } from "./locale.ts";
import { translator, type Locale } from "./messages.ts";

const I18nContext = createContext<{
  language: Locale;
  setLanguage: (language: Locale) => void;
  t: ReturnType<typeof translator>;
} | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Locale>(() =>
    localeFromPath(window.location.pathname, import.meta.env.BASE_URL),
  );
  const value = useMemo(
    () => ({ language, setLanguage, t: translator(language) }),
    [language],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("I18nProvider is missing");
  return value;
}
