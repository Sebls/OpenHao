import { useI18n } from "../../i18n/I18n.tsx";
import type { Speech } from "./useSpeech.ts";
export function PronunciationButton({
  speech,
  text,
}: {
  speech: Speech;
  text: string;
}) {
  const { t } = useI18n();
  const playing = speech.activeText === text;
  const label = playing ? t("Stop pronunciation") : t("Play pronunciation");
  return (
    <button
      type="button"
      className="icon-control"
      aria-label={label}
      title={label}
      disabled={!speech.available}
      onClick={() => (playing ? speech.stop() : speech.speak(text))}
    >
      <span aria-hidden="true">{playing ? "□" : "▷"}</span>
    </button>
  );
}
