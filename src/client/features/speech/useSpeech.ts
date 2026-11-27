import { useI18n } from "../../i18n/I18n.tsx";
import type { MessageKey } from "../../i18n/en.ts";
import { useEffect, useRef, useState } from "react";
export function useSpeech() {
  const { t } = useI18n();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]),
    [status, setStatus] = useState<MessageKey | "">(""),
    [working, setWorking] = useState(false),
    [activeText, setActiveText] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    utteranceId = useRef(0);
  useEffect(() => {
    if (!window.speechSynthesis) return;
    const update = () =>
      setVoices(
        speechSynthesis
          .getVoices()
          .filter((v) => v.localService && /^zh(-|_)(CN|Hans)/i.test(v.lang)),
      );
    update();
    speechSynthesis.addEventListener("voiceschanged", update);
    return () => {
      speechSynthesis.removeEventListener("voiceschanged", update);
      speechSynthesis.cancel();
      clearTimeout(timer.current);
    };
  }, []);
  function stop() {
    utteranceId.current++;
    clearTimeout(timer.current);
    window.speechSynthesis?.cancel();
    setActiveText(null);
    setStatus("Stopped");
  }
  function speak(text: string) {
    if (!voices.length) return;
    stop();
    const id = utteranceId.current,
      utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voices[0];
    utterance.lang = voices[0].lang;
    utterance.rate = 0.8;
    setActiveText(text);
    setStatus("Starting pronunciation…");
    utterance.onstart = () => {
      if (id !== utteranceId.current) return;
      setStatus("Playing");
      clearTimeout(timer.current);
    };
    utterance.onend = () => {
      if (id !== utteranceId.current) return;
      setActiveText(null);
      setStatus("Finished");
      setWorking(true);
      clearTimeout(timer.current);
    };
    utterance.onerror = () => {
      if (id !== utteranceId.current) return;
      setActiveText(null);
      setStatus("Audio could not play. Try again.");
      setWorking(false);
      clearTimeout(timer.current);
    };
    timer.current = setTimeout(() => {
      speechSynthesis.cancel();
      setActiveText(null);
      setStatus("Audio could not play. Try again.");
      setWorking(false);
    }, 12000);
    speechSynthesis.speak(utterance);
  }
  return {
    available: voices.length > 0,
    voiceName: voices[0]?.name,
    working,
    activeText,
    failed: status === "Audio could not play. Try again.",
    status: status ? t(status) : "",
    speak,
    stop,
  };
}

export type Speech = ReturnType<typeof useSpeech>;
