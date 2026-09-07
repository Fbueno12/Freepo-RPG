"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { sendChatMessage } from "@/lib/campaigns";
import { rollFormula } from "@/lib/dice";
import { useSound } from "@/hooks/useSound";
import type { DiceRoll } from "@/lib/types";

const DICE = [
  "d4",
  "d6",
  "d8",
  "d10",
  "d12",
  "d20",
] as const;

const PRESETS: { label: string; expr: string }[] = [
  { label: "d20", expr: "1d20" },
  { label: "Vantagem", expr: "2d20" },
  { label: "Investida", expr: "2d6+3" },
  { label: "Fogo rúnico", expr: "3d6" },
  { label: "Adaga", expr: "1d4+2" },
  { label: "Arco", expr: "1d8+4" },
];

interface DiceViewProps {
  campaignId: string;
}

export function DiceView({ campaignId }: DiceViewProps) {
  const { user } = useAuth();
  const { enabled, dice, toggle } = useSound();
  const [formula, setFormula] = useState("");

  const rollToChat = async (
    dice: string,
    label: string,
    modifier?: string,
  ) => {
    if (!user) return;
    const expression = modifier ? `${dice}+${modifier}` : dice;
    const result = rollFormula(expression);
    const roll: DiceRoll = {
      formula: expression,
      dice: result.dice,
      modifier: result.modifier,
      total: result.total,
      label,
    };
    await sendChatMessage(
      campaignId,
      user.uid,
      user.email?.split("@")[0] ?? "jogador",
      `🎲 ${expression} → ${result.total}`,
      roll,
    );
  };

  const handleQuickRoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formula.trim()) return;
    await rollToChat(formula.trim(), formula.trim());
    setFormula("");
  };

  const rollPreset = (expr: string, label: string) => {
    void rollToChat(expr, label);
    dice();
  };

  return (
    <div className="h-full p-7 overflow-auto flex flex-col gap-[18px]">
      <div className="flex items-start gap-3">
        <div>
          <h2 className="text-xl text-glow">Rolagem de dados</h2>
          <p className="text-muted text-xs mt-1">
            Clique nos dados ou digite uma rolagem. Os resultados vão para o
            chat da mesa.
          </p>
        </div>
        <button
          className="icon-btn ml-auto"
          title={enabled ? "Desativar sons" : "Ativar sons"}
          onClick={toggle}
        >
          {enabled ? "🔊" : "🔇"}
        </button>
      </div>

      <div className="flex gap-3.5 items-center flex-wrap bg-panel border border-border rounded-xl p-4">
        {DICE.map((die) => (
          <button
            key={die}
            onClick={() => {
              void rollToChat(die, die);
              dice();
            }}
            className="w-[70px] h-[70px] flex flex-col items-center justify-center bg-panel2 border border-border-light rounded-xl gap-0.5 transition-all duration-150 hover:border-glow-dark hover:shadow-[0_0_12px_rgba(95,212,208,.12)]"
          >
            <b className="text-xl font-cinzel text-gold">{die}</b>
            <small className="text-[10px] text-muted">clique</small>
          </button>
        ))}
        <form
          onSubmit={handleQuickRoll}
          className="flex items-center gap-2 bg-panel border border-border-light rounded-xl px-2.5 py-1.5 h-full"
        >
          <input
            type="text"
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            placeholder="2d20+3"
            className="w-[120px] bg-transparent border-none text-text text-sm focus:outline-none"
          />
          <span className="text-[11px] text-muted">ou digite</span>
          <button type="submit" className="btn btn-glow">
            Rolar
          </button>
        </form>
      </div>

      <div className="bg-panel border border-border rounded-xl p-4">
        <h3 className="text-xs text-accent tracking-wider mb-2.5">
          Rolagens rápidas
        </h3>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => rollPreset(preset.expr, preset.label)}
              className="px-3 py-2 rounded-lg bg-panel2 border border-border-light text-sm transition-colors hover:border-glow-dark hover:text-glow"
            >
              <b className="font-cinzel mr-1.5">{preset.label}</b>
              <span className="text-muted text-xs">{preset.expr}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="text-muted text-[11px]">
        Dica: `2d20` já conta como vantagem — pegue o maior resultado no chat.
      </p>
    </div>
  );
}