import { useEffect, useRef } from "react";

/**
 * Speaks the newest caster line. Requires an explicit user gesture to enable,
 * respects mute, and never replays history on refresh.
 */
export default function useCaster(events, enabled) {
  const lastSpoken = useRef(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (!events?.length) return;
    const latest = events[0];
    if (!initialized.current) {
      initialized.current = true;
      lastSpoken.current = latest.id;
      return;
    }
    if (!enabled) {
      lastSpoken.current = latest.id;
      return;
    }
    if (latest.id === lastSpoken.current) return;
    lastSpoken.current = latest.id;
    if (!latest.caster_text) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(latest.caster_text);
      utter.rate = 1.06;
      utter.pitch = 1.15;
      utter.volume = 1;
      window.speechSynthesis.speak(utter);
    } catch {
      /* speech is optional */
    }
  }, [events, enabled]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);
}
