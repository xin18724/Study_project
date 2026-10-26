"use client";

import { useEffect, useState } from "react";

export default function SpeakButton({ text }: { text: string }) {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(
      "speechSynthesis" in window &&
      typeof SpeechSynthesisUtterance !== "undefined"
    );
  }, []);

  const speak = () => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <button
      type="button"
      className="speak-button"
      onClick={speak}
      disabled={!supported}
      aria-label={supported ? "朗读单词 " + text : "当前浏览器不支持朗读"}
      title={supported ? "朗读单词" : "当前浏览器不支持朗读"}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9v6h4l5 4V5L8 9H4Z" />
        <path d="M16 9.5a4 4 0 0 1 0 5" />
        <path d="M18.5 7a7.5 7.5 0 0 1 0 10" />
      </svg>
    </button>
  );
}
