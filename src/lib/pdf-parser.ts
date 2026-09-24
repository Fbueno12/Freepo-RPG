import type { WizardState } from "./types";

const ABILITIES = ["Força", "Destreza", "Constituição", "Inteligência", "Sabedoria", "Carisma"];

// Lowercase (with accents) keys — same shape SheetModal reads from state.atributos
const ABILITY_KEYS = ["força", "destreza", "constituição", "inteligência", "sabedoria", "carisma"];

const SKILLS = [
  "Acrobacia", "Arcanismo", "Atletismo", "Atuação", "Enganação", "Furtividade",
  "História", "Intimidação", "Intuição", "Investigação", "Lidar com Animais",
  "Medicina", "Natureza", "Percepção", "Persuasão", "Prestidigitação",
  "Religião", "Sobrevivência", "Tecnologia",
];

export interface PdfTextItem {
  text: string;
  x: number;
  y: number;
  w: number;
}

export interface TextRow {
  y: number;
  parts: { x: number; w: number; text: string }[];
  text: string;
}

export interface PdfParseResult {
  state: WizardState;
  rawText: string;
}

/** Lowercase + strip accents + collapse whitespace — for label matching only. */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const ROW_TOL = 3;

/**
 * Groups pdf.js text items of a single page into visual rows:
 * cluster by y (tolerance), sort each row by x, join with space.
 */
export function groupItemsIntoRows(items: PdfTextItem[]): TextRow[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: TextRow[] = [];
  for (const it of sorted) {
    const t = it.text.trim();
    if (!t) continue;
    const last = rows[rows.length - 1];
    if (last && Math.abs(last.y - it.y) <= ROW_TOL) {
      last.parts.push({ x: it.x, w: it.w, text: t });
    } else {
      rows.push({ y: it.y, parts: [{ x: it.x, w: it.w, text: t }], text: "" });
    }
  }
  for (const r of rows) {
    r.parts.sort((a, b) => a.x - b.x);
    r.text = r.parts.map((p) => p.text).join(" ");
  }
  return rows;
}

function centerX(p: { x: number; w: number }): number {
  return p.x + p.w / 2;
}

/** Value part of `row` horizontally closest to `label` (fallback when column counts differ). */
function nearestPart(
  row: TextRow,
  label: { x: number; w: number },
): { x: number; w: number; text: string } | undefined {
  let best: { x: number; w: number; text: string } | undefined;
  let bestDist = Infinity;
  for (const p of row.parts) {
    const d = Math.abs(centerX(p) - centerX(label));
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}

function isJunkRow(t: string): boolean {
  const n = t.trim();
  if (!n) return true;
  if (/Criador de Personagem/.test(n)) return true;
  if (/^file:\/\//.test(n)) return true;
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4},/.test(n)) return true;
  if (/^\d+\s*\/\s*\d+$/.test(n)) return true;
  return false;
}

type Section = "tracos" | "equipamento" | "detalhes" | "historia" | "combate" | "magias";

/** Returns section id when the row is a section header (h2), else null. */
function sectionStart(t: string): Section | "other" | null {
  const n = norm(t);
  if (n === "atributos" || n === "combate" || n === "runas" || n === "detalhes" || n === "historia" || n === "equipamento") {
    if (n === "detalhes") return "detalhes";
    if (n === "historia") return "historia";
    if (n === "equipamento") return "equipamento";
    if (n === "combate") return "combate";
    return "other";
  }
  if (n.startsWith("tracos e caracteristicas")) return "tracos";
  if (n.startsWith("magias")) return "magias";
  return null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function bareNumber(t: string): number | undefined {
  const m = t.trim().match(/^([+-]?\d{1,3})$/);
  return m ? parseInt(m[1], 10) : undefined;
}

export async function parsePdf(file: File): Promise<PdfParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const allRows: TextRow[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const items: PdfTextItem[] = [];
    for (const item of content.items) {
      if ("str" in item) {
        const w =
          "width" in item && typeof item.width === "number" && item.width > 0
            ? item.width
            : item.str.length * 5;
        items.push({
          text: item.str,
          x: item.transform[4],
          y: item.transform[5],
          w,
        });
      }
    }
    allRows.push(...groupItemsIntoRows(items));
  }

  const state = mapRowsToWizardState(allRows);
  return { state, rawText: allRows.map((r) => r.text).join("\n") };
}

