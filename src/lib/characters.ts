import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  deleteDoc,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type { CharacterSheet, WizardState } from "./types";

const WIZARD_STORAGE_KEY = "runarcana_wizard_v1";

export function readWizardStateFromLocalStorage(): WizardState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(WIZARD_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WizardState;
  } catch {
    return null;
  }
}

export async function saveCharacter(
  campaignId: string,
  userId: string,
  state: WizardState,
): Promise<string> {
  const name =
    typeof state.nome === "string" && state.nome.trim()
      ? state.nome.trim()
      : "Sem nome";
  const ref = await addDoc(collection(db, "campaigns", campaignId, "characters"), {
    campaignId,
    userId,
    name,
    state,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCharacter(
  campaignId: string,
  characterId: string,
  state: WizardState,
): Promise<void> {
  const name =
    typeof state.nome === "string" && state.nome.trim()
      ? state.nome.trim()
      : "Sem nome";
  await setDoc(
    doc(db, "campaigns", campaignId, "characters", characterId),
    {
      name,
      state,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function updateCharacterItems(
  campaignId: string,
  characterId: string,
  items: string[],
): Promise<void> {
  await setDoc(
    doc(db, "campaigns", campaignId, "characters", characterId),
    { items, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function addItemToCharacter(
  campaignId: string,
  characterId: string,
  items: string[],
  item: string,
): Promise<void> {
  await updateCharacterItems(campaignId, characterId, [...items, item.trim()]);
}

export async function removeItemFromCharacter(
  campaignId: string,
  characterId: string,
  items: string[],
  item: string,
): Promise<void> {
  await updateCharacterItems(
    campaignId,
    characterId,
    items.filter((i) => i !== item),
  );
}

export async function deleteCharacter(
  campaignId: string,
  characterId: string,
): Promise<void> {
  await deleteDoc(doc(db, "campaigns", campaignId, "characters", characterId));
}

export async function getCharacter(
  campaignId: string,
  characterId: string,
): Promise<CharacterSheet | null> {
  const snap = await getDoc(
    doc(db, "campaigns", campaignId, "characters", characterId),
  );
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as CharacterSheet;
}

export async function getCampaignCharacters(
  campaignId: string,
): Promise<CharacterSheet[]> {
  const snap = await getDocs(
    collection(db, "campaigns", campaignId, "characters"),
  );
  return snap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as CharacterSheet,
  );
}

export function subscribeCharacters(
  campaignId: string,
  onCharacters: (characters: CharacterSheet[]) => void,
): Unsubscribe {
  const q = collection(db, "campaigns", campaignId, "characters");
  return onSnapshot(q, (snap) => {
    const characters = snap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as CharacterSheet,
    );
    onCharacters(characters);
  });
}