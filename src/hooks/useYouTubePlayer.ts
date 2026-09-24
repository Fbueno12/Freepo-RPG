"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface WindowWithYT {
  YT?: {
    Player: new (element: HTMLElement, options: {
      videoId?: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, unknown>;
      events?: { onReady?: (e: any) => void; onStateChange?: (e: any) => void };
    }) => any;
    PlayerState: { PLAYING: number; PAUSED: number };
  };
  onYouTubeIframeAPIReady?: () => void;
}

export function useYouTubePlayer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [ready, setReady] = useState(false);
  const [volume, setVolumeState] = useState(100);

  useEffect(() => {
    const w = window as WindowWithYT;
    if (!w.onYouTubeIframeAPIReady) {
      w.onYouTubeIframeAPIReady = () => setApiLoaded(true);
    } else {
      const prev = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => {
        prev();
        setApiLoaded(true);
      };
    }
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  }, []);

  useEffect(() => {
    if (!apiLoaded || !containerRef.current || playerRef.current) return;
    const w = window as WindowWithYT;
    if (!w.YT) return;
    playerRef.current = new w.YT.Player(containerRef.current, {
      width: 1,
      height: 1,
      playerVars: {
        autoplay: 0,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        disablekb: 1,
      },
      events: {
        onReady: () => {
          playerRef.current?.setVolume?.(100);
          setReady(true);
        },
      },
    });
  }, [apiLoaded]);

  const play = useCallback(() => {
    playerRef.current?.playVideo?.();
  }, []);

  const pause = useCallback(() => {
    playerRef.current?.pauseVideo?.();
  }, []);

  const load = useCallback((videoId: string, seekTo: number) => {
    if (playerRef.current?.loadVideoById) {
      playerRef.current.loadVideoById(videoId);
      if (seekTo > 0) {
        playerRef.current.seekTo(seekTo, true);
      }
      playerRef.current.playVideo();
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(100, vol));
    playerRef.current?.setVolume?.(clamped);
    setVolumeState(clamped);
  }, []);

  const getCurrentTime = useCallback((): number => {
    return playerRef.current?.getCurrentTime?.() ?? 0;
  }, []);

  return { containerRef, ready, play, pause, load, volume, setVolume, getCurrentTime };
}