export function mapRowsToWizardState(allRows: TextRow[]): WizardState {
  const state: WizardState = {};
  const rows = allRows.filter((r) => r.text && !isJunkRow(r.text));

  parseHeader(rows, state);
  parseBand(rows, state);
  parseStats(rows, state);
  parseAttributes(rows, state);
  parseSavesAndSkills(rows, state);
  parseCombat(rows, state);
  parseRunes(rows, state);
  parseTraits(rows, state);
  parseEssence(rows, state);
  parseEquipment(rows, state);
  parseDetails(rows, state);
  parseHistory(rows, state);
  parseSpells(rows, state);

  return state;
}

/* ---------------- Header: nome, conceito, nível ---------------- */

const BAND_LABELS = new Set(["classe", "origem", "regiao", "passado", "bonus de proficiencia", "nivel"]);

function parseHeader(rows: TextRow[], state: WizardState): void {
  // Nível: row with a "NÍVEL" part → number in same row, previous or next row
  const nivelIdx = rows.findIndex((r) => r.parts.some((p) => norm(p.text) === "nivel"));
  if (nivelIdx !== -1) {
    const r = rows[nivelIdx];
    const same = r.parts.map((p) => bareNumber(p.text)).find((n) => n !== undefined && n >= 1 && n <= 30);
    if (same !== undefined) {
      state.nivel = same;
    } else {
      for (const candRow of [rows[nivelIdx - 1], rows[nivelIdx + 1]]) {
        const n = candRow?.parts
          .map((p) => bareNumber(p.text))
          .find((v) => v !== undefined && v >= 1 && v <= 30);
        if (n !== undefined) {
          state.nivel = n;
          break;
        }
      }
    }
  }

  // Nome: first meaningful part in the first rows (skip labels / bare numbers / headers)
  let nameRowIdx = -1;
  for (let i = 0; i < Math.min(6, rows.length); i++) {
    const part = rows[i].parts.find((p) => {
      const n = norm(p.text);
      return n.length > 1 && !BAND_LABELS.has(n) && bareNumber(p.text) === undefined && !sectionStart(p.text);
    });
    if (part) {
      state.nome = part.text;
      nameRowIdx = i;
      break;
    }
  }

  // Conceito: next usable row after the name (parts that aren't labels/numbers)
  if (nameRowIdx !== -1) {
    for (let i = nameRowIdx + 1; i < Math.min(nameRowIdx + 4, rows.length); i++) {
      const usable = rows[i].parts.filter((p) => {
        const n = norm(p.text);
        return n.length > 1 && !BAND_LABELS.has(n) && bareNumber(p.text) === undefined && !sectionStart(rows[i].text);
      });
      if (usable.length > 0) {
        state.conceito = usable.map((p) => p.text).join(" ");
        break;
      }
    }
  }
}

/* ---------------- Faixa: classe, origem, região, passado, bônus ---------------- */

function parseBand(rows: TextRow[], state: WizardState): void {
  for (let i = 0; i < rows.length; i++) {
    const labels = rows[i].parts
      .map((p, idx) => ({ key: norm(p.text), part: p, idx }))
      .filter((l) => BAND_LABELS.has(l.key) && l.key !== "nivel");
    if (labels.length === 0) continue;

    const next = rows[i + 1];
    const nextIsLabels =
      !next ||
      next.parts.some((p) => BAND_LABELS.has(norm(p.text))) ||
      sectionStart(next.text) !== null;
    if (nextIsLabels) continue; // values missing — keep scanning

    for (const { key, part, idx } of labels) {
      let val: string | undefined;
      if (next.parts.length === rows[i].parts.length) {
        val = next.parts[idx]?.text;
      } else {
        val = nearestPart(next, part)?.text;
      }
      if (!val) continue;
      const v = val.trim();
      if (!v || v === "—" || v === "-" || BAND_LABELS.has(norm(v))) continue;
      if (key === "classe") {
        const [cls, ...rest] = v.split("·").map((s) => s.trim()).filter(Boolean);
        state.classe = cls || v;
        if (rest.length > 0) state.subclasse = rest.join(" · ");
      } else if (key === "origem") {
        state.origem = v;
      } else if (key === "regiao") {
        state.regiao = v;
      } else if (key === "passado") {
        state.passado = v;
      } else if (key === "bonus de proficiencia") {
        const m = v.match(/([+-]?\d+)/);
        if (m) (state as Record<string, unknown>).bonusProficiencia = parseInt(m[1], 10);
      }
    }
    i++; // consume values row
  }
}

