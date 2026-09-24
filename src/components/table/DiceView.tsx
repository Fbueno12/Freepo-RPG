"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { sendChatMessage } from "@/lib/campaigns";
import { rollFormula } from "@/lib/dice";
import { useSound } from "@/hooks/useSound";
import type { DiceRoll } from "@/lib/types";

const DICE = ["d4", "d6", "d8", "d10", "d12", "d20"] as const;

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
    <div className="dice-view">
      <div className="dice-head">
        <div>
          <h2>Rolagem de dados</h2>
          <p>
            Clique nos dados ou digite uma rolagem. Os resultados vão para o
            chat da mesa.
          </p>
        </div>
        <button
          className="icon-btn right"
          title={enabled ? "Desativar sons" : "Ativar sons"}
          onClick={toggle}
        >
          {enabled ? "🔊" : "🔇"}
        </button>
      </div>

      <div className="dice-tray">
        {DICE.map((die) => (
          <button
            key={die}
            onClick={() => {
              void rollToChat(die, die);
              dice();
            }}
            className="die"
          >
            <b>{die}</b>
            <small>clique</small>
          </button>
        ))}
        <form onSubmit={handleQuickRoll} className="dice-custom">
          <input
            type="text"
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            placeholder="2d20+3"
          />
          <span className="hint">ou digite</span>
          <button type="submit" className="btn btn-glow">
            Rolar
          </button>
        </form>
      </div>

      <div className="dice-presets">
        <h3 className="preset-title">Rolagens rápidas</h3>
        <div className="preset-row">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => rollPreset(preset.expr, preset.label)}
              className="preset-btn"
            >
              <b>{preset.label}</b>
              <span>{preset.expr}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="dice-tip">
        Dica: `2d20` já conta como vantagem — pegue o maior resultado no chat.
      </p>
    </div>
  );
}