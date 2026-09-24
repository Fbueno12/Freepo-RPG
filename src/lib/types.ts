import { Timestamp } from "firebase/firestore";

export interface Campaign {
  id: string;
  name: string;
  system: string;
  level: number;
  ownerId: string;
  createdAt: Timestamp;
}

export interface CampaignMember {
  id: string;
  campaignId: string;
  userId: string;
  role: "gm" | "pc";
  joinedAt: Timestamp;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  diceRoll?: DiceRoll;
  createdAt: Timestamp;
}

export interface DiceRoll {
  formula: string;
  dice: number[];
  modifier: number;
  total: number;
  label?: string;
}

export interface CampaignNotes {
  id: string;
  content: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

export interface Macro {
  id: string;
  name: string;
  formula: string;
  description?: string;
  createdAt: Timestamp;
}

export interface SecretMessage {
  message: string;
  priority: "normal" | "urgent";
  createdAt: Timestamp;
  read: boolean;
}

export interface CharacterSheet {
  id: string;
  campaignId: string;
  userId: string;
  name: string;
  type: "pc" | "npc";
  createdAt: Timestamp;
  updatedAt: Timestamp;
  state: WizardState;
  items?: string[];
  macros?: Macro[];
  notes?: string;
  secretMessage?: SecretMessage;
}

export interface Combatant {
  id: string;
  name: string;
  icon: string;
  type: "pc" | "npc";
  value: number;
  avatar?: string;
}

export interface CombatState {
  active: boolean;
  currentIndex: number;
  combatants: Combatant[];
  updatedAt: Timestamp;
}

export interface MapToken {
  id: string;
  icon: string;
  name: string;
  x: number;
  y: number;
  type: "pc" | "npc" | "gm";
  // ── Tokens V2 ──
  /** visível para jogadores? NPC nasce false, PC nasce true. */
  visible?: boolean;
  /** downloadURL (Storage) ou URL externa; sem valor = emoji `icon`. */
  imageUrl?: string;
  /** uid do dono — único jogador (além do GM) que pode mover. */
  ownerId?: string;
  /** vínculo com ficha (characters) ou roster (npcs). */
  characterId?: string;
  /** tamanho em células (futuro grid-snap). */
  size?: number;
}

export interface MapState {
  backgroundImage: string;
  /** legado V1 (array no doc). V2 usa a subcoleção `map/{id}/tokens`. */
  tokens?: MapToken[];
  updatedAt: Timestamp;
}

export interface MusicTrack {
  id: string;
  title: string;
  meta: string;
  videoId: string;
}

export interface MusicState {
  controlledBy: string;
  currentTrackId: string;
  playing: boolean;
  seekTo: number;
  startedAt: number;
  tracks: MusicTrack[];
  updatedAt: Timestamp;
}

export interface WizardState {
  nome?: string;
  conceito?: string;
  historia?: string;
  origem?: string;
  regiao?: string;
  classe?: string;
  subclasse?: string;
  herancas?: string[];
  passado?: string;
  atributos?: Record<string, number>;
  pericias?: Record<string, number>;
  salvaguardas?: Record<string, number>;
  pulsoRunico?: string;
  runas?: Record<string, unknown>;
  equip?: Record<string, unknown>;
  magias?: unknown[];
  detalhes?: Record<string, unknown>;
  notas?: string;
  [key: string]: unknown;
}