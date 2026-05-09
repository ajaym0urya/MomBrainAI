import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
};

export function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function useSpeechRecognition(opts?: { lang?: string }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const supported = typeof window !== "undefined" && !!getRecognitionCtor();

  const start = useCallback(async () => {
    setError(null);
    setTranscript("");
    setInterim("");
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError("Voice input is not supported in this browser. Please use Chrome on desktop or Android.");
      return;
    }
    // request mic permission explicitly
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setError("Microphone permission denied. Please allow mic access in your browser.");
      return;
    }
    const rec = new Ctor();
    rec.lang = opts?.lang || "en-IN";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      let finalT = "";
      let interimT = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalT += r[0].transcript;
        else interimT += r[0].transcript;
      }
      if (finalT) setTranscript((p) => (p + " " + finalT).trim());
      setInterim(interimT);
    };
    rec.onerror = (e: any) => {
      const code = e?.error || "unknown";
      if (code === "no-speech") setError("Didn't hear anything. Try again.");
      else if (code === "not-allowed") setError("Microphone blocked. Allow mic access in browser settings.");
      else setError(`Mic error: ${code}`);
      setIsListening(false);
    };
    rec.onend = () => setIsListening(false);
    recRef.current = rec;
    try {
      rec.start();
      setIsListening(true);
    } catch (err: any) {
      setError(err?.message || "Could not start microphone.");
    }
  }, [opts?.lang]);

  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  useEffect(() => () => recRef.current?.abort(), []);

  return { isListening, transcript, interim, error, start, stop, supported, setTranscript };
}

export function speak(text: string, lang = "en-IN") {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 1;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  } catch {
    // noop
  }
}
