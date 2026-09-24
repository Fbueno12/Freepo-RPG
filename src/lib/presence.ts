import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

export interface OnlineUser {
  uid: string;
  name: string;
}

export function subscribePresence(
  campaignId: string,
  onPresence: (users: OnlineUser[]) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, "presence", campaignId, "users"),
    (snap) => {
      const users = snap.docs.map((d) => ({
        uid: d.id,
        name: (d.data() as { name: string }).name,
      }));
      onPresence(users);
    },
  );
}

export async function setOnline(
  campaignId: string,
  uid: string,
  name: string,
): Promise<void> {
  await setDoc(doc(db, "presence", campaignId, "users", uid), { name });
}

export async function setOffline(
  campaignId: string,
  uid: string,
): Promise<void> {
  await deleteDoc(doc(db, "presence", campaignId, "users", uid));
}
