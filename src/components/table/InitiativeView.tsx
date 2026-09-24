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
import { placeTokenOnMap } from "@/lib/tokens";
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
    await placeTokenOnMap(campaignId, {
      icon: npc.icon || "👹",
      name: npc.name,
      type: "npc",
      // NPC nasce escondido até o mestre revelar.
      visible: false,
      characterId: npc.id,
      x: 45 + Math.random() * 10,
      y: 40 + Math.random() * 10,
    });
  };

  return (
    <div className="init-view">
      <h2 className="init-title">Ordem de iniciativa</h2>
      <div className="init-sub">
        {isGM
          ? "Avance os turnos e a mesa acompanha em tempo real."
          : "Acompanhe a ordem de combate em tempo real."}
      </div>

      {!combat?.active ? (
        <div className="init-empty">
          <p>Nenhum combate em andamento nesta mesa.</p>
          {isGM && (
            <button className="btn btn-glow" onClick={startCombat}>
              ⚔️ Iniciar combate
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="init-list">
            {combat.combatants.map((combatant, index) => (
              <div
                key={combatant.id}
                className={index === combat.currentIndex ? "init-row current" : "init-row"}
              >
                <div className="val">{combatant.value}</div>
                {index === combat.currentIndex ? (
                  <span className="init-now">ATUAL</span>
                ) : null}
                <div className="nm">
                  <div className="row">
                    <span>{combatant.icon}</span>
                    <span>{combatant.name}</span>
                  </div>
                  <small>
                    {combatant.type === "pc" ? "Jogador" : "NPC · GM"}
                  </small>
                </div>
                {combatant.avatar ? (
                  <span className="init-ava">
                    <Image
                      src={combatant.avatar}
                      alt={combatant.name}
                      width={28}
                      height={28}
                    />
                  </span>
                ) : null}
                {isGM && combatant.type === "npc" && (
                  <button
                    className="icon-btn sm"
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
            <div className="init-actions">
              <div className="row">
                <button className="btn btn-glow" onClick={handleNextTurn}>
                  Próximo turno
                </button>
                <button className="btn btn-ghost" onClick={rollInitiative}>
                  Rolar iniciativa
                </button>
              </div>
              <div className="row">
                <button
                  className="btn btn-ghost"
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
    <div className="npc-section">
      <div className="npc-head">
        <h3>NPCs da campanha</h3>
        {isGM && (
          <button className="icon-btn sm" onClick={() => setOpen(true)}>
            ＋
          </button>
        )}
      </div>
      <div className="npc-list">
        {npcs.length === 0 && (
          <span className="npc-tag">
            {isGM
              ? "Sem NPCs registrados. Crie os aliados/vilões da campanha."
              : "Ainda não há NPCs registrados."}
          </span>
        )}
        {npcs.map((npc) => (
          <div key={npc.id} className="npc-item">
            <span className="npc-ico">{npc.icon}</span>
            <div className="npc-info">
              <div className="npc-name">{npc.name}</div>
              {(npc.hp || npc.notes) && (
                <small className="npc-sub">
                  {npc.hp ? `PV ${npc.hp}` : ""}
                  {npc.hp && npc.notes ? " · " : ""}
                  {npc.notes}
                </small>
              )}
            </div>
            {isGM ? (
              <div className="npc-actions">
                <button
                  className="icon-btn sm"
                  title={combatActive ? "Adicionar ao combate" : "Iniciar combate com este NPC"}
                  onClick={() => void onToCombat(npc)}
                >
                  ⚔️
                </button>
                <button
                  className="icon-btn sm"
                  title="Colocar no mapa"
                  onClick={() => void onToMap(npc)}
                >
                  🗺
                </button>
                <button
                  className="icon-btn sm"
                  title="Remover NPC"
                  onClick={() => void removeNpc(campaignId, npcs, npc.id)}
                >
                  ✕
                </button>
              </div>
            ) : (
              <span className="npc-tag">NPC</span>
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
    <div className="modal" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="pop-head">
          <h3 className="pop-title">Novo NPC</h3>
          <button className="pop-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="field">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do NPC"
            autoFocus
          />
        </div>
        <div className="icon-grid">
          {NPC_ICONS.map((i) => (
            <button
              key={i}
              onClick={() => setIcon(i)}
              className={icon === i ? "icon-cell on" : "icon-cell"}
            >
              {i}
            </button>
          ))}
        </div>
        <div className="row">
          <input
            type="text"
            value={hp}
            onChange={(e) => setHp(e.target.value)}
            placeholder="PV (ex.: 34/34)"
            className="input grow"
          />
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Nota rápida"
            className="input grow"
          />
        </div>
        <div className="dialog-actions">
          <button
            className="btn"
            onClick={save}
            disabled={!name.trim() || saving}
          >
            {saving ? "Salvando…" : "Salvar NPC"}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}