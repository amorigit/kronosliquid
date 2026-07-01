"use client";

import { useEffect, useRef, useState } from "react";

export function BgMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.3;
    }
  }, []);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play().catch(() => {});
      setPlaying(true);
    }
  }

  return (
    <>
      <audio ref={audioRef} src="/title-screen.mp3" loop preload="none" />
      <button
        onClick={toggle}
        className="fixed bottom-16 md:bottom-4 right-4 z-50 w-8 h-8 flex items-center justify-center rounded-full transition-colors"
        style={{
          background: playing ? "rgba(0,255,65,0.1)" : "#1a1a1a",
          border: `1px solid ${playing ? "#00ff41" : "#333"}`,
          fontSize: 14,
        }}
        title={playing ? "Mute music" : "Play music"}
      >
        {playing ? "🔊" : "🔇"}
      </button>
    </>
  );
}
