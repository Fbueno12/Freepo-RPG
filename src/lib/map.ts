import {
  doc,
  setDoc,
  serverTimestamp,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type { MapState, MapToken } from "./types";
import {
  createToken,
  moveTokenTo,
  removeTokenDoc,
} from "./tokens";

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
  _map: MapState | null,
  token: Omit<MapToken, "id">,
): Promise<void> {
  // Legado V1 (array) → delega para a subcoleção V2. `_map` ignorado.
  await createToken(campaignId, {
    ...token,
    x: token.x ?? 45 + Math.random() * 10,
    y: token.y ?? 40 + Math.random() * 10,
  });
}

export async function moveToken(
  campaignId: string,
  _map: MapState,
  tokenId: string,
  x: number,
  y: number,
): Promise<void> {
  await moveTokenTo(campaignId, tokenId, x, y);
}

export async function removeToken(
  campaignId: string,
  _map: MapState,
  tokenId: string,
): Promise<void> {
  await removeTokenDoc(campaignId, tokenId);
}