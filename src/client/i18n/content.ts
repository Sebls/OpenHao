import type { Locale } from "./messages.ts";

// Reviewed display translations of authored content. Exact matches preserve
// unknown text and leave immutable library revisions and source records intact.
const french: Readonly<Record<string, string>> = {
  "Handwritten intermediate stroke fragments, small source pinyin/French labels and faint repeated tracing models are imperfectly recovered by OCR. These regions are not learning targets; the unchanged source remains authoritative.":
    "La reconnaissance optique de caractères restitue imparfaitement les étapes manuscrites intermédiaires des traits, les petites légendes en pinyin et en français ainsi que les modèles de tracé répétés et peu visibles. Ces zones ne sont pas des éléments à étudier ; le document original, inchangé, fait référence.",
  "Reviewed IPA is not available for these entries; tone-mark pinyin is available.":
    "Aucune transcription phonétique en API vérifiée n’est disponible pour ces entrées ; le pinyin avec marques de tons est disponible.",
  "Simplified from 冊, whose oracle-bone form depicts bamboo slips tied together with horizontal cords—the earliest form of a bound book or volume.":
    "Forme simplifiée de 冊, dont la graphie sur os oraculaires représente des lamelles de bambou reliées par des cordelettes horizontales : la forme la plus ancienne d’un livre ou d’un volume relié.",
  "Oracle bone": "Écriture sur os oraculaires",
  Bronze: "Écriture sur bronze",
  Clerical: "Écriture des scribes",
  "Early Western Zhou": "Début des Zhou occidentaux",
  "Cao Wei": "Wei (dynastie Cao)",
  "Source: CUHK character database": "Source : base de caractères de la CUHK",
  "Source: Han Dian": "Source : Han Dian",
};

export function translateContent(text: string, locale: Locale): string {
  return locale === "fr" && Object.hasOwn(french, text) ? french[text]! : text;
}
