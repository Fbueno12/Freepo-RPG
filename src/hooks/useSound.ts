"use client";

import { useCallback, useState } from "react";
import { playDiceSound, playMessageSound, playSignalSound } from "@/lib/sound";

const KEY = "freepo_sound_on";

function readPref(): boolean {
  if (typeof window === "undefined") return true;
  const v = window.localStorage.getItem(KEY);
  return v === null ? true : v === "1";
}

export function useSound() {
  const [enabled, setEnabled] = useState(readPref);

  const clamp = useCallback(
    (play: () => void) => {
      if (readPref()) play();
    },
    [],
  );

  const dice = useCallback(() => clamp(playDiceSound), [clamp]);
  const message = useCallback(() => clamp(playMessageSound), [clamp]);
  const signal = useCallback(() => clamp(playSignalSound), [clamp]);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      window.localStorage.setItem(KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  return { enabled, dice, message, signal, toggle };
}