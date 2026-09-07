export interface DiceResult {
  dice: number[];
  modifier: number;
  total: number;
}

export function rollFormula(formula: string): DiceResult {
  const normalized = formula.replace(/\s/g, "").toLowerCase();

  const m = normalized.match(/^(\d*)d(\d+)([+-](\d+))?$/);
  if (m) {
    const count = m[1] ? Number(m[1]) : 1;
    const sides = Number(m[2]);
    const sign = m[3]?.startsWith("-") ? -1 : 1;
    const modifier = m[4] ? sign * Number(m[4]) : 0;

    const dice: number[] = [];
    for (let i = 0; i < count; i++) {
      dice.push(1 + Math.floor(Math.random() * sides));
    }
    const diceTotal = dice.reduce((a, b) => a + b, 0);
    return { dice, modifier, total: diceTotal + modifier };
  }

  if (/^\d+$/.test(normalized)) {
    const value = Number(normalized);
    return { dice: [], modifier: value, total: value };
  }

  const fallback = 1 + Math.floor(Math.random() * 20);
  return { dice: [fallback], modifier: 0, total: fallback };
}

export function formatRoll(result: DiceResult): string {
  const dicePart =
    result.dice.length > 0 ? `[${result.dice.join(", ")}]` : "";
  const modPart =
    result.modifier !== 0
      ? ` ${result.modifier > 0 ? "+" : "-"} ${Math.abs(result.modifier)}`
      : "";
  return `${dicePart}${modPart} = ${result.total}`;
}