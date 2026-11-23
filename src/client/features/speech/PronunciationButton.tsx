import type { Speech } from "./useSpeech.ts";
export function PronunciationButton({
  speech,
  text,
}: {
  speech: Speech;
  text: string;
}) {
  const playing = speech.activeText === text;
  const label = playing ? "Stop pronunciation" : "Play pronunciation";
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
