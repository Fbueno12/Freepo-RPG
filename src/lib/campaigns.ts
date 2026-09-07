import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  setDoc,
  serverTimestamp,
  runTransaction,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  Campaign,
  ChatMessage,
  CampaignNotes,
  DiceRoll,
} from "./types";

// ──────────────────────────────────────────────
// Campaigns
// ──────────────────────────────────────────────

export async function createCampaign(
  name: string,
  system: string,
  level: number,
  ownerId: string,
): Promise<string> {
  const campaignRef = await addDoc(collection(db, "campaigns"), {
    name,
    system,
    level,
    ownerId,
    createdAt: serverTimestamp(),
  });

  await setDoc(doc(db, "campaignMembers", campaignRef.id), {
    campaignId: campaignRef.id,
    members: { [ownerId]: "gm" },
    memberUids: [ownerId],
    updatedAt: serverTimestamp(),
  });

  return campaignRef.id;
}

export async function joinCampaign(
  campaignId: string,
  userId: string,
): Promise<void> {
  const ref = doc(db, "campaignMembers", campaignId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists() ? snap.data() : {};

    const members = (current.members ?? {}) as Record<string, string>;
    const memberUids = Array.isArray(current.memberUids)
      ? (current.memberUids as string[])
      : [];

    if (members[userId] || memberUids.includes(userId)) return;

    tx.set(
      ref,
      {
        // Preserva os membros existentes (GM + PCs) e apenas acrescenta o novo.
        // setDoc+merge NÃO faz deep-merge de mapas, então mesclamos aqui.
        members: { ...members, [userId]: "pc" },
        memberUids: [...memberUids, userId],
      },
      { merge: true },
    );
  });
}

export async function deleteCampaign(campaignId: string): Promise<void> {
  await deleteDoc(doc(db, "campaigns", campaignId));
}

export async function getCampaign(
  campaignId: string,
): Promise<Campaign | null> {
  const snap = await getDoc(doc(db, "campaigns", campaignId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Campaign;
}

export async function getUserCampaignIds(userId: string): Promise<string[]> {
  const snap = await getDocs(
    query(
      collection(db, "campaignMembers"),
      where("memberUids", "array-contains", userId),
    ),
  );
  return snap.docs.map((d) => d.id);
}

export async function getUserCampaigns(
  userId: string,
): Promise<Campaign[]> {
  let ids: string[] | null = null;
  try {
    ids = await getUserCampaignIds(userId);
  } catch {
    // Se as rules antigas ainda estiverem publicadas, a query em
    // campaignMembers é negada. Degrada para campanhas que o usuário
    // criou (ownerId), que a regra antiga também permitia ler.
    ids = null;
  }

  if (!ids || ids.length === 0) {
    const owned = await getDocs(
      query(collection(db, "campaigns"), where("ownerId", "==", userId)),
    );
    return owned.docs.map((d) => ({ id: d.id, ...d.data() }) as Campaign);
  }

  const campaigns: Campaign[] = [];
  for (const id of ids) {
    try {
      const c = await getCampaign(id);
      if (c) campaigns.push(c);
    } catch {
      // Campanha inacessível (ex.: rules ainda não publicadas) — pula sem
      // derrubar a lista inteira.
    }
  }
  return campaigns;
}

export async function getMemberCount(
  campaignId: string,
): Promise<number> {
  const snap = await getDoc(doc(db, "campaignMembers", campaignId));
  if (!snap.exists()) return 0;
  const uids = snap.data()?.memberUids as string[] | undefined;
  return Array.isArray(uids) ? uids.length : 0;
}

export async function getMemberRole(
  campaignId: string,
  userId: string,
): Promise<"gm" | "pc" | null> {
  const snap = await getDoc(doc(db, "campaignMembers", campaignId));
  if (!snap.exists()) return null;
  const members = snap.data()?.members as
    | Record<string, string>
    | undefined;
  return (members?.[userId] as "gm" | "pc" | undefined) ?? null;
}

// ──────────────────────────────────────────────
// Chat messages
// ──────────────────────────────────────────────

export function subscribeChat(
  campaignId: string,
  onMessages: (messages: ChatMessage[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, "chats", campaignId, "messages"),
    orderBy("createdAt", "asc"),
  );
  return onSnapshot(q, (snap) => {
    const messages = snap.docs.map(
      (d) => ({ id: d.id, ...d.data() } as ChatMessage),
    );
    onMessages(messages);
  });
}

export async function sendChatMessage(
  campaignId: string,
  userId: string,
  userName: string,
  text: string,
  diceRoll?: DiceRoll,
): Promise<void> {
  await addDoc(collection(db, "chats", campaignId, "messages"), {
    userId,
    userName,
    text,
    ...(diceRoll ? { diceRoll } : {}),
    createdAt: serverTimestamp(),
  });
}

// ──────────────────────────────────────────────
// Notes
// ──────────────────────────────────────────────

export function subscribeNotes(
  campaignId: string,
  onNotes: (notes: CampaignNotes | null) => void,
): Unsubscribe {
  return onSnapshot(doc(db, "notes", campaignId), (snap) => {
    if (!snap.exists()) {
      onNotes(null);
      return;
    }
    onNotes({ id: snap.id, ...snap.data() } as CampaignNotes);
  });
}

export async function saveNotes(
  campaignId: string,
  content: string,
  userId: string,
): Promise<void> {
  await setDoc(doc(db, "notes", campaignId), {
    campaignId,
    content,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  });
}