/* ---------------- Caixas: PV, CA, RD, iniciativa, deslocamento, mana ---------------- */

function parseStats(rows: TextRow[], state: WizardState): void {
  const extra = state as Record<string, unknown>;
  const pvIdx = rows.findIndex((r) => r.parts.some((p) => norm(p.text) === "pv maximo"));
  if (pvIdx !== -1 && rows[pvIdx + 1] && sectionStart(rows[pvIdx + 1].text) === null) {
    const vals = rows[pvIdx + 1];
    const keys = ["pvMaximo", "classeArmadura", "reducaoDano"];
    keys.forEach((k, j) => {
      let raw: string | undefined;
      if (vals.parts.length === rows[pvIdx].parts.length) raw = vals.parts[j]?.text;
      else raw = nearestPart(vals, rows[pvIdx].parts[j])?.text;
      const m = raw?.match(/([+-]?\d+)/);
      if (m) extra[k] = parseInt(m[1], 10);
    });
  }
  const iniIdx = rows.findIndex((r) => r.parts.some((p) => norm(p.text) === "iniciativa"));
  if (iniIdx !== -1 && rows[iniIdx + 1] && sectionStart(rows[iniIdx + 1].text) === null) {
    const vals = rows[iniIdx + 1];
    const keys = ["iniciativa", "deslocamento", "mana"];
    keys.forEach((k, j) => {
      let raw: string | undefined;
      if (vals.parts.length === rows[iniIdx].parts.length) raw = vals.parts[j]?.text;
      else raw = nearestPart(vals, rows[iniIdx].parts[j])?.text;
      if (!raw) return;
      const m = raw.match(/([+-]?\d+)/);
      if (m) extra[k] = parseInt(m[1], 10);
      else if (raw.trim() && raw.trim() !== "—" && raw.trim() !== "-") extra[k] = raw.trim();
    });
  }
}

/* ---------------- Atributos ---------------- */

function parseAttributes(rows: TextRow[], state: WizardState): void {
  const attrs: Record<string, number> = {};
  for (let i = 0; i < rows.length; i++) {
    const hits = rows[i].parts
      .map((p, idx) => ({ ab: ABILITIES.find((a) => norm(a) === norm(p.text)), idx }))
      .filter((h) => h.ab);
    if (hits.length === 0) continue;
    // Skip "Salvaguarda de X" style rows — those parts are longer than a bare ability name
    const bare = hits.filter((h) => norm(rows[i].parts[h.idx].text) === norm(h.ab as string));
    if (bare.length === 0) continue;

    if (rows[i].parts.length >= 2 && bare.length >= 2) {
      // Grid: labels row → modifiers row → scores row, pair by column index
      const mods = rows[i + 1];
      const scores = rows[i + 2];
      for (const { ab, idx } of bare) {
        const key = ABILITY_KEYS[ABILITIES.indexOf(ab as string)];
        const cand = [scores?.parts[idx]?.text, mods?.parts[idx]?.text];
        for (const c of cand) {
          const n = c !== undefined ? bareNumber(c) : undefined;
          if (n !== undefined && n >= 1 && n <= 30) {
            attrs[key] = n;
            break;
          }
        }
      }
    } else {
      // Single column: label row → next rows hold modifier then score
      const key = ABILITY_KEYS[ABILITIES.indexOf(bare[0].ab as string)];
      const nums: number[] = [];
      for (let j = i + 1; j < Math.min(i + 4, rows.length); j++) {
        if (sectionStart(rows[j].text) !== null) break;
        if (rows[j].parts.some((p) => ABILITIES.some((a) => norm(a) === norm(p.text)))) break;
        const n = bareNumber(rows[j].text);
        if (n !== undefined) nums.push(n);
      }
      const valid = nums.filter((n) => n >= 1 && n <= 30);
      if (valid.length > 0) attrs[key] = valid[valid.length - 1];
    }
  }
  if (Object.keys(attrs).length > 0) state.atributos = attrs;
}

/* ---------------- Salvaguardas e perícias ---------------- */

