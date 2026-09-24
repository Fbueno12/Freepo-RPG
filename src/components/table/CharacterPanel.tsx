"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeCharacters,
  saveCharacter,
  saveNpc,
  readWizardStateFromLocalStorage,
  deleteCharacter,
  addItemToCharacter,
  removeItemFromCharacter,
  addMacro,
  removeMacro,
  updateNotes,
  setSecretMessage,
  markSecretMessageRead,
} from "@/lib/characters";
import { placeTokenOnMap } from "@/lib/tokens";
import { addCombatants } from "@/lib/combat";
import { rollFormula } from "@/lib/dice";
import { sendChatMessage } from "@/lib/campaigns";
import { useSound } from "@/hooks/useSound";
import { PdfImport } from "@/components/ui/PdfImport";
import type { CharacterSheet, Macro, WizardState } from "@/lib/types";

interface CharacterPanelProps {
  campaignId: string;
  isGM: boolean;
}

export function CharacterPanel({ campaignId, isGM }: CharacterPanelProps) {
  const { user } = useAuth();
  const [characters, setCharacters] = useState<CharacterSheet[]>([]);
  const [selected, setSelected] = useState<CharacterSheet | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pdfImportOpen, setPdfImportOpen] = useState(false);
  const [npcFormOpen, setNpcFormOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribeCharacters(campaignId, setCharacters);
    return () => unsub();
  }, [campaignId]);

  const pcCharacters = characters
    .filter((c) => c.type === "pc")
    .sort((a, b) => a.name.localeCompare(b.name));

  const npcCharacters = characters
    .filter((c) => c.type === "npc")
    .sort((a, b) => a.name.localeCompare(b.name));

  const myPcs = pcCharacters.filter((c) => c.userId === user?.uid);
  const otherPcs = pcCharacters.filter((c) => c.userId !== user?.uid);

  const handlePdfImport = async (state: WizardState) => {
    if (!user?.uid) return;
    const existing = characters.find(
      (c) => c.userId === user.uid && c.name === state.nome,
    );
    if (existing) {
      await saveCharacter(campaignId, user.uid, state);
      flash(`Ficha "${state.nome}" atualizada!`);
    } else {
      await saveCharacter(campaignId, user.uid, state);
      flash(`Ficha "${state.nome ?? "Personagem"}" importada!`);
    }
    setPdfImportOpen(false);
  };

  const handleWizardDraft = async () => {
    const draft = readWizardStateFromLocalStorage();
    if (!draft) {
      flash("Nenhum rascunho do wizard — crie sua ficha primeiro.");
      return;
    }
    await handlePdfImport(draft);
  };

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const canDelete = (c: CharacterSheet) => {
    if (isGM) return true;
    return c.userId === user?.uid;
  };

  const renderCharacterCard = (character: CharacterSheet) => (
    <div key={character.id} className="card row">
      <div className="ava">{character.type === "npc" ? "👹" : "🎹"}</div>
      <button className="grow text-left" onClick={() => setSelected(character)}>
        <div className="text-text" style={{ fontSize: 14, fontWeight: 700 }}>
          {character.name}
          {character.secretMessage && !character.secretMessage.read && (
            <span className="unread-dot" />
          )}
        </div>
        <small className="text-muted text-xs">
          {character.state.classe ?? ""}
          {character.state.nivel ? ` · Nv ${character.state.nivel}` : ""}
          {character.type === "pc" && isGM && character.userId && (
            <span> · Jogador</span>
          )}
        </small>
      </button>
      {canDelete(character) && (
        <button
          className="icon-btn sm"
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
  );

  return (
    <div className="init-view">
      <div className="col">
        <div>
          <h2 className="init-title">Fichas dos personagens</h2>
          <p className="init-sub">
            Crie sua ficha no wizard e traga para a mesa, importe um PDF
            ou — se for o mestre — crie NPCs diretamente.
          </p>
        </div>

        <div className="col">
          <div className="row wrap">
            <a
              className="btn btn-glow"
              href="/wizard"
              target="_blank"
              rel="noreferrer"
              title="Abre o criador de personagem em nova aba"
            >
              ✨ Criar ficha
            </a>
            <button className="btn" onClick={handleWizardDraft}>
              ⬇ Trazer ficha do wizard
            </button>
            <button className="btn btn-ghost" onClick={() => setPdfImportOpen(!pdfImportOpen)}>
              {pdfImportOpen ? "✕ Fechar" : "📄 Importar ficha PDF"}
            </button>
            {isGM && (
              <button className="btn" onClick={() => setNpcFormOpen(!npcFormOpen)}>
                {npcFormOpen ? "✕ Fechar" : "＋ Criar NPC"}
              </button>
            )}
          </div>

          {pdfImportOpen && (
            <PdfImport
              onImport={handlePdfImport}
              onCancel={() => setPdfImportOpen(false)}
            />
          )}

          {npcFormOpen && isGM && (
            <NpcCreateForm
              campaignId={campaignId}
              onCreated={() => {
                setNpcFormOpen(false);
                flash("NPC criado!");
              }}
              onCancel={() => setNpcFormOpen(false)}
            />
          )}
        </div>

        {notice && <div className="alert alert-info">{notice}</div>}

        {characters.length === 0 ? (
          <div className="text-muted" style={{ fontSize: 14, marginTop: 8 }}>
            Nenhuma ficha na mesa ainda.
          </div>
        ) : (
          <div className="col">
            {!isGM && myPcs.length > 0 && (
              <>
                <h3 className="sheet-section-title">Suas fichas</h3>
                {myPcs.map(renderCharacterCard)}
              </>
            )}

            {isGM && pcCharacters.length > 0 && (
              <>
                <h3 className="sheet-section-title">Fichas de jogadores</h3>
                {pcCharacters.map(renderCharacterCard)}
              </>
            )}

            {isGM && npcCharacters.length > 0 && (
              <>
                <h3 className="sheet-section-title">Fichas de NPCs</h3>
                {npcCharacters.map(renderCharacterCard)}
              </>
            )}

            {!isGM && otherPcs.length > 0 && (
              <>
                <h3 className="sheet-section-title">Outros jogadores</h3>
                {otherPcs.map((c) => (
                  <div key={c.id} className="card row">
                    <div className="ava">🎹</div>
                    <div className="grow text-left">
                      <div className="text-text" style={{ fontSize: 14, fontWeight: 700 }}>
                        {c.name}
                      </div>
                      <small className="text-muted text-xs">
                        {c.state.classe ?? ""}
                        {c.state.nivel ? ` · Nv ${c.state.nivel}` : ""}
                      </small>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

          {selected && (
            <SheetModal
              key={`${selected.id}-${selected.updatedAt}`}
              campaignId={campaignId}
              character={selected}
              isGM={isGM}
              onClose={() => setSelected(null)}
            />
          )}
      </div>
    </div>
  );
}

function NpcCreateForm({
  campaignId,
  onCreated,
  onCancel,
}: {
  campaignId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [classe, setClasse] = useState("");
  const [nivel, setNivel] = useState("");
  const [hp, setHp] = useState("");
  const [notes, setNotes] = useState("");
  const [atributos, setAtributos] = useState<Record<string, string>>({
    força: "10",
    destreza: "10",
    constituição: "10",
    inteligência: "10",
    sabedoria: "10",
    carisma: "10",
  });

  const handleSave = async () => {
    if (!name.trim()) return;
    const state: Record<string, unknown> = {
      nome: name.trim(),
      classe: classe.trim() || undefined,
      nivel: nivel ? Number(nivel) : undefined,
      atributos: Object.fromEntries(
        Object.entries(atributos).map(([k, v]) => [k, Number(v) || 10]),
      ),
      notas: notes.trim() || undefined,
    };
    if (hp.trim()) {
      (state as Record<string, unknown>).detalhes = { hp: hp.trim() };
    }
    await saveNpc(campaignId, name, state as Parameters<typeof saveNpc>[2]);
    onCreated();
  };

  const nomes = ["força", "destreza", "constituição", "inteligência", "sabedoria", "carisma"];

  return (
    <div className="npc-form card">
      <h3 className="col-title">Criar NPC</h3>
      <div className="field">
        <label>Nome</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do NPC"
          className="input"
          autoFocus
        />
      </div>
      <div className="row wrap">
        <div className="field" style={{ flex: 1, minWidth: 120 }}>
          <label>Classe</label>
          <input
            type="text"
            value={classe}
            onChange={(e) => setClasse(e.target.value)}
            placeholder="Guerreiro"
            className="input"
          />
        </div>
        <div className="field" style={{ width: 80 }}>
          <label>Nv.</label>
          <input
            type="number"
            value={nivel}
            onChange={(e) => setNivel(e.target.value)}
            placeholder="1"
            className="input"
            min={1}
            max={30}
          />
        </div>
        <div className="field" style={{ width: 80 }}>
          <label>HP</label>
          <input
            type="text"
            value={hp}
            onChange={(e) => setHp(e.target.value)}
            placeholder="20"
            className="input"
          />
        </div>
      </div>
      <div className="npc-attrs">
        {nomes.map((n) => (
          <div key={n} className="field" style={{ width: 80 }}>
            <label>{n.slice(0, 3)}</label>
            <input
              type="number"
              value={atributos[n] ?? "10"}
              onChange={(e) => setAtributos({ ...atributos, [n]: e.target.value })}
              className="input"
              min={1}
              max={30}
            />
          </div>
        ))}
      </div>
      <div className="field">
        <label>Notas</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Descrição, história, motivações..."
          className="input"
          rows={3}
        />
      </div>
      <div className="row">
        <button className="btn btn-glow" disabled={!name.trim()} onClick={handleSave}>
          Criar NPC
        </button>
        <button className="btn btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
      </div>
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
  const [macros] = useState<Macro[]>(character.macros ?? []);
  const [notes, setNotes] = useState(character.notes ?? "");
  const [macroFormOpen, setMacroFormOpen] = useState(false);
  const [macroName, setMacroName] = useState("");
  const [macroFormula, setMacroFormula] = useState("");
  const [macroDesc, setMacroDesc] = useState("");
  const [secretMsgOpen, setSecretMsgOpen] = useState(false);
  const [secretMsg, setSecretMsg] = useState("");
  const [secretPriority, setSecretPriority] = useState<"normal" | "urgent">("normal");
  const notesTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const canEdit = !!user && (user.uid === character.userId || isGM);
  const canEditItems = canEdit;

  const sheetExtra = (k: string): string | number | undefined => {
    const v = state[k];
    return typeof v === "string" || typeof v === "number" ? v : undefined;
  };
  const sheetStats: { label: string; value: string | number }[] = [
    { label: "PV", value: sheetExtra("pvMaximo") },
    { label: "CA", value: sheetExtra("classeArmadura") },
    { label: "Iniciativa", value: sheetExtra("iniciativa") },
    { label: "Desloc.", value: sheetExtra("deslocamento") },
    { label: "Mana", value: sheetExtra("mana") },
  ].filter((s): s is { label: string; value: string | number } => s.value !== undefined);
  const sheetCombat = Array.isArray(state.combate)
    ? (state.combate as { arma?: unknown; bonus?: unknown; dano?: unknown }[])
    : [];

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

  const rollMacro = async (macro: Macro) => {
    if (!user) return;
    const result = rollFormula(macro.formula);
    await sendChatMessage(
      campaignId,
      user.uid,
      character.name,
      `[Ficha: ${character.name}] ${macro.name} → ${result.total}`,
      {
        formula: macro.formula,
        dice: result.dice,
        modifier: result.modifier,
        total: result.total,
        label: `${character.name} · ${macro.name.toLowerCase()}`,
      },
    );
    soundDice();
  };

  const handleAddMacro = async () => {
    if (!macroName.trim() || !macroFormula.trim()) return;
    const newMacro = {
      name: macroName.trim(),
      formula: macroFormula.trim(),
      description: macroDesc.trim() || undefined,
    };
    await addMacro(campaignId, character.id, macros, newMacro);
    setMacroName("");
    setMacroFormula("");
    setMacroDesc("");
    setMacroFormOpen(false);
  };

  const handleRemoveMacro = async (macroId: string) => {
    await removeMacro(campaignId, character.id, macros, macroId);
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(() => {
      void updateNotes(campaignId, character.id, value);
    }, 800);
  };

  const handleSecretMessage = async () => {
    if (!secretMsg.trim()) return;
    await setSecretMessage(campaignId, character.id, secretMsg.trim(), secretPriority);
    setSecretMsg("");
    setSecretMsgOpen(false);
  };

  const handleMarkRead = async () => {
    await markSecretMessageRead(campaignId, character.id);
  };

  const handleAddToCombat = async () => {
    const initiative = rollFormula("1d20");
    const combatant = {
      id: character.id,
      name: character.name,
      icon: "👹",
      type: "npc" as const,
      value: initiative.total,
    };
    await addCombatants(campaignId, { active: true, currentIndex: 0, combatants: [], updatedAt: null } as never, [combatant]);
  };

  const handlePlaceOnMap = async () => {
    const isNpc = character.type === "npc";
    await placeTokenOnMap(campaignId, {
      icon: isNpc ? "👹" : "🎹",
      name: character.name,
      x: 20 + Math.random() * 60,
      y: 20 + Math.random() * 60,
      type: isNpc ? "npc" : "pc",
      // NPC nasce escondido; ficha de jogador já vincula o dono.
      visible: !isNpc,
      ownerId: isNpc ? undefined : character.userId || undefined,
      characterId: character.id,
    });
  };

  return (
    <div className="modal modal-scroll" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        {character.type === "pc" && character.secretMessage && !character.secretMessage.read && user?.uid === character.userId && (
          <div className={`secret-message ${character.secretMessage.priority === "urgent" ? "secret-message--urgent" : ""}`}>
            <div className="secret-message-head">
              <span>📜 Comunicado do Mestre</span>
              {character.secretMessage.priority === "urgent" && <span className="text-danger">URGENTE</span>}
            </div>
            <p>{character.secretMessage.message}</p>
            <button className="btn btn-sm" onClick={handleMarkRead}>
              Marcar como lido
            </button>
          </div>
        )}

        {character.type === "pc" && character.secretMessage && character.secretMessage.read && isGM && (
          <div className="secret-message secret-message--read">
            <div className="secret-message-head">
              <span>📜 Comunicado enviado</span>
              <span className="text-muted text-xs">lido pelo jogador</span>
            </div>
            <p>{character.secretMessage.message}</p>
          </div>
        )}

        <div className="sheet-head">
          <div className="sheet-ava">{character.type === "npc" ? "👹" : "🎹"}</div>
          <div>
            <h2 className="sheet-title">{character.name}</h2>
            <div className="sheet-sub">
              {[state.conceito, state.origem, state.regiao, state.classe]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
          <button className="icon-btn sheet-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {isGM && character.type === "pc" && (
          <div className="sheet-actions">
            <button className="btn btn-sm" onClick={() => setSecretMsgOpen(!secretMsgOpen)}>
              📜 Comunicado secreto
            </button>
          </div>
        )}

        {secretMsgOpen && isGM && character.type === "pc" && (
          <div className="secret-msg-form card">
            <div className="field">
              <label>Mensagem</label>
              <textarea
                value={secretMsg}
                onChange={(e) => setSecretMsg(e.target.value)}
                placeholder="Escreva uma mensagem secreta para o jogador..."
                className="input"
                rows={3}
                autoFocus
              />
            </div>
            <div className="row">
              <label className="row" style={{ gap: 6 }}>
                <input
                  type="radio"
                  name="priority"
                  checked={secretPriority === "normal"}
                  onChange={() => setSecretPriority("normal")}
                />
                Normal
              </label>
              <label className="row" style={{ gap: 6 }}>
                <input
                  type="radio"
                  name="priority"
                  checked={secretPriority === "urgent"}
                  onChange={() => setSecretPriority("urgent")}
                />
                Urgente
              </label>
            </div>
            <div className="row">
              <button className="btn btn-glow btn-sm" disabled={!secretMsg.trim()} onClick={handleSecretMessage}>
                Enviar
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setSecretMsgOpen(false)}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="sheet-body">
          {sheetStats.length > 0 && (
            <div className="sheet-col-wide">
              <div className="chip-row">
                {sheetStats.map((s) => (
                  <span key={s.label} className="chip">
                    {s.label} <b>{typeof s.value === "number" && s.label === "Iniciativa" && s.value >= 0 ? `+${s.value}` : s.value}</b>
                  </span>
                ))}
              </div>
            </div>
          )}
          {(typeof state.essencia === "string" || typeof state.personalidade === "string") && (
            <div className="sheet-col-wide text-muted text-sm">
              {typeof state.essencia === "string" && (
                <span><b>Essência:</b> {state.essencia}</span>
              )}
              {typeof state.essencia === "string" && typeof state.personalidade === "string" && " · "}
              {typeof state.personalidade === "string" && (
                <span><b>Personalidade:</b> {state.personalidade}</span>
              )}
            </div>
          )}
          {Object.keys(atributos).length > 0 && (
            <div>
              <h3 className="col-title">Atributos</h3>
              {nomes
                .filter((n) => atributos[n] !== undefined)
                .map((n) => {
                  const valor = Number(atributos[n]);
                  const mod = modAtributo(valor);
                  return (
                    <div key={n} className="attr-row">
                      <span className="attr-name">{n}</span>
                      <span className="attr-mod">{mod >= 0 ? `+${mod}` : mod}</span>
                      <span className="attr-val">{valor}</span>
                      <button
                        className="icon-btn sm"
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
              <h3 className="col-title">Perícias</h3>
              <div className="chip-row">
                {Object.entries(pericias)
                  .filter(([, v]) => v !== undefined && Number(v) !== 0)
                  .map(([pericia, valor]) => {
                    const mod = Number(valor);
                    return (
                      <span key={pericia} className="chip">
                        {pericia}
                        <b>{mod >= 0 ? `+${mod}` : mod}</b>
                        <button
                          className="chip-roll"
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

          {sheetCombat.length > 0 && (
            <div className="sheet-col-wide">
              <h3 className="col-title">Combate</h3>
              {sheetCombat.map((w, i) => (
                <div key={i} className="macro-item">
                  <div className="grow">
                    <div className="text-text" style={{ fontWeight: 600 }}>{String(w.arma ?? "—")}</div>
                    <small className="text-muted text-xs">
                      {String(w.bonus ?? "")} · {String(w.dano ?? "")}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className={Object.keys(pericias).length > 0 ? "" : "sheet-col-wide"}>
            {state.runas && Object.keys(state.runas).length > 0 && (
              <>
                <h3 className="col-title">Runas</h3>
                <div className="chip-row" style={{ marginBottom: 16 }}>
                  {Object.keys(state.runas).map((runa) => (
                    <span key={runa} className="chip">{runa}</span>
                  ))}
                </div>
              </>
            )}
            <h3 className="col-title">Equipamento</h3>
            <div className="chip-row">
              {state.equip &&
                Object.values(state.equip)
                  .filter(Boolean)
                  .map((item, i) => (
                    <span key={i} className="chip">{String(item)}</span>
                  ))}
            </div>
          </div>

          <div className="inv-section">
            <h3 className="col-title">Inventário</h3>
            <div className="chip-row">
              {(character.items ?? []).length === 0 && (
                <span className="text-muted text-sm">
                  Bolsa vazia{canEditItems ? " — adicione itens abaixo" : ""}.
                </span>
              )}
              {(character.items ?? []).map((item) => (
                <span key={item} className="chip">
                  {item}
                  {canEditItems && (
                    <button
                      className="chip-remove"
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
              <div className="inv-add">
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
                  className="input"
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
          </div>

          <div className="macro-section">
            <div className="row between" style={{ alignItems: "center" }}>
              <h3 className="col-title" style={{ margin: 0 }}>Macros</h3>
              {canEdit && (
                <button className="btn btn-sm" onClick={() => setMacroFormOpen(!macroFormOpen)}>
                  {macroFormOpen ? "✕" : "＋ Criar macro"}
                </button>
              )}
            </div>

            {macroFormOpen && canEdit && (
              <div className="macro-form card">
                <div className="field">
                  <label>Nome</label>
                  <input
                    type="text"
                    value={macroName}
                    onChange={(e) => setMacroName(e.target.value)}
                    placeholder="Ataque com Adaga"
                    className="input"
                    autoFocus
                  />
                </div>
                <div className="field">
                  <label>Fórmula</label>
                  <input
                    type="text"
                    value={macroFormula}
                    onChange={(e) => setMacroFormula(e.target.value)}
                    placeholder="1d4+2"
                    className="input"
                  />
                </div>
                <div className="field">
                  <label>Descrição (opcional)</label>
                  <input
                    type="text"
                    value={macroDesc}
                    onChange={(e) => setMacroDesc(e.target.value)}
                    placeholder="Dano cortante"
                    className="input"
                  />
                </div>
                <div className="row">
                  <button
                    className="btn btn-glow btn-sm"
                    disabled={!macroName.trim() || !macroFormula.trim()}
                    onClick={handleAddMacro}
                  >
                    Salvar
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setMacroFormOpen(false)}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {macros.length === 0 && (
              <span className="text-muted text-sm">Nenhuma macro criada.</span>
            )}
            {macros.map((macro) => (
              <div key={macro.id} className="macro-item">
                <div className="grow">
                  <div className="text-text" style={{ fontWeight: 600 }}>{macro.name}</div>
                  <small className="text-muted text-xs">{macro.formula}</small>
                  {macro.description && (
                    <small className="text-muted text-xs" style={{ display: "block" }}>
                      {macro.description}
                    </small>
                  )}
                </div>
                <button
                  className="icon-btn sm"
                  title="Rolar"
                  onClick={() => rollMacro(macro)}
                >
                  ▶
                </button>
                {canEdit && (
                  <button
                    className="icon-btn sm"
                    title="Remover macro"
                    onClick={() => handleRemoveMacro(macro.id)}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="inv-section">
            <h3 className="col-title">Anotações</h3>
            {canEdit ? (
              <textarea
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Suas anotações pessoais..."
                className="input sheet-notes"
                rows={4}
              />
            ) : (
              <p className="text-muted text-sm">
                {notes || "Sem anotações."}
              </p>
            )}
          </div>

          {isGM && character.type === "npc" && (
            <div className="sheet-actions">
              <button className="btn btn-sm" onClick={handleAddToCombat}>
                ⚔️ Adicionar ao combate
              </button>
              <button className="btn btn-sm" onClick={handlePlaceOnMap}>
                📍 Posicionar no mapa
              </button>
            </div>
          )}
        </div>

        <div className="sheet-foot">
          {state.pulsoRunico && (
            <span className="sheet-pulso">
              Pulso: <b>{String(state.pulsoRunico)}</b>
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
