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
      width: "100%",
      playerVars: { autoplay: 0, controls: 0, modestbranding: 1 },
      events: {
        onReady: () => setReady(true),
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

  const seek = useCallback((seconds: number) => {
    playerRef.current?.seekTo?.(seconds, true);
  }, []);

  return { containerRef, apiLoaded, ready, play, pause, load, seek };
}