function parseSavesAndSkills(rows: TextRow[], state: WizardState): void {
  const salv: Record<string, number> = {};
  const per: Record<string, number> = {};

  for (const r of rows) {
    const save = r.text.match(/Salvaguarda de ([A-Za-zÀ-ÿ]+)\s*[○●]?\s*([+-]?\d+)/);
    if (save) {
      const ab = ABILITIES.find((a) => norm(a) === norm(save[1]));
      if (ab) salv[ab] = parseInt(save[2], 10);
    }
    for (const skill of SKILLS) {
      const re = new RegExp(`${escapeRegex(skill)}\\s*\\(([^)]+)\\)\\s*([+-]?\\d+)`);
      const m = r.text.match(re);
      if (m) per[skill] = parseInt(m[2], 10);
    }
  }
  if (Object.keys(salv).length > 0) state.salvaguardas = salv;
  if (Object.keys(per).length > 0) state.pericias = per;
}

/* ---------------- Combate ---------------- */

export interface CombatRow {
  arma: string;
  bonus: string;
  dano: string;
}

function parseCombat(rows: TextRow[], state: WizardState): void {
  const idx = rows.findIndex((r) => norm(r.text) === "combate");
  if (idx === -1) return;
  const list: CombatRow[] = [];
  for (let i = idx + 1; i < rows.length; i++) {
    const t = rows[i].text;
    if (sectionStart(t) !== null) break;
    const n = norm(t);
    if (n.includes("arma") && n.includes("bonus") && n.includes("dano")) continue; // table header
    if (/golpe sem arma/i.test(t)) continue; // auto-generated row
    if (!t.trim()) continue;
    const parts = rows[i].parts;
    if (parts.length >= 3) {
      list.push({
        arma: parts[0].text,
        bonus: parts[1].text,
        dano: parts.slice(2).map((p) => p.text).join(" "),
      });
    } else {
      const m = t.match(/^(.*?)\s*([+-]\d+)\s*(.+)$/);
      if (m) list.push({ arma: m[1].trim(), bonus: m[2], dano: m[3].trim() });
    }
  }
  if (list.length > 0) (state as Record<string, unknown>).combate = list;
}

/* ---------------- Runas ---------------- */

function parseRunes(rows: TextRow[], state: WizardState): void {
  for (const r of rows) {
    const n = norm(r.text);
    if (n.startsWith("pulso runico")) {
      const v = r.text.replace(/^pulso r[úu]nico\s*/i, "").trim();
      if (v && v !== "—") state.pulsoRunico = v;
    } else if (n.startsWith("runas") && n.length > "runas".length) {
      const v = r.text.replace(/^runas(\s*\/\s*runess[eê]ncias)?\s*/i, "").trim();
      if (v && v !== "—") {
        const list = v.split(",").map((s) => s.trim()).filter(Boolean);
        state.runas = Object.fromEntries(list.map((s) => [s, true]));
      }
    }
  }
}

/* ---------------- Traços (bloco + heranças) ---------------- */

function parseTraits(rows: TextRow[], state: WizardState): void {
  const idx = rows.findIndex((r) => sectionStart(r.text) === "tracos");
  if (idx === -1) return;
  const block: string[] = [];
  for (let i = idx + 1; i < rows.length; i++) {
    if (sectionStart(rows[i].text) !== null) break;
    block.push(rows[i].text);
  }
  const text = block.join(" ").replace(/\s+/g, " ").trim();
  if (text) (state as Record<string, unknown>).tracos = text;
  const her = text.match(/heran[çc]as:\s*(.+?)(?=\s*(?:•\s*)?n[íi]vel\s*\d|passado\s*—|$)/i);
  if (her) {
    const list = her[1]
      .split(";")
      .map((s) => {
        // Herança names are leading capitalized words; drop text glued from the neighbor column
        const m = s
          .replace(/^•\s*/, "")
          .trim()
          .match(/^([A-ZÀ-Ý][a-zà-ÿ]*(?:\s+[A-ZÀ-Ý][a-zà-ÿ]*)*)/);
        return m ? m[1] : "";
      })
      .filter(Boolean);
    if (list.length > 0) state.herancas = list;
  }
}

/* ---------------- Essência & personalidade ---------------- */

function parseEssence(rows: TextRow[], state: WizardState): void {
  for (const r of rows) {
    const m = r.text.match(/Ess[êe]ncia:\s*(.+?)\s*·\s*Personalidade:\s*(.+)/);
    if (m) {
      state.essencia = m[1].trim();
      state.personalidade = m[2].trim();
      return;
    }
  }
}

