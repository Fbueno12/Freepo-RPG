"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeCharacters,
  saveCharacter,
  deleteCharacter,
  addItemToCharacter,
  removeItemFromCharacter,
  readWizardStateFromLocalStorage,
} from "@/lib/characters";
import { rollFormula } from "@/lib/dice";
import { sendChatMessage } from "@/lib/campaigns";
import { useSound } from "@/hooks/useSound";
import type { CharacterSheet } from "@/lib/types";

interface CharacterPanelProps {
  campaignId: string;
  isGM: boolean;
}

export function CharacterPanel({ campaignId, isGM }: CharacterPanelProps) {
  const { user } = useAuth();
  const [characters, setCharacters] = useState<CharacterSheet[]>([]);
  const [selected, setSelected] = useState<CharacterSheet | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribeCharacters(campaignId, setCharacters);
    return () => unsub();
  }, [campaignId]);

  const importWizard = async () => {
    if (!user?.uid) return;
    const wizardState = readWizardStateFromLocalStorage();
    if (!wizardState) {
      setNotice("Nenhum personagem no criador ainda. Abra o criador e gere um primeiro.");
      return;
    }
    const existing = characters.find(
      (c) => c.userId === user.uid && c.name === wizardState.nome,
    );
    if (existing) {
      setNotice(
        `"${wizardState.nome ?? "Personagem"}" já está na mesa. Deletando e recriando a partir do criador…`,
      );
    }
    await saveCharacter(campaignId, user.uid, wizardState);
    setNotice(
      existing
        ? `Ficha "${wizardState.nome}" atualizada do criador.`
        : `Ficha "${wizardState.nome ?? "Personagem"}" importada do criador!`,
    );
  };

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  return (
    <div className="h-full p-6 overflow-auto flex flex-col gap-4">
      <div>
        <h2 className="text-xl text-glow">Fichas dos personagens</h2>
        <p className="text-muted text-xs mt-1">
          Crie personagens no criador embutido e importe as fichas para a mesa.
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        <button className="btn btn-glow" onClick={() => setWizardOpen(!wizardOpen)}>
          {wizardOpen ? "✕ Fechar criador" : "◆ Abrir criador de personagem"}
        </button>
        <button className="btn" onClick={importWizard}>
          📥 Importar ficha criada na mesa
        </button>
        {wizardOpen && (
          <div className="mt-2 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[11px] text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-glow animate-pulse" />
              Criador aberto — monte o personagem e clique em exportar.
            </div>
            <iframe
              src="/wizard/runarcana-wizard.html"
              title="Criador de Personagem Runarcana"
              className="w-full h-[560px] border border-border-light rounded-xl bg-white"
            />
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
              <span>
                Ficha pronta? Clique abaixo para trazê-la para a mesa.
              </span>
              <button className="btn btn-sm btn-glow" onClick={importWizard}>
                📥 Importar ficha criada na mesa
              </button>
            </div>
          </div>
        )}
      </div>

      {notice && (
        <div className="p-3 text-xs rounded-lg border border-glow-dark/40 bg-glow/10 text-glow">
          {notice}
        </div>
      )}

      {characters.length === 0 ? (
        <div className="text-muted text-sm mt-2">
          Nenhuma ficha na mesa ainda.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {characters.map((character) => (
            <div
              key={character.id}
              className="flex items-center gap-3 bg-panel border border-border rounded-xl px-3.5 py-2.5"
            >
              <div className="w-9 h-9 rounded-full bg-panel3 border border-border-light flex items-center justify-center text-sm">
                🎹
              </div>
              <button
                className="flex-1 text-left min-w-0"
                onClick={() => setSelected(character)}
              >
                <div className="text-sm font-bold truncate">
                  {character.name}
                </div>
                <small className="text-muted text-[11px]">
                  {character.state.classe ?? ""}
                  {character.state.nivel ? ` · Nv ${character.state.nivel}` : ""}
                </small>
              </button>
              {character.userId === user?.uid && (
                <button
                  className="icon-btn !w-7 !h-7 text-sm"
                  title="Remover da mesa"
                  onClick={async () => {
                    await deleteCharacter(campaignId, character.id);
                    flash(`"${character.name}" removida.`);
                  }}
                >
                  🗑
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {selected && (
        <SheetModal
          campaignId={campaignId}
          character={selected}
          isGM={isGM}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function SheetModal({
  campaignId,
  character,
  isGM,
  onClose,
}: {
  campaignId: string;
  character: CharacterSheet;
  isGM: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { dice: soundDice } = useSound();
  const state = character.state;
  const atributos = state.atributos ?? {};
  const pericias = state.pericias ?? {};
  const nomes = [
    "força",
    "destreza",
    "constituição",
    "inteligência",
    "sabedoria",
    "carisma",
  ];
  const [newItem, setNewItem] = useState("");
  const canEditItems = !!user && (user.uid === character.userId || isGM);

  const modAtributo = (valor: number) => Math.floor((valor - 10) / 2);

  const rollSkill = async (label: string, mod: number) => {
    if (!user) return;
    const formula = `1d20${mod >= 0 ? "+" : ""}${mod}`;
    const result = rollFormula(formula);
    await sendChatMessage(campaignId, user.uid, character.name, `${label}: ${result.total}`, {
      formula,
      dice: result.dice,
      modifier: result.modifier,
      total: result.total,
      label: `${character.name} · ${label.toLowerCase()}`,
    });
    soundDice();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[rgba(10,8,5,.75)] backdrop-blur-[3px] flex items-start justify-center p-10 overflow-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[900px] bg-panel border border-border-light rounded-2xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4 px-[26px] py-[22px] bg-gradient-to-b from-panel3 to-panel2 border-b border-border">
          <div className="w-16 h-16 text-3xl overflow-hidden rounded-full border-2 border-accent-dark shadow-[0_0_14px_rgba(95,212,208,.2)] flex items-center justify-center bg-panel3">
            🎹
          </div>
          <div>
            <h2 className="text-glow text-[22px]">{character.name}</h2>
            <div className="text-muted text-xs mt-0.5">
              {[state.conceito, state.origem, state.regiao, state.classe]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
          <button className="icon-btn ml-auto" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="py-[22px] px-[26px] gap-6 max-h-[60vh] overflow-auto grid grid-cols-[1fr_1fr]">
          {Object.keys(atributos).length > 0 && (
            <div>
              <h3 className="text-xs text-accent tracking-wider mb-2">
                Atributos
              </h3>
              {nomes
                .filter((n) => atributos[n] !== undefined)
                .map((n) => {
                  const valor = Number(atributos[n]);
                  const mod = modAtributo(valor);
                  return (
                    <div
                      key={n}
                      className="flex items-center gap-2 py-[5px] border-b border-dashed border-border"
                    >
                      <span className="flex-1 text-xs text-muted capitalize">
                        {n}
                      </span>
                      <span className="text-sm font-bold text-glow">
                        {mod >= 0 ? `+${mod}` : mod}
                      </span>
                      <span className="w-11 text-center bg-panel3 border border-border-light rounded-md p-0.5 text-[13px] text-text">
                        {valor}
                      </span>
                      <button
                        className="icon-btn !w-7 !h-7 text-xs"
                        title={`Rolar ${n}`}
                        onClick={() => rollSkill(n, mod)}
                      >
                        🎲
                      </button>
                    </div>
                  );
                })}
            </div>
          )}
          {Object.keys(pericias).length > 0 && (
            <div>
              <h3 className="text-xs text-accent tracking-wider mb-2">
                Perícias
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(pericias)
                  .filter(([, v]) => v !== undefined && Number(v) !== 0)
                  .map(([pericia, valor]) => {
                    const mod = Number(valor);
                    return (
                      <span
                        key={pericia}
                        className="text-[11px] bg-panel3 border border-border-light rounded-lg px-2 py-1 text-text flex items-center gap-1.5"
                      >
                        {pericia}
                        <b className="text-glow">
                          {mod >= 0 ? `+${mod}` : mod}
                        </b>
                        <button
                          className="w-5 h-5 rounded-full hover:bg-bg text-[10px] text-muted hover:text-glow transition-colors"
                          title={`Rolar ${pericia}`}
                          onClick={() => rollSkill(pericia, mod)}
                        >
                          🎲
                        </button>
                      </span>
                    );
                  })}
              </div>
            </div>
          )}
          <div className={Object.keys(pericias).length > 0 ? "" : "col-span-2"}>
            {state.runas && Object.keys(state.runas).length > 0 && (
              <>
                <h3 className="text-xs text-accent tracking-wider mb-2">
                  Runas
                </h3>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {Object.keys(state.runas).map((runa) => (
                    <span
                      key={runa}
                      className="text-[11px] bg-panel3 border border-border-light rounded-lg px-2 py-0.5 text-text"
                    >
                      {runa}
                    </span>
                  ))}
                </div>
              </>
            )}
            <h3 className="text-xs text-accent tracking-wider mb-2">
              Equipamento
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {state.equip &&
                Object.values(state.equip)
                  .filter(Boolean)
                  .map((item, i) => (
                    <span
                      key={i}
                      className="text-[11px] bg-panel3 border border-border-light rounded-lg px-2 py-0.5 text-text"
                    >
                      {String(item)}
                    </span>
                  ))}
            </div>
          </div>
          <div className="col-span-2 border-t border-dashed border-border mt-4 pt-4">
            <h3 className="text-xs text-accent tracking-wider mb-2">
              Inventário
            </h3>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {(character.items ?? []).length === 0 && (
                <span className="text-muted text-xs">
                  Bolsa vazia{canEditItems ? " — adicione itens abaixo" : ""}.
                </span>
              )}
              {(character.items ?? []).map((item) => (
                <span
                  key={item}
                  className="text-[11px] bg-panel3 border border-border-light rounded-lg px-2 py-1 text-text flex items-center gap-1.5"
                >
                  {item}
                  {canEditItems && (
                    <button
                      className="text-muted hover:text-danger text-[10px]"
                      title="Remover item"
                      onClick={() =>
                        void removeItemFromCharacter(
                          campaignId,
                          character.id,
                          character.items ?? [],
                          item,
                        )
                      }
                    >
                      ✕
                    </button>
                  )}
                </span>
              ))}
            </div>
            {canEditItems && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newItem.trim()) {
                      void addItemToCharacter(
                        campaignId,
                        character.id,
                        character.items ?? [],
                        newItem,
                      );
                      setNewItem("");
                    }
                  }}
                  placeholder="Novo item (enter para adicionar)"
                  className="flex-1 px-3 py-2 rounded-lg bg-bg border border-border-light text-text text-sm focus:outline-none focus:border-glow-dark"
                />
                <button
                  className="btn"
                  disabled={!newItem.trim()}
                  onClick={() => {
                    void addItemToCharacter(
                      campaignId,
                      character.id,
                      character.items ?? [],
                      newItem,
                    );
                    setNewItem("");
                  }}
                >
                  Adicionar
                </button>
              </div>
            )}
            {canEditItems && (
              <p className="text-muted text-[10px] mt-1.5">
                Marcas no inventário ficam salvas na ficha e sincronizam com a
                mesa.
              </p>
            )}
          </div>
        </div>
        <div className="px-[26px] py-4 border-t border-border flex justify-end gap-2.5">
          {state.pulsoRunico && (
            <span className="text-xs text-muted self-center mr-auto">
              Pulso:{" "}
              <b className="text-gold-light">{String(state.pulsoRunico)}</b>
            </span>
          )}
          <button className="btn" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}