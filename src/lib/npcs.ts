import {
  doc,
  setDoc,
  serverTimestamp,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

export interface CampaignNpc {
  id: string;
  name: string;
  icon: string;
  hp?: string;
  notes?: string;
}

export interface NpcRoster {
  npcs: CampaignNpc[];
  updatedAt: ReturnType<typeof serverTimestamp> | null;
}

export function subscribeNpcs(
  campaignId: string,
  onNpcs: (npcs: CampaignNpc[]) => void,
): Unsubscribe {
  return onSnapshot(doc(db, "npcs", campaignId), (snap) => {
    if (!snap.exists()) {
      onNpcs([]);
      return;
    }
    const data = snap.data();
    onNpcs((data.npcs as CampaignNpc[]) || []);
  });
}

export async function setNpcs(
  campaignId: string,
  npcs: CampaignNpc[],
): Promise<void> {
  await setDoc(
    doc(db, "npcs", campaignId),
    { npcs, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function addNpc(
  campaignId: string,
  npcs: CampaignNpc[],
  npc: Omit<CampaignNpc, "id">,
): Promise<void> {
  const npcWithId: CampaignNpc = {
    id: `npc_${crypto.randomUUID()}`,
    ...npc,
  };
  await setNpcs(campaignId, [...npcs, npcWithId]);
}

export async function removeNpc(
  campaignId: string,
  npcs: CampaignNpc[],
  npcId: string,
): Promise<void> {
  await setNpcs(
    campaignId,
    npcs.filter((n) => n.id !== npcId),
  );
}