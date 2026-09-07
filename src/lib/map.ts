import {
  doc,
  setDoc,
  serverTimestamp,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type { MapState, MapToken } from "./types";

export const DEFAULT_MAP_BACKGROUND =
  "radial-gradient(40% 30% at 20% 20%, #1e1a15 0, transparent 70%), radial-gradient(50% 35% at 80% 25%, #1a1613 0, transparent 70%), radial-gradient(35% 30% at 35% 75%, #171410 0, transparent 70%), radial-gradient(45% 30% at 75% 80%, #1e1a15 0, transparent 60%), #110f0c";

export function subscribeMap(
  campaignId: string,
  onMap: (map: MapState | null) => void,
): Unsubscribe {
  return onSnapshot(doc(db, "map", campaignId), (snap) => {
    if (!snap.exists()) {
      onMap(null);
      return;
    }
    onMap(snap.data() as MapState);
  });
}

export async function setMap(
  campaignId: string,
  map: Partial<Omit<MapState, "updatedAt">>,
): Promise<void> {
  await setDoc(
    doc(db, "map", campaignId),
    { ...map, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function setMapBackground(
  campaignId: string,
  backgroundImage: string,
): Promise<void> {
  await setMap(campaignId, { backgroundImage });
}

export async function addToken(
  campaignId: string,
  map: MapState | null,
  token: Omit<MapToken, "id">,
): Promise<void> {
  const id = crypto.randomUUID();
  await setMap(campaignId, {
    tokens: [...(map?.tokens ?? []), { ...token, id }],
  });
}

export async function moveToken(
  campaignId: string,
  map: MapState,
  tokenId: string,
  x: number,
  y: number,
): Promise<void> {
  await setMap(campaignId, {
    tokens: map.tokens.map((t) =>
      t.id === tokenId ? { ...t, x, y } : t,
    ),
  });
}

export async function removeToken(
  campaignId: string,
  map: MapState,
  tokenId: string,
): Promise<void> {
  await setMap(campaignId, {
    tokens: map.tokens.filter((t) => t.id !== tokenId),
  });
}