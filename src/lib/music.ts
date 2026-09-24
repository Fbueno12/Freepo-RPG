import {
  doc,
  setDoc,
  serverTimestamp,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type { MusicState, MusicTrack } from "./types";
import { extractVideoId } from "./youtube";

export function subscribeMusic(
  campaignId: string,
  onMusic: (music: MusicState | null) => void,
): Unsubscribe {
  return onSnapshot(doc(db, "music", campaignId), (snap) => {
    if (!snap.exists()) {
      onMusic(null);
      return;
    }
    onMusic(snap.data() as MusicState);
  });
}

export async function setMusic(
  campaignId: string,
  music: Partial<Omit<MusicState, "updatedAt">>,
): Promise<void> {
  await setDoc(
    doc(db, "music", campaignId),
    { ...music, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function initMusic(
  campaignId: string,
  controlledBy: string,
): Promise<void> {
  await setDoc(doc(db, "music", campaignId), {
    controlledBy,
    currentTrackId: "",
    playing: false,
    seekTo: 0,
    startedAt: 0,
    tracks: [],
    updatedAt: serverTimestamp(),
  });
}

export async function addTrack(
  campaignId: string,
  music: MusicState,
  urlOrId: string,
  title?: string,
): Promise<void> {
  const videoId = extractVideoId(urlOrId);
  if (!videoId) return;
  const track: MusicTrack = {
    id: crypto.randomUUID(),
    title: title?.trim() || `YouTube · ${videoId.slice(0, 8)}`,
    meta: "Adicionado pela mesa",
    videoId,
  };
  await setMusic(campaignId, {
    tracks: [...music.tracks, track],
  });
}

export async function removeTrack(
  campaignId: string,
  music: MusicState,
  trackId: string,
): Promise<void> {
  const tracks = music.tracks.filter((t) => t.id !== trackId);
  await setMusic(campaignId, {
    tracks,
    currentTrackId:
      music.currentTrackId === trackId ? (tracks[0]?.id ?? "") : music.currentTrackId,
  });
}

export async function playTrack(
  campaignId: string,
  trackId: string,
): Promise<void> {
  await setMusic(campaignId, {
    currentTrackId: trackId,
    playing: true,
    seekTo: 0,
    startedAt: Date.now(),
  });
}

export async function togglePlay(
  campaignId: string,
  music: MusicState,
  currentTime: number,
): Promise<void> {
  if (music.playing) {
    await setMusic(campaignId, {
      playing: false,
      seekTo: currentTime,
      startedAt: 0,
    });
  } else {
    await setMusic(campaignId, {
      playing: true,
      seekTo: music.seekTo,
      startedAt: Date.now(),
    });
  }
}

export async function stopMusic(
  campaignId: string,
): Promise<void> {
  await setMusic(campaignId, {
    currentTrackId: "",
    playing: false,
    seekTo: 0,
    startedAt: 0,
  });
}