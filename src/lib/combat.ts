import {
  doc,
  setDoc,
  serverTimestamp,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type { CombatState, Combatant } from "./types";

export function subscribeCombat(
  campaignId: string,
  onCombat: (combat: CombatState | null) => void,
): Unsubscribe {
  return onSnapshot(doc(db, "combat", campaignId), (snap) => {
    if (!snap.exists()) {
      onCombat(null);
      return;
    }
    onCombat(snap.data() as CombatState);
  });
}

export async function setCombat(
  campaignId: string,
  combat: Partial<Omit<CombatState, "updatedAt">>,
): Promise<void> {
  await setDoc(
    doc(db, "combat", campaignId),
    { ...combat, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function createCombat(
  campaignId: string,
  combatants: Combatant[],
): Promise<void> {
  await setDoc(doc(db, "combat", campaignId), {
    active: true,
    currentIndex: 0,
    combatants,
    updatedAt: serverTimestamp(),
  });
}

export async function endCombat(campaignId: string): Promise<void> {
  await setCombat(campaignId, { active: false, currentIndex: 0 });
}

export function nextTurn(campaignId: string, combat: CombatState): void {
  const count = combat.combatants.length;
  if (count === 0) return;
  void setCombat(campaignId, {
    currentIndex: (combat.currentIndex + 1) % count,
  });
}

export function rollInitiativeForAll(combatants: Combatant[]): Combatant[] {
  return [...combatants]
    .map((c) => ({ ...c, value: 1 + Math.floor(Math.random() * 20) }))
    .sort((a, b) => b.value - a.value);
}

export function addCombatants(
  campaignId: string,
  combat: CombatState,
  newCombatants: Combatant[],
): Promise<void> {
  return setCombat(campaignId, {
    combatants: [...combat.combatants, ...newCombatants],
  });
}

export function removeCombatant(
  campaignId: string,
  combat: CombatState,
  id: string,
): Promise<void> {
  return setCombat(campaignId, {
    combatants: combat.combatants.filter((c) => c.id !== id),
  });
}