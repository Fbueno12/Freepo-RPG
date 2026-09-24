import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type { MapToken } from "./types";

export type NewToken = Omit<MapToken, "id" | "visible"> & {
  visible?: boolean;
};

function tokensCol(campaignId: string) {
  return collection(db, "map", campaignId, "tokens");
}

function tokenDoc(campaignId: string, tokenId: string) {
  return doc(db, "map", campaignId, "tokens", tokenId);
}

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

function clampCoord(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(100, Math.max(0, v));
}

/** Firestore rejeita campos `undefined` — remove antes de salvar. */
function withoutUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as T;
}

/** Visibilidade padrão: PC nasce visível, NPC/GM-objeto nasce escondido. */
export function defaultVisibility(type: MapToken["type"]): boolean {
  return type === "pc";
}

export function isTokenVisibleTo(
  token: MapToken,
  viewer: { isGM: boolean; uid?: string },
): boolean {
  if (token.visible ?? defaultVisibility(token.type)) return true;
  if (viewer.isGM) return true;
  if (viewer.uid && token.ownerId === viewer.uid) return true;
  return false;
}

// ── Leitura ──

export function subscribeTokens(
  campaignId: string,
  opts: { canSeeHidden: boolean; uid?: string },
  onTokens: (tokens: MapToken[]) => void,
): Unsubscribe {
  // Jogador comum: query já filtrada (rules negam query ampla com
  // escondidos — "rules are not filters"). GM/dono do token vê tudo.
  const q = opts.canSeeHidden
    ? query(tokensCol(campaignId))
    : query(tokensCol(campaignId), where("visible", "==", true));
  return onSnapshot(q, (snap) => {
    let tokens = snap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as MapToken,
    );
    // Dono enxerga o próprio token mesmo escondido (caso a query
    // filtrada o exclua): busca pontual não entra aqui; o filtro
    // client-side garante.
    if (!opts.canSeeHidden && opts.uid) {
      tokens = tokens.filter((t) => isTokenVisibleTo(t, { isGM: false, uid: opts.uid }));
    }
    onTokens(tokens);
  });
}

export async function getToken(
  campaignId: string,
  tokenId: string,
): Promise<MapToken | null> {
  const snap = await getDoc(tokenDoc(campaignId, tokenId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as MapToken;
}

// ── Escrita (GM) ──

export async function createToken(
  campaignId: string,
  token: NewToken,
): Promise<string> {
  const id = randomId();
  const { visible, ...rest } = token;
  await setDoc(
    tokenDoc(campaignId, id),
    withoutUndefined({
      ...rest,
      x: clampCoord(token.x),
      y: clampCoord(token.y),
      visible: visible ?? defaultVisibility(token.type),
      updatedAt: serverTimestamp(),
    }),
  );
  return id;
}

export async function toggleTokenVisibility(
  campaignId: string,
  tokenId: string,
  visible: boolean,
): Promise<void> {
  await updateDoc(tokenDoc(campaignId, tokenId), {
    visible,
    updatedAt: serverTimestamp(),
  });
}

export async function revealAllTokens(
  campaignId: string,
  tokens: MapToken[],
): Promise<void> {
  await Promise.all(
    tokens
      .filter((t) => !(t.visible ?? defaultVisibility(t.type)))
      .map((t) => toggleTokenVisibility(campaignId, t.id, true)),
  );
}

export async function removeTokenDoc(
  campaignId: string,
  tokenId: string,
): Promise<void> {
  await deleteDoc(tokenDoc(campaignId, tokenId));
}

// ── Movimento (GM ou dono) ──

/** Move um token (só x/y — respeita a rule de dono). */
export async function moveTokenTo(
  campaignId: string,
  tokenId: string,
  x: number,
  y: number,
): Promise<void> {
  await updateDoc(tokenDoc(campaignId, tokenId), {
    x: clampCoord(x),
    y: clampCoord(y),
    updatedAt: serverTimestamp(),
  });
}

// ── Migração V1 → V2 (one-shot) ──

/**
 * Copia tokens do array legado (`map/{id}.tokens`) para a subcoleção
 * e limpa o array. Roda uma vez por campanha; GM dispara ao abrir o mapa.
 * Retorna quantos tokens foram migrados.
 */
export async function migrateLegacyTokens(campaignId: string): Promise<number> {
  const mapSnap = await getDoc(doc(db, "map", campaignId));
  if (!mapSnap.exists()) return 0;
  const legacy = (mapSnap.data()?.tokens ?? []) as MapToken[];
  if (!Array.isArray(legacy) || legacy.length === 0) return 0;

  const existing = await getDocs(tokensCol(campaignId));
  const existingIds = new Set(existing.docs.map((d) => d.id));

  let migrated = 0;
  for (const t of legacy) {
    if (!t || existingIds.has(t.id)) continue;
    const { ...rest } = t;
    await setDoc(
      tokenDoc(campaignId, t.id || randomId()),
      withoutUndefined({
        ...rest,
        visible: t.visible ?? defaultVisibility(t.type),
        updatedAt: serverTimestamp(),
      }),
    );
    migrated++;
  }
  // Limpa o array legado para não migrar de novo.
  await setDoc(
    doc(db, "map", campaignId),
    { tokens: [], updatedAt: serverTimestamp() },
    { merge: true },
  );
  return migrated;
}

/** Atalho usado por CharacterPanel/InitiativeView ("pôr no mapa"). */
export async function placeTokenOnMap(
  campaignId: string,
  token: NewToken,
): Promise<string> {
  return createToken(campaignId, {
    ...token,
    x: token.x ?? 45 + Math.random() * 10,
    y: token.y ?? 40 + Math.random() * 10,
  });
}
