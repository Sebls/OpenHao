import { useI18n } from "../../i18n/I18n.tsx";
import { useState } from "react";
import type { Entry } from "../../../contracts/content.ts";
import { writingCharacters } from "./model.ts";
import { WritingBoard } from "./WritingBoard.tsx";
const strokeOrderPreference = "reader.stroke-order-expanded";
let strokeOrderExpanded = true;
function readStrokeOrderPreference() {
  try {
    const saved = localStorage.getItem(strokeOrderPreference);
    if (saved !== null) strokeOrderExpanded = saved !== "false";
  } catch {
    // Keep the preference for this session if browser storage is unavailable.
  }
  return strokeOrderExpanded;
}

export function StrokeOrder({
  entry,
  visible,
  onPractise,
}: {
  entry: Entry;
  visible: boolean;
  onPractise: () => void;
}) {
  const { t } = useI18n();
  const characters = writingCharacters(entry.form);
  const [expanded, setExpanded] = useState(readStrokeOrderPreference);
  const singleCharacter = entry.kind === "character" && characters.length === 1;
  if (!characters.length) return null;
  const practiceButton = (
    <button className="full" onClick={onPractise}>
      {t(
        characters.length === 1
          ? "Practise writing a character"
          : entry.kind === "sentence"
            ? "Practise writing a sentence"
            : "Practise writing a word",
      )}
    </button>
  );
  if (!singleCharacter) return practiceButton;
  return (
    <details
      open={expanded}
      onToggle={(event) => {
        const open = event.currentTarget.open;
        if (open === expanded) return;
        setExpanded(open);
        strokeOrderExpanded = open;
        try {
          localStorage.setItem(strokeOrderPreference, String(open));
        } catch {
          // The in-memory preference still applies to other characters.
        }
      }}
    >
      <summary>{t("Stroke order")}</summary>
      {expanded && (
        <WritingBoard
          character={characters[0]}
          mode="watch"
          visible={visible}
        />
      )}
      {practiceButton}
    </details>
  );
}