/* ---------------- Equipamento ---------------- */

function parseEquipment(rows: TextRow[], state: WizardState): void {
  const idx = rows.findIndex((r) => sectionStart(r.text) === "equipamento");
  if (idx === -1) return;
  const equip: Record<string, unknown> = {};
  const items: string[] = [];
  for (let i = idx + 1; i < rows.length; i++) {
    const t = rows[i].text;
    const sec = sectionStart(t);
    if (sec !== null && sec !== "magias") break;
    if (sec === "magias") {
      // spellcaster block lives inside equipment area — handled by parseSpells
      continue;
    }
    const armor = t.match(/Armadura:\s*(.+?)(?:\s*·\s*Escudo:\s*(.+))?$/);
    if (armor) {
      if (armor[1].trim()) equip.armadura = armor[1].trim();
      if (armor[2]?.trim()) equip.escudo = armor[2].trim();
      continue;
    }
    for (const piece of t.split("•")) {
      const v = piece.replace(/^[-–·\s]+/, "").trim();
      if (v.length > 1 && !sectionStart(v)) items.push(v);
    }
  }
  if (items.length > 0) equip.outros = items;
  if (Object.keys(equip).length > 0) state.equip = equip;
}

/* ---------------- Detalhes (chave: valor, várias por linha) ---------------- */

const DETAIL_KEY_MAP: Record<string, string> = {
  idiomas: "idiomas",
  "estilo de vida": "estiloVida",
  sexo: "sexo",
  idade: "idade",
  altura: "altura",
  peso: "peso",
  pele: "pele",
  cabelo: "cabelo",
  olhos: "olhos",
  marcas: "marcas",
};

function parseDetails(rows: TextRow[], state: WizardState): void {
  const idx = rows.findIndex((r) => sectionStart(r.text) === "detalhes");
  if (idx === -1) return;
  const det: Record<string, unknown> = {};
  const labelRe = /(Idiomas|Estilo de vida|Sexo|Idade|Altura|Peso|Pele|Cabelo|Olhos|Marcas):\s*/gi;
  for (let i = idx + 1; i < rows.length; i++) {
    const t = rows[i].text;
    if (sectionStart(t) === "historia" || sectionStart(t) === "tracos") break;
    if (sectionStart(t) !== null) continue;
    const matches = [...t.matchAll(labelRe)];
    if (matches.length === 0) continue;
    matches.forEach((m, k) => {
      const mapped = DETAIL_KEY_MAP[norm(m[1])];
      if (!mapped) return;
      const start = (m.index ?? 0) + m[0].length;
      const end = k + 1 < matches.length ? (matches[k + 1].index ?? t.length) : t.length;
      const v = t.slice(start, end).trim();
      if (v) det[mapped] = v;
    });
  }
  if (Object.keys(det).length > 0) state.detalhes = det;
}

/* ---------------- História ---------------- */

function parseHistory(rows: TextRow[], state: WizardState): void {
  const idx = rows.findIndex((r) => sectionStart(r.text) === "historia");
  if (idx === -1) return;
  const parts: string[] = [];
  for (let i = idx + 1; i < rows.length; i++) {
    if (sectionStart(rows[i].text) !== null) break;
    parts.push(rows[i].text);
  }
  const text = parts
    .join(" ")
    .replace(/^hist[oó]ria\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text) state.historia = text;
}

/* ---------------- Magias (melhor esforço) ---------------- */

function parseSpells(rows: TextRow[], state: WizardState): void {
  let truques: string | undefined;
  let conhecidas: string | undefined;
  for (let i = 0; i < rows.length; i++) {
    const t = rows[i].text;
    const tm = t.match(/Truques conhecidos.*?:\s*(.*)/);
    if (tm && !truques) {
      truques = tm[1].trim() || rows[i + 1]?.text.trim();
    }
    const cm = t.match(/Magias conhecidas.*?:\s*(.*)/);
    if (cm && !conhecidas) {
      conhecidas = cm[1].trim() || rows[i + 1]?.text.trim();
    }
  }
  if (truques || conhecidas) {
    (state as Record<string, unknown>).magias = { truques: truques ?? "", conhecidas: conhecidas ?? "" };
  }
}
