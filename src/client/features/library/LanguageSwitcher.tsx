import { useI18n } from "../../i18n/I18n.tsx";
import type { Manifest } from "../../../contracts/content.ts";
import type { TranslationLanguage } from "./variants.ts";

export function LanguageSwitcher({
  variants,
  language,
  onChange,
}: {
  variants: Manifest[];
  language: TranslationLanguage;
  onChange: (language: TranslationLanguage) => void;
}) {
  const { t } = useI18n();
  const languages = (["en", "fr"] as const).filter((lang) =>
    variants.some((m) => m.translationLanguage === lang),
  );
  if (languages.length === 1) {
    return (
      <span
        className="language-label"
        aria-label={
          language === "en"
            ? t("English explanations")
            : t("French explanations")
        }
      >
        {language.toUpperCase()}
      </span>
    );
  }
  return (
    <div
      className="language-switcher"
      role="group"
      aria-label={t("Explanation language")}
    >
      {languages.map((lang) => (
        <button
          key={lang}
          type="button"
          aria-label={lang === "en" ? t("English") : t("French")}
          aria-pressed={language === lang}
          onClick={() => onChange(lang)}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
