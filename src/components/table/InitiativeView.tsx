"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeCombat,
  setCombat,
  createCombat,
  endCombat,
  nextTurn,
  rollInitiativeForAll,
  addCombatants,
  removeCombatant,
} from "@/lib/combat";
import { getCampaignCharacters } from "@/lib/characters";
import {
  subscribeNpcs,
  addNpc,
  removeNpc,
  type CampaignNpc,
} from "@/lib/npcs";
import { addToken } from "@/lib/map";
import { playSignalSound } from "@/lib/sound";
import type { CombatState, Combatant } from "@/lib/types";

interface InitiativeViewProps {
  campaignId: string;
  isGM: boolean;
}

const NPC_ICONS = ["👹", "🐺", "🐗", "🕷️", "🧟", "🐉", "🏹", "🗡️"];

export function InitiativeView({ campaignId, isGM }: InitiativeViewProps) {
  const { user } = useAuth();
  const [combat, setCombatState] = useState<CombatState | null>(null);
  const [npcs, setNpcsLocal] = useState<CampaignNpc[]>([]);

  useEffect(() => {
    const unsub = subscribeCombat(campaignId, setCombatState);
    return () => unsub();
  }, [campaignId]);

  useEffect(() => {
    const unsub = subscribeNpcs(campaignId, setNpcsLocal);
    return () => unsub();
  }, [campaignId]);

  const startCombat = async () => {
    const characters = await getCampaignCharacters(campaignId);
    const pcCombatants: Combatant[] = characters.map((c) => ({
      id: c.id,
      name: c.name,
      icon: "🎹",
      type: "pc",
      value: 1 + Math.floor(Math.random() * 20),
    }));
    const combatants = rollInitiativeForAll(pcCombatants);
    if (!combat) {
      void createCombat(campaignId, combatants);
    } else {
      void setCombat(campaignId, {
        active: true,
        combatants,
        currentIndex: 0,
      });
    }
  };

  const rollInitiative = () => {
    if (!combat) return;
    void setCombat(campaignId, {
      combatants: rollInitiativeForAll(combat.combatants),
      currentIndex: 0,
    });
  };

  const handleNextTurn = () => {
    if (!combat) return;
    playSignalSound();
    nextTurn(campaignId, combat);
  };

  const npcToCombat = async (npc: CampaignNpc) => {
    const asCombatant: Combatant = {
      id: `npc_${crypto.randomUUID()}`,
      name: npc.name,
      icon: npc.icon || "👹",
      type: "npc",
      value: 1 + Math.floor(Math.random() * 20),
    };
    if (combat?.active) {
      await addCombatants(campaignId, combat, [asCombatant]);
    } else {
      await setCombat(campaignId, {
        active: true,
        currentIndex: 0,
        combatants: [asCombatant],
      });
    }
  };

  const npcToMap = async (npc: CampaignNpc) => {
    await addToken(campaignId, null, {
      icon: npc.icon || "👹",
      name: npc.name,
      type: "npc",
      x: 45 + Math.random() * 10,
      y: 40 + Math.random() * 10,
    });
  };

  return (
    <div className="h-full p-[26px] overflow-auto">
      <h2 className="text-xl text-glow mb-1.5">Ordem de iniciativa</h2>
      <div className="text-muted text-xs mb-[18px]">
        {isGM
          ? "Avance os turnos e a mesa acompanha em tempo real."
          : "Acompanhe a ordem de combate em tempo real."}
      </div>

      {!combat?.active ? (
        <div className="flex flex-col items-center gap-3 bg-panel border border-border rounded-xl p-6 text-center">
          <p className="text-muted text-sm">
            Nenhum combate em andamento nesta mesa.
          </p>
          {isGM && (
            <button className="btn btn-glow" onClick={startCombat}>
              ⚔️ Iniciar combate
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {combat.combatants.map((combatant, index) => (
              <div
                key={combatant.id}
                className={`flex items-center gap-3 bg-panel border rounded-[11px] px-3 py-2.5 ${
                  index === combat.currentIndex
                    ? "border-glow-dark shadow-[0_0_0_1px_var(--glow2)] bg-panel2"
                    : "border-border"
                }`}
              >
                <div className="w-[52px] text-center font-cinzel text-[18px] text-gold-light">
                  {combatant.value}
                </div>
                {index === combat.currentIndex ? (
                  <span className="text-[10px] font-extrabold text-glow bg-[rgba(95,212,208,.1)] border border-[rgba(95,212,208,.35)] px-2 py-0.5 rounded-full">
                    ATUAL
                  </span>
                ) : null}
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span>{combatant.icon}</span>
                    <span>{combatant.name}</span>
                  </div>
                  <small className="block text-muted text-[11px]">
                    {combatant.type === "pc" ? "Jogador" : "NPC · GM"}
                  </small>
                </div>
                {combatant.avatar ? (
                  <span className="w-[28px] h-[28px] rounded-full border border-border-light overflow-hidden">
                    <Image
                      src={combatant.avatar}
                      alt={combatant.name}
                      width={28}
                      height={28}
                      className="w-full h-full object-cover"
                    />
                  </span>
                ) : null}
                {isGM && combatant.type === "npc" && (
                  <button
                    className="icon-btn !w-6 !h-6 text-xs"
                    title="Remover do combate"
                    onClick={() => void removeCombatant(campaignId, combat, combatant.id)}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {isGM && (
            <div className="flex flex-col gap-2 mt-[18px]">
              <div className="flex gap-2.5">
                <button className="btn btn-glow flex-1" onClick={handleNextTurn}>
                  Próximo turno
                </button>
                <button
                  className="btn btn-ghost flex-1"
                  onClick={rollInitiative}
                >
                  Rolar iniciativa
                </button>
              </div>
              <div className="flex gap-2.5">
                <button
                  className="btn btn-ghost flex-1"
                  onClick={() => void endCombat(campaignId)}
                >
                  Encerrar combate
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {user?.uid && (
        <NpcRoster
          campaignId={campaignId}
          npcs={npcs}
          isGM={isGM}
          combatActive={combat?.active ?? false}
          onToCombat={npcToCombat}
          onToMap={npcToMap}
        />
      )}
    </div>
  );
}

function NpcRoster({
  campaignId,
  npcs,
  isGM,
  combatActive,
  onToCombat,
  onToMap,
}: {
  campaignId: string;
  npcs: CampaignNpc[];
  isGM: boolean;
  combatActive: boolean;
  onToCombat: (npc: CampaignNpc) => void;
  onToMap: (npc: CampaignNpc) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-5 pt-4 border-t border-border">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-xs text-accent tracking-wider">NPCs da campanha</h3>
        {isGM && (
          <button className="icon-btn !w-7 !h-7 text-xs" onClick={() => setOpen(true)}>
            ＋
          </button>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        {npcs.length === 0 && (
          <span className="text-muted text-xs">
            {isGM
              ? "Sem NPCs registrados. Crie os aliados/vilões da campanha."
              : "Ainda não há NPCs registrados."}
          </span>
        )}
        {npcs.map((npc) => (
          <div
            key={npc.id}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-panel border border-border"
          >
            <span className="text-lg">{npc.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{npc.name}</div>
              {(npc.hp || npc.notes) && (
                <small className="text-muted text-[10px] block truncate">
                  {npc.hp ? `PV ${npc.hp}` : ""}
                  {npc.hp && npc.notes ? " · " : ""}
                  {npc.notes}
                </small>
              )}
            </div>
            {isGM ? (
              <div className="flex gap-1">
                <button
                  className="icon-btn !w-7 !h-7 text-xs"
                  title={combatActive ? "Adicionar ao combate" : "Iniciar combate com este NPC"}
                  onClick={() => void onToCombat(npc)}
                >
                  ⚔️
                </button>
                <button
                  className="icon-btn !w-7 !h-7 text-xs"
                  title="Colocar no mapa"
                  onClick={() => void onToMap(npc)}
                >
                  🗺
                </button>
                <button
                  className="icon-btn !w-7 !h-7 text-xs"
                  title="Remover NPC"
                  onClick={() => void removeNpc(campaignId, npcs, npc.id)}
                >
                  ✕
                </button>
              </div>
            ) : (
              <span className="text-[10px] text-muted">NPC</span>
            )}
          </div>
        ))}
      </div>

      {open && (
        <AddNpcModal
          onAdd={async (npc) => {
            await addNpc(campaignId, npcs, npc);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function AddNpcModal({
  onAdd,
  onClose,
}: {
  onAdd: (npc: Omit<CampaignNpc, "id">) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("👹");
  const [hp, setHp] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onAdd({
        name: name.trim(),
        icon: icon || "👹",
        hp: hp.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[rgba(10,8,5,.75)] backdrop-blur-[3px] flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-panel border border-border-light rounded-2xl p-5 shadow-[0_30px_80px_rgba(0,0,0,.6)] flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-text">Novo NPC</h3>
          <button className="text-muted hover:text-text text-sm" onClick={onClose}>
            ✕
          </button>
        </div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do NPC"
          className="px-2.5 py-1.5 rounded-md bg-bg border border-border-light text-text text-sm focus:outline-none focus:border-glow-dark"
          autoFocus
        />
        <div className="flex gap-1.5">
          {NPC_ICONS.map((i) => (
            <button
              key={i}
              onClick={() => setIcon(i)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                icon === i ? "border-glow-dark bg-panel3" : "border-border bg-bg"
              }`}
            >
              {i}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={hp}
            onChange={(e) => setHp(e.target.value)}
            placeholder="PV (ex.: 34/34)"
            className="px-2.5 py-1.5 rounded-md bg-bg border border-border-light text-text text-sm focus:outline-none focus:border-glow-dark"
          />
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Nota rápida"
            className="px-2.5 py-1.5 rounded-md bg-bg border border-border-light text-text text-sm focus:outline-none focus:border-glow-dark"
          />
        </div>
        <div className="flex gap-2.5">
          <button className="btn flex-1" onClick={save} disabled={!name.trim() || saving}>
            {saving ? "Salvando…" : "Salvar NPC"}
          </button>
          <button className="btn btn-ghost flex-1" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}