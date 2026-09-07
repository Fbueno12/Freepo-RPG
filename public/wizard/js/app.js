/* ============================================================
   Criador de Personagem · Runarcana RPG
   Lógica do wizard — JS puro, sem dependências
   ============================================================ */
'use strict';

const D = window.RUNARCANA_DATA;

/* ---------------- Constantes ---------------- */

const ABILITIES = ['Força', 'Destreza', 'Constituição', 'Inteligência', 'Sabedoria', 'Carisma'];

const SKILLS = [
  'Acrobacia', 'Arcanismo', 'Atletismo', 'Atuação', 'Enganação', 'Furtividade',
  'História', 'Intimidação', 'Intuição', 'Investigação', 'Lidar com Animais',
  'Medicina', 'Natureza', 'Percepção', 'Persuasão', 'Prestidigitação',
  'Religião', 'Sobrevivência', 'Tecnologia'
];

const SKILL_ABILITY = {
  'Acrobacia': 'Destreza', 'Arcanismo': 'Inteligência', 'Atletismo': 'Força',
  'Atuação': 'Carisma', 'Enganação': 'Carisma', 'Furtividade': 'Destreza',
  'História': 'Inteligência', 'Intimidação': 'Carisma', 'Intuição': 'Sabedoria',
  'Investigação': 'Inteligência', 'Lidar com Animais': 'Sabedoria', 'Medicina': 'Sabedoria',
  'Natureza': 'Inteligência', 'Percepção': 'Sabedoria', 'Persuasão': 'Carisma',
  'Prestidigitação': 'Destreza', 'Religião': 'Inteligência', 'Sobrevivência': 'Sabedoria',
  'Tecnologia': 'Inteligência'
};

const DEFAULT_STATE = {
  nivel: 1,
  nome: '', conceito: '', historia: '',
  origem: '', origemVariante: '',
  regiao: '', regiaoSkill: '', regiaoLang: '', regiaoNotas: '',
  classe: '', subclasse: '', classeSkills: [], tecnicasNota: '',
  atributos: { rolls: null, assign: { 'Força': null, 'Destreza': null, 'Constituição': null, 'Inteligência': null, 'Sabedoria': null, 'Carisma': null }, plus2: 'Força', plus1: 'Destreza', improvs: {} },
  pericias: {}, salvaguardas: {},
  herancas: [],
  pulsoRunico: '', runas: [], runaCategoria: 'runas',
  essencia: '', personalidade: '',
  passado: '',
  detalhes: { sexo: '', idade: '', altura: '', peso: '', pele: '', cabelo: '', olhos: '', marcas: '', estiloVida: '' },
  idiomasExtras: [],
  equip: { armadura: '', escudo: '', armas: [], conjuntos: [], outros: [] },
  magias: { truques: '', conhecidas: '' },
  notas: ''
};

const IMPROV_LEVELS = [4, 8, 12, 16, 19];

/* ---------------- Utilidades ---------------- */

const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function mod(value) {
  return Math.floor((Number(value) - 10) / 2);
}
function modStr(value) {
  const m = mod(value);
  return (m >= 0 ? '+' : '') + m;
}
function profBonus(level) {
  return Math.floor((level - 1) / 4) + 2;
}
function parseDice(str) {
  const m = String(str || '').match(/(\d+)d(\d+)/);
  if (!m) return 0;
  let sum = 0;
  for (let i = 0; i < Number(m[1]); i++) sum += 1 + Math.floor(Math.random() * Number(m[2]));
  return sum;
}
function roll4d6() {
  const dice = [1, 2, 3, 4].map(() => 1 + Math.floor(Math.random() * 6));
  dice.sort((a, b) => a - b);
  const drop = dice.shift();
  const raw = dice.reduce((a, b) => a + b, 0);
  const total = Math.max(9, raw);
  return { dice, drop, total, min9: raw < 9 };
}
function classData(slug) {
  return D.classes[slug] || null;
}

/* ---------------- Estado ---------------- */

let state = load();

function load() {
  try {
    const raw = localStorage.getItem('runarcana_wizard_v1');
    if (raw) return Object.assign(JSON.parse(JSON.stringify(DEFAULT_STATE)), JSON.parse(raw));
  } catch (e) { /* ignora */ }
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}
function save() {
  try { localStorage.setItem('runarcana_wizard_v1', JSON.stringify(state)); } catch (e) { /* ignora */ }
}

/* ---------------- Navegação ---------------- */

const STEPS = [
  { id: 'welcome', label: 'Bem-vindo' },
  { id: 'conceito', label: '1 · Conceito' },
  { id: 'origem', label: '2 · Origem' },
  { id: 'regiao', label: '3 · Região' },
  { id: 'classe', label: '4 · Classe' },
  { id: 'atributos', label: '5 · Atributos' },
  { id: 'herancas', label: '6 · Heranças' },
  { id: 'runas', label: '7 · Runas' },
  { id: 'personalidade', label: '8 · Personalidade' },
  { id: 'detalhes', label: '9 · Detalhes' },
  { id: 'equipamento', label: '10 · Equipamento' },
  { id: 'revisao', label: '11 · Revisão' }
];

let currentStep = 0;

function renderNav() {
  const nav = $('#steps-nav');
  nav.innerHTML = STEPS.map((s, i) => `
    <button class="step-item ${i === currentStep ? 'active' : ''} ${i < currentStep ? 'done' : ''}" data-goto="${i}">
      <span class="step-num">${i < currentStep ? '✓' : i + 1}</span>
      <span class="step-label">${s.label}</span>
    </button>`).join('');
}
function go(i) {
  currentStep = Math.max(0, Math.min(STEPS.length - 1, i));
  renderNav();
  STEPS[currentStep].render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function navButtons(prev = true, next = true) {
  return `
    <div class="nav-row">
      ${prev ? '<button class="btn" data-nav="prev">← Anterior</button>' : '<span></span>'}
      <div class="right">
        ${next ? '<button class="btn btn-primary" data-nav="next">Próximo →</button>' : ''}
        <button class="btn btn-ghost" data-action="reset">Reiniciar</button>
      </div>
    </div>`;
}
function blockCard(title, kicker, subtitle) {
  return `<div class="step-title"><span class="kicker">${kicker}</span><h2>${esc(title)}</h2></div>
    <p class="step-subtitle">${subtitle}</p>`;
}

/* ---------------- Render helpers ---------------- */

function optionCards(inputName, items, selected, count, opts = {}) {
  return `<div class="grid3">
    ${items.map((it, idx) => {
      const checked = selected === it.value;
      const disabled = count != null && it.value !== selected && Array.isArray(selected)
        ? selected.length >= count
        : false;
      return `<div class="opt-card">
        <input type="radio" name="${inputName}" value="${esc(it.value)}" id="${inputName}-${idx}"
          ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''} data-opt-one>
        <label for="${inputName}-${idx}">
          <span class="opt-name">${esc(it.value)}</span>
          ${it.tag ? `<span class="opt-tag">${esc(it.tag)}</span>` : ''}
          ${it.desc ? `<div class="opt-desc">${it.desc}</div>` : ''}
        </label>
      </div>`;
    }).join('')}
  </div>`;
}

const select = (name, items, selected, placeholder = '', allowEmpty = false) => {
  let html = `<select name="${name}" data-select="${name}">`;
  if (allowEmpty || placeholder) html += `<option value="">${esc(placeholder)}</option>`;
  items.forEach(it => {
    const v = typeof it === 'object' ? it.value : it;
    const t = typeof it === 'object' ? (it.label || it.value) : it;
    html += `<option value="${esc(v)}" ${String(selected) === String(v) ? 'selected' : ''}>${esc(t)}</option>`;
  });
  html += '</select>';
  return html;
};

/* ---------------- Computações derivadas ---------------- */

function origemData() { return state.origem ? D.origens[state.origem] : null; }
function classeSel() { return state.classe ? classData(state.classe) : null; }
function passadoData() { return state.passado ? D.detalhamento.passados.find(p => p.name === state.passado) : null; }

function getRawAttrs() {
  const r = {};
  ABILITIES.forEach(a => {
    const idx = state.atributos.assign[a];
    let base = (state.atributos.rolls && idx != null) ? state.atributos.rolls[idx].total : 8;
    r[a] = base;
  });
  return r;
}

function getAttrs() {
  const r = getRawAttrs();
  if (state.atributos.plus2) r[state.atributos.plus2] += 2;
  if (state.atributos.plus1) r[state.atributos.plus1] += 1;
  IMPROV_LEVELS.forEach(lv => {
    const im = state.atributos.improvs[lv];
    if (!im || im.mode === 'none') return;
    if (im.mode === '+2' && im.a) r[im.a] += 2;
    if (im.mode === '+1+1' && im.a) r[im.a] += 1;
    if (im.mode === '+1+1' && im.b) r[im.b] += 1;
  });
  return r;
}

function maxHp() {
  const c = classeSel();
  if (!c) return 0;
  const conMod = mod(getAttrs().Constituição);
  let hp = state.nivel * c.hitDie + state.nivel * conMod;
  const od = origemData();
  if (od && state.origem === 'minotauro') hp += Math.floor(profBonus(state.nivel) / 2) * state.nivel;
  return hp;
}

function manaAtLevel() {
  const c = classeSel();
  if (!c) return null;
  const row = (c.levelTable || []).find(l => Number(l.level) === Number(state.nivel));
  return row ? (row.mana != null ? row.mana : null) : null;
}

function runasMax() {
  return [1, 8, 15].filter(lv => state.nivel >= lv).length;
}

function improvLevelsAvailable() {
  const c = classeSel();
  if (!c || !c.levelTable) return [];
  return c.levelTable.filter(l => {
    const f = Array.isArray(l.features) ? l.features : [];
    return f.some(x => String(x).toLowerCase().includes('aprimoramento'));
  }).map(l => Number(l.level));
}

function skillsEfetivas() {
  const set = new Set();
  Object.keys(state.pericias).forEach(s => { if (state.pericias[s]) set.add(s); });
  state.classeSkills.forEach(s => set.add(s));
  const p = passadoData();
  (p ? p.skills || [] : []).forEach(s =>
    SKILLS.forEach(sk => { if (sk.toLowerCase().includes(String(s).toLowerCase())) set.add(sk); }));
  const od = origemData();
  (od && od.traits ? od.traits : []).forEach(t => {
    if (/perícia/i.test(t.name)) set.add(state.regiaoSkill || '');
  });
  return set;
}

function languagesEfetivas() {
  const set = new Set();
  const od = origemData();
  (od ? od.languages || [] : []).forEach(l => {
    const clean = l.replace(/\(.*?\)/g, '').trim();
    if (clean && !/idioma da região|à escolha/i.test(clean)) set.add(clean);
  });
  const rd = D.regioes[state.regiao];
  if (rd && state.regiaoLang) {
    const lang = state.regiaoLang.split(' · ')[0].trim();
    set.add(lang);
  }
  const p = passadoData();
  (p ? p.languages || [] : []).forEach(l => {
    if (/à sua escolha/i.test(l)) { /* idioma à escolha: fica para o player */ }
    else set.add(l);
  });
  state.idiomasExtras.forEach(l => set.add(l));
  return [...set];
}

function equipamentosAutomaticos() {
  const list = [];
  const c = classeSel();
  if (c) (c.startingEquipment || []).forEach(i => {
    const alt = i.orAlternative ? ` (ou ${i.orAlternative})` : '';
    for (let k = 0; k < (i.qty || 1); k++) list.push(`${i.qty && i.qty > 1 ? i.qty + '× ' : ''}${i.name}${alt}`);
  });
  const p = passadoData();
  if (p) (p.equipment || []).forEach(i => {
    const qty = i.qty || 1;
    for (let k = 0; k < qty; k++) list.push(`${qty > 1 ? qty + '× ' : ''}${i.name}`);
  });
  return [...new Set(list)];
}

/* ---------------- Perícia / salvaguarda ------------- */

function renderPericiasSection() {
  const attrs = getAttrs();
  const eficientes = skillsEfetivas();
  return `<div class="card">
    <div class="card-title-row"><h3>Perícias</h3><small>marcadas = proficiente (+${profBonus(state.nivel)} do bônus de proficiência)</small></div>
    <table class="tbl attr-table">
      <thead><tr><th>Perícia</th><th>Atributo</th><th>Mod</th><th>Item</th></tr></thead>
      <tbody>
        ${SKILLS.map(s => {
          const ab = SKILL_ABILITY[s];
          const proficiente = eficientes.has(s);
          const total = mod(getAttrs()[ab]) + (proficiente ? profBonus(state.nivel) : 0);
          return `<tr>
            <td><label class="skill-toggle"><input type="checkbox" data-skill="${esc(s)}" ${proficiente ? 'checked' : ''}> ${esc(s)}</label></td>
            <td><small>${ab}</small></td>
            <td><span class="mod-badge ${total > 0 ? 'mod-pos' : total < 0 ? 'mod-neg' : 'mod-zero'}">${modStr(total)}</span></td>
            <td></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>`;
}

function renderSalvaguardasSection() {
  const c = classeSel();
  const attrs = getAttrs();
  const cls = c ? (c.savingThrows || []) : [];
  return `<div class="card">
    <div class="card-title-row"><h3>Salvaguardas</h3><small>rodadas, a classe concede as marcadas</small></div>
    <table class="tbl attr-table">
      <tbody>
        ${ABILITIES.map(a => {
          const proficiente = cls.some(x => x === a || (x.includes(' ou ') && x.split(' ou ').includes(a)));
          const checked = proficiente || !!state.salvaguardas[a];
          const total = mod(attrs[a]) + (checked ? profBonus(state.nivel) : 0);
          return `<tr>
            <td><label class="skill-toggle"><input type="checkbox" data-salv="${esc(a)}" ${checked ? 'checked' : ''}> Salvaguarda de ${esc(a)}</label></td>
            <td style="width:120px"><span class="mod-badge ${total > 0 ? 'mod-pos' : total < 0 ? 'mod-neg' : 'mod-zero'}">${modStr(total)}</span></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>`;
}

/* ============================================================
   PASSOS
   ============================================================ */

/* ---- 0 · Bem-vindo ---- */
STEPS[0].render = function () {
  const html = `
    ${blockCard('Bem-vindo ao Criador de Personagem', 'Capítulo 1 · Criação de personagem', 'Siga os passos para criar seu personagem de Runarcana RPG. Ao final, sera gerada uma ficha pronta para imprimir.')}
    <div class="card">
      <p>Este assistente segue o guia oficial de criação do <strong>Capítulo 1</strong>: conceito, origem, região, classe, atributos (método de rolamento <strong>4d6</strong>), heranças, runas, personalidade, detalhes e equipamento.</p>
      <ul>
        <li><strong>Origem</strong> — define seus traços raciais, bônus de atributo (±2/±1) e idiomas.</li>
        <li><strong>Região</strong> — dá idioma regional, perícia e traços regionais.</li>
        <li><strong>Classe</strong> — define dados de vida, proficiências, equipamento inicial e características do 1º nível.</li>
        <li><strong>Atributos</strong> — role <strong>6×4d6</strong> (mantendo os 3 maiores) e distribua.</li>
        <li><strong>Heranças</strong> — você tem pontos para personalizar seu personagem.</li>
        <li><strong>Runas</strong> — escolha sua Natureza Rúnica: um Pulso Rúnico e uma Runa/Runessência.</li>
      </ul>
      <div class="alert alert-info">Você pode ajustar o <strong>nível do personagem</strong> (1–20) no topo da página a qualquer momento — o bônus de proficiência, os pontos de vida, as runas conhecidas e os aprimoramentos são recalculados automaticamente.</div>
      <p><small>Conteúdo extraído da <a href="https://wiki.runarcana.org/pt-br/personagens/criacao-de-personagem/index.html" target="_blank" rel="noopener">Wiki Runarcana</a>. Ferramenta não oficial.</small></p>
    </div>`;
  $('#content').innerHTML = html + navButtons(false, true);
};

/* ---- 1 · Conceito ---- */
STEPS[1].render = function () {
  const html = `
    ${blockCard('Conceito do Personagem', 'Etapa 1 · Criação de Conceito', 'O conceito é o esqueleto do personagem. Pense em quem ele é, de onde veio e o que o move.')}
    <div class="card">
      <div class="field"><label>Nome</label>
        <input type="text" id="c-nome" value="${esc(state.nome)}" placeholder="Ex.: Karon"></div>
      <div class="field"><label>Conceito (uma frase)</label>
        <input type="text" id="c-conceito" value="${esc(state.conceito)}" placeholder="Ex.: Guerreiro noxiano que domina machado e magia"></div>
      <div class="field"><label>História / ideia inicial</label>
        <textarea id="c-historia" rows="5" placeholder="Conte brevemente a história que motivou este personagem...">${esc(state.historia)}</textarea></div>
    </div>`;
  $('#content').innerHTML = html + navButtons(true, true);
  $('#input-nivel').addEventListener && null;
};

/* ---- 2 · Origem ---- */
STEPS[2].render = function () {
  const items = Object.keys(D.origens).map(k => ({
    value: k,
    desc: origemResumo(k)
  }));
  const varSel = origemData() && origemData().variants && origemData().variants.length
    ? `<div class="card"><div class="card-title-row"><h3>Variante da Origem</h3></div>
        <div class="grid2">
          ${origemData().variants.map(v => `
            <div class="opt-card"><input type="radio" name="origemVariante" value="${esc(v.name)}" id="ov-${esc(v.name)}" ${state.origemVariante === v.name ? 'checked' : ''} data-opt-one>
              <label for="ov-${esc(v.name)}"><span class="opt-name">${esc(v.name)}</span><div class="opt-desc">${esc(v.description)}</div></label>
            </div>`).join('')}
        </div>
      </div>`
    : '';
  const html = `
    ${blockCard('Escolha uma Origem', 'Etapa 2 · Origem', 'Sua origem define a base genética do personagem (traços, idiomas, bônus de atributos \u00b12/\u00b11 e pontos de herança).')}
    ${optionCards('origem', items, state.origem, null)}
    ${varSel}
    ${origemData() ? detalheOrigem(origemData()) : ''}
    ${navButtons(true, true)}`;
  $('#content').innerHTML = html;
};

function origemResumo(k) {
  const o = D.origens[k];
  const hp = o.herancaPoints >= 0 ? `<br><span class="opt-tag">${o.herancaPoints} ponto${o.herancaPoints !== 1 ? 's' : ''} de herança</span>` : '';
  return `${o.size} · deslocamento ${o.speed} pés${hp}`;
}
function detalheOrigem(o) {
  const es = o.languages && o.languages.length ? `<div class="field"><label>Idiomas da origem</label><div class="chips">${o.languages.map(l => `<span class="chip">${esc(l)}</span>`).join('')}</div></div>` : '';
  return `<div class="card">
    <div class="card-title-row"><h3>${esc(o.name)}</h3><small>${o.size} · ${o.speed} pés de deslocamento · ${o.herancaPoints} pontos de herança</small></div>
    ${o.attributeBonus && o.attributeBonus._note ? `<p class="hint">${esc(o.attributeBonus._note)}</p>` : ''}
    ${es}
    <ul>${(o.traits || []).map(t => `<li><strong>${esc(t.name)}</strong> — ${esc(t.description)}</li>`).join('')}</ul>
    ${o.proficiencies && o.proficiencies.length ? `<p class="hint">Proficiências: ${o.proficiencies.map(p => esc(p)).join(', ')}</p>` : ''}
    ${o._note ? `<p class="note">${esc(o._note)}</p>` : ''}
  </div>`;
}

/* ---- 3 · Região ---- */
STEPS[3].render = function () {
  const ro = D.regioes[state.regiao] || null;
  const skillOptions = ro
    ? (ro.skills && ro.skills[0] === 'Qualquer perícia' ? SKILLS : ro.skills || [])
    : [];
  const langOptions = ro ? (ro.languages || []) : [];
  const details = ro ? `
    ${ro.languages && ro.languages.length ? `<div class="field"><label>Idioma regional</label>${select('regiaoLang', langOptions.map(l => ({ value: l, label: l })), state.regiaoLang, 'Escolha um idioma')}</div>` : ''}
    ${skillOptions.length ? `<div class="field"><label>Perícia regional</label>${select('regiaoSkill', skillOptions.map(s => ({ value: s, label: s })), state.regiaoSkill, 'Escolha uma perícia')}</div>` : ''}
    <div class="field"><label>Atividades / notas da região (opcional)</label>
      <input type="text" id="regiao-notas" value="${esc(state.regiaoNotas)}" placeholder="Ex.: duas armas simples, ofício menor..."></div>
    <ul>${(ro.traits || []).map(t => `<li><strong>${esc(t.name)}</strong> — ${esc(t.description)}</li>`).join('')}</ul>
    ${ro._note ? `<p class="note">${esc(ro._note)}</p>` : ''}` : '';
  const html = `
    ${blockCard('Escolha uma Região', 'Etapa 3 · Região', 'Sua região de origem concede idioma, perícia e traços regionais.')}
    ${optionCards('regiao', Object.keys(D.regioes).map(k => ({ value: k, desc: regionResumo(k) })), state.regiao, null)}
    ${ro ? `<div class="card"><h3>${esc(ro.name)}</h3>${details}</div>` : ''}
    ${navButtons(true, true)}`;
  $('#content').innerHTML = html;
};
function regionResumo(k) {
  const r = D.regioes[k];
  const parts = [r.languages && r.languages[0], r.skills && r.skills[0]];
  return parts.filter(Boolean).join(' · ');
}

/* ---- 4 · Classe ---- */
STEPS[4].render = function () {
  const c = classeSel();
  const html = `
    ${blockCard('Escolha uma Classe', 'Etapa 4 · Classe', 'O tipo de treinamento que moldou o personagem. A classe define dados de vida, proficiências, equipamento inicial e características.')}
    ${optionCards('classe', Object.keys(D.classes).map(k => ({
      value: k,
      desc: `${D.classes[k].primaryAbility || ''} · d${D.classes[k].hitDie} de vida · ${(D.classes[k].armorProficiencies || []).join(', ')}`
    })), state.classe, null)}
    ${c ? detalheClasse(c) : ''}
    ${navButtons(true, true)}`;
  $('#content').innerHTML = html;
};

function detalheClasse(c) {
  let html = `<div class="card">
    <div class="card-title-row"><h3>${esc(c.name)}</h3><small>d${c.hitDie} de vida · atributo principal: ${c.primaryAbility}</small></div>
    <p class="hint">${esc(c.description || '')}</p>
    <div class="grid2">
      <div><strong>Proficiências</strong><ul class="small-pad">
        ${(c.armorProficiencies || []).concat(c.weaponProficiencies || [], c.toolProficiencies || []).map(p => `<li>${esc(p)}</li>`).join('')}
      </ul></div>
      <div><strong>Salvaguardas</strong><ul class="small-pad">${(c.savingThrows || []).map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>
    </div>
    ${c.skillChoices ? `<div class="field"><label>${esc(c.skillChoices.description || `Escolha ${c.skillChoices.count} perícias`)}</label>
      ${multiSelect('classeSkills', c.skillChoices.options, state.classeSkills, c.skillChoices.count)}</div>` : ''}
    <div class="field"><label>Equipamento inicial (da classe)</label><ul class="small-pad">
      ${(c.startingEquipment || []).map(e => `<li>${esc((e.qty > 1 ? e.qty + '× ' : '') + e.name + (e.orAlternative ? ' — ou ' + e.orAlternative : ''))}</li>`).join('')}
    </ul></div>
    ${c.startingGold ? `<p class="hint">${esc(c.startingGold)}</p>` : ''}
  </div>`;

  /* subclasse */
  if (c.subclass && c.subclass.options) {
    html += `<div class="card">
      <div class="card-title-row"><h3>${esc(c.subclass.choiceName || 'Subclasse')}</h3>
        <small>${c.subclass.grantedAt > state.nivel ? `disponível no nível ${c.subclass.grantedAt}` : 'escolhida no 1º nível'}</small></div>
      ${c.subclass.grantedAt > state.nivel
        ? `<div class="alert alert-warn">Esta escolha será feita quando você alcançar o nível ${c.subclass.grantedAt} desta classe. Na ficha, anote o ${esc(c.subclass.choiceName)} pretendido.</div>`
        : `<div class="grid2">${c.subclass.options.map(o => `<div class="opt-card">
            <input type="radio" name="subclasse" value="${esc(o.name)}" id="sub-${esc(o.name)}" ${state.subclasse === o.name ? 'checked' : ''} data-opt-one>
            <label for="sub-${esc(o.name)}"><span class="opt-name">${esc(o.name)}</span><div class="opt-desc">${esc(o.description)}</div></label>
          </div>`).join('')}</div>`}
    </div>`;
  }
  if (c.awakening && c.awakening.options) {
    html += `<div class="card"><div class="card-title-row"><h3>${esc(c.awakening.choiceName)}</h3><small>escolhido no ${c.awakening.grantedAt}º nível</small></div>
      <div class="grid2">${c.awakening.options.map(o => `<div class="opt-card">
        <input type="radio" name="awakening" value="${esc(o.name)}" id="aw-${esc(o.name)}" ${state.subclasse === o.name ? 'checked' : ''} data-opt-one>
        <label for="aw-${esc(o.name)}"><span class="opt-name">${esc(o.name)}</span><div class="opt-desc">${esc(o.description)}</div></label>
      </div>`).join('')}</div></div>`;
  }

  /* características do nível */
  const feats = (c.features || []).filter(f => Number(f.level) <= Number(state.nivel));
  if (feats.length) {
    html += `<div class="card"><div class="card-title-row"><h3>Características até o nível ${state.nivel}</h3></div>
      ${feats.map(f => `<details class="desc">
        <summary>${esc(f.name)} <small>· nível ${f.level}</small></summary>
        <div class="body">${esc(f.description)}</div></details>`).join('')}
    </div>`;
  }

  /* técnicas / anotações */
  if (c.fightingTechniques) {
    html += `<div class="card"><div class="card-title-row"><h3>Técnicas de Combate</h3></div>
      <p class="hint">${esc(c.fightingTechniques)}</p>
      <div class="field"><label>Suas técnicas escolhidas (anote)</label>
        <input type="text" id="tecnicas" value="${esc(state.tecnicasNota)}" placeholder="Ex.: Combatente Arcano (14 Int + Herança Centelha Mágica)"></div>
    </div>`;
  }
  return html;
}

function multiSelect(name, options, selected, max, placeholder) {
  selected = selected || [];
  return `<div class="ms-grid" data-ms-max="${max}">
    ${options.map(o => `<label class="pick ${selected.includes(o) ? 'on' : ''}">
      <input type="checkbox" data-ms-opt="${esc(name)}" data-ms-max="${max}" value="${esc(o)}" ${selected.includes(o) ? 'checked' : ''}>${esc(o)}</label>`).join('')}
  </div>
  <p class="hint">Escolha até ${max} ${max > 1 ? 'perícias' : 'perícia'} clicando nelas.</p>`;
}

/* ---- 5 · Atributos ---- */
STEPS[5].render = function () {
  const rolls = state.atributos.rolls;
  const attrs = getAttrs();
  const used = {};
  ABILITIES.forEach(a => { if (state.atributos.assign[a] != null) used[state.atributos.assign[a]] = true; });

  const rollUI = !rolls ? `
    <div class="card">
      <h3>Rolagem de Atributos</h3>
      <p class="hint">Método 2 (rolagem) — role <strong>6×4d6</strong>. Para cada conjunto, some os <strong>três maiores</strong> números (descarte o menor). Rolagens abaixo de <strong>9</strong> são consideradas como 9.</p>
      <button class="btn btn-primary" id="btn-roll">Rolar 4d6 (6 conjuntos)</button>
    </div>`
  : `
    <div class="card">
      <h3>Valores rolados</h3>
      <div class="roll-box">
        ${rolls.map((r, i) => `<div class="roll-card">
          <div class="big">${r.total}</div>
          <div class="dice">dados ${r.dice.map(d => '<b>' + d + '</b>').join(' · ')}</div>
          <div class="sub">descartado: ${r.drop}${r.min9 ? ' · <b>mín. 9</b>' : ''}</div>
        </div>`).join('')}
      </div>
      <button class="btn btn-ghost btn-sm" id="btn-reroll">Reler novamente</button>
    </div>
    <div class="card">
      <h3>Distribua os valores</h3>
      <table class="attr-table">
        <thead><tr><th>Atributo</th><th>Valor rolado</th><th>Bônus da origem</th><th>Total</th><th>Mod.</th></tr></thead>
        <tbody>
          ${ABILITIES.map(a => {
            const idx = state.atributos.assign[a];
            const extra = (state.atributos.plus2 === a ? 2 : 0) + (state.atributos.plus1 === a ? 1 : 0);
            const total = attrs[a];
            return `<tr>
              <td><strong>${a}</strong></td>
              <td><select data-set-attr="${esc(a)}">
                <option value="">—</option>
                ${rolls.map((r, i) => `<option value="${i}" ${idx === i ? 'selected' : ''} ${idx !== i && used[i] ? 'disabled' : ''}>${r.total} (conjunto ${i + 1})</option>`).join('')}
              </select></td>
              <td>${extra ? `+${extra}` : '—'}</td>
              <td class="total-val">${idx != null ? total : '—'}</td>
              <td><span class="mod-badge ${mod(total) > 0 ? 'mod-pos' : mod(total) < 0 ? 'mod-neg' : 'mod-zero'}">${idx != null ? modStr(total) : '—'}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      <div class="grid2" style="margin-top:10px">
        <div class="field"><label>+2 da origem (escolha um atributo)</label>
          ${select('plus2', ABILITIES, state.atributos.plus2)}</div>
        <div class="field"><label>+1 da origem (escolha outro)</label>
          ${select('plus1', ABILITIES, state.atributos.plus1)}</div>
      </div>
    </div>`;

  const improvUI = improvLevelsAvailable().length ? `
    <div class="card">
      <h3>Aprimoramentos</h3>
      <p class="hint">Conforme sobe de nível (4º, 8º, 12º, 16º e 19º), você pode aumentar um atributo em +2 ou dois em +1 — ou escolher um Aprimoramento do Capítulo 5 (anote nos seus traços).</p>
      ${improvLevelsAvailable().map(lv => {
        const im = state.atributos.improvs[lv] || { mode: 'none', a: '', b: '' };
        return `<div class="grid4" style="align-items:end">
          <div class="field"><label>Nível ${lv}</label>${select('improv-mode-' + lv, ['none', '+2', '+1+1'].map(m => ({ value: m, label: m === 'none' ? 'Nenhum / Aprimoramento (Cap. 5)' : m })), im.mode)}</div>
          <div class="field"><label>Atributo 1</label>${select('improv-a-' + lv, ABILITIES, im.a, '—')}</div>
          <div class="field"><label>Atributo 2</label>${select('improv-b-' + lv, ABILITIES, im.b, '—')}</div>
          <div class="field"></div>
        </div>`;
      }).join('')}
    </div>` : '';

  const hpPreview = `<div class="stats-strip">
    <div class="stat"><div class="v">${maxHp()}</div><div class="l">PV máximo</div></div>
    <div class="stat"><div class="v">+${profBonus(state.nivel)}</div><div class="l">Bônus de proficiência</div></div>
    <div class="stat"><div class="v">${classeSel() ? 'd' + classeSel().hitDie : '—'}</div><div class="l">Dado de vida</div></div>
    <div class="stat"><div class="v">${mod(getAttrs().Constituição) > 0 ? '+' : ''}${mod(getAttrs().Constituição)}</div><div class="l">Mod. Constituição</div></div>
  </div>`;

  const html = `
    ${blockCard('Atributos', 'Etapa 5 · Força, Destreza, Constituição, Inteligência, Sabedoria, Carisma', 'Role os valores e distribua. Escolha onde aplicar o bônus da origem (\u00b12/\u00b11) e os aprimoramentos por nível.')}
    ${rollUI}
    ${hpPreview}
    ${improvUI}
    ${renderSalvaguardasSection()}
    ${renderPericiasSection()}
    ${navButtons(true, true)}`;
  $('#content').innerHTML = html;
};

/* ---- 6 · Heranças ---- */
STEPS[6].render = function () {
  const od = origemData();
  const max = state.origem === 'runinata' ? 0 : (od ? od.herancaPoints : 2);
  const spent = state.herancas.length;
  const all = D.herancas;
  const variantes = all.variantes || [];

  if (state.origem === 'runinata') {
    $('#content').innerHTML = `
      ${blockCard('Heranças', 'Etapa 6 · Personalização', 'Runinatas')}
      <div class="alert alert-info">Um <strong>Runinata</strong> não usa pontos de herança: em vez disso, usa Traços Menores e Maiores definidos com o Mestre (equivalente a 6 Menores e 4 Maiores), com pontos de Origem e desvantagens opcionais.
        <details class="desc"><summary>Traços disponíveis</summary><div class="body">${origemData().traits.map(t => `<strong>${t.name}</strong> — ${t.description}<br>`).join('')}</div></details>
      </div>
      <div class="field"><label>Traços do Runinata (anote com o Mestre)</label><textarea id="runinata-tracos" rows="6"></textarea></div>
      ${navButtons(true, true)}`;
    return;
  }

  const html = `
    ${blockCard('Heranças', 'Etapa 6 · Personalização', 'Gaste seus pontos de herança para comprar talentos, dons e especialidades.')}
    <div class="spend-bar">
      <div class="spend-track"><div class="spend-fill" style="width:${max ? (spent / max) * 100 : 100}%"></div></div>
      <div class="spend-label">${spent} de ${max} ponto${max !== 1 ? 's' : ''} gasto(s) ${spent > max ? '<b style="color:var(--red)">— excedeu o limite!</b>' : ''}</div>
    </div>
    ${state.herancas.length ? `<div class="card"><h3>Selecionadas</h3><div class="chips">${state.herancas.map(h => `<span class="chip chip-accent">${esc(h)} <span class="x" data-rm-heranca="${esc(h)}">×</span></span>`).join('')}</div></div>` : ''}
    <div class="field"><label>Buscar</label><input type="search" id="heranca-search" placeholder="Filtrar pelo nome..."><div class="hint">Algumas heranças têm pré-requisitos e são apenas de criação ou de região — a descrição indica.</div></div>
    <div class="card">
      <h3>Heranças</h3>
      <div class="heranca-list">${all.herancas.map(h => herancaLinha(h, spent >= max)).join('')}</div>
    </div>
    <div class="card">
      <h3>Heranças Variantes</h3>
      <p class="hint">Variações genéticas (ou de modelo) dentro de uma origem; também custam pontos de herança.</p>
      <div class="grid2">${variantes.map(v => herancaCardVariante(v, spent >= max)).join('')}</div>
    </div>
    ${navButtons(true, true)}`;
  $('#content').innerHTML = html;

  const list = $('#content .heranca-list');
  if (list) $('#heranca-search').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    $$('.heranca-item', list).forEach(el => {
      el.style.display = el.dataset.search.includes(q) ? '' : 'none';
    });
  });
};
function herancaLinha(h, full) {
  const sel = state.herancas.includes(h.name);
  return `<div class="heranca-item" data-search="${esc(h.name.toLowerCase())}">
    <details class="desc"><summary>${sel ? '✓ ' : ''}${esc(h.name)} <small>· ${h.cost} pt${h.restrictions ? ' · ' + esc(h.restrictions) : ''}</small></summary>
      <div class="body"><strong>Pré-requisito:</strong> ${esc(h.prerequisite || 'nenhum')}<br>${esc(h.description)}</div>
    </details>
    <button class="btn btn-sm ${sel ? 'btn-danger' : ''}" data-add-heranca="${esc(h.name)}" ${full && !sel ? 'disabled' : ''}>${sel ? 'Remover' : 'Adicionar'}</button>
  </div>`;
}
function herancaCardVariante(v, full) {
  const sel = state.herancas.includes(v.name);
  return `<div class="opt-card"><input type="checkbox" id="hv-${esc(v.name)}" ${sel ? 'checked' : ''} ${full && !sel ? 'disabled' : ''} data-toggle-heranca="${esc(v.name)}">
    <label for="hv-${esc(v.name)}"><span class="opt-name">${esc(v.name)} <span class="opt-tag">variante</span></span>
    <div class="opt-desc">${esc(v.description)}</div></label></div>`;
}

/* ---- 7 · Runas ---- */
STEPS[7].render = function () {
  const maxRunas = runasMax();
  const pulses = D.runas.pulsosRunicos || [];
  const html = `
    ${blockCard('Runas — Natureza Rúnica', 'Etapa 7 · Runas', 'Todo personagem de 1º nível escolhe uma Natureza Rúnica: um Pulso Rúnico e uma Runa ou Runessência inicial.')}
    <div class="card">
      <div class="card-title-row"><h3>Pulso Rúnico</h3></div>
      <div class="grid2">${pulses.map(p => `<div class="opt-card">
        <input type="radio" name="pulso" value="${esc(p.name)}" id="pulso-${esc(p.name)}" ${state.pulsoRunico === p.name ? 'checked' : ''} data-opt-one>
        <label for="pulso-${esc(p.name)}"><span class="opt-name">${esc(p.name)} <span class="opt-tag">${esc(p.damageType)}</span></span>
        <div class="opt-desc">${esc(p.effect)}</div></label></div>`).join('')}
      </div>
    </div>
    <div class="card">
      <div class="card-title-row"><h3>Runas e Runessências</h3><small>você pode escolher ${maxRunas} (nível ${state.nivel})</small></div>
      <div class="chips">${state.runas.map(r => `<span class="chip chip-accent">${esc(r)} <span class="x" data-rm-runa="${esc(r)}">×</span></span>`).join('')}</div>
      <p class="hint" style="margin-top:10px">A maestria de runas aumenta nos níveis 3, 5, 10, 12, 17 e 19; novas runas nos níveis 8 e 15.</p>
      <div class="field"><label>Buscar</label><input type="search" id="runa-search" placeholder="Filtrar..."></div>
      <table class="tbl">
        <thead><tr><th>Nome</th><th>Tipo</th><th>Pré-requisito</th><th>Efeito</th><th></th></tr></thead>
        <tbody id="runa-body">
        </tbody>
      </table>
    </div>
    ${navButtons(true, true)}`;
  $('#content').innerHTML = html;
  renderRunaTable('');
  $('#runa-search').addEventListener('input', e => renderRunaTable(e.target.value.trim().toLowerCase()));
};
function renderRunaTable(q) {
  const body = $('#runa-body');
  if (!body) return;
  const full = state.runas.length >= runasMax();
  const rowsRunas = (D.runas.runas || []).filter(r => !q || r.name.toLowerCase().includes(q));
  const rowsEss = (D.runas.runessencias || []).filter(r => !q || r.name.toLowerCase().includes(q));
  body.innerHTML = [...rowsRunas.map(r => `<tr>
      <td><strong>${esc(r.name)}</strong></td><td><small>Runa</small></td>
      <td><small>${esc(r.prerequisite || '—')}</small></td>
      <td><small>${esc(r.effect)}</small></td>
      <td><button class="btn btn-sm ${state.runas.includes(r.name) ? 'btn-danger' : ''}" data-toggle-runa="${esc(r.name)}" ${full && !state.runas.includes(r.name) ? 'disabled' : ''}>${state.runas.includes(r.name) ? 'Remover' : 'Adicionar'}</button></td>
    </tr>`),
    ...rowsEss.map(r => `<tr>
      <td><strong>${esc(r.name)}</strong></td><td><small>Runessência</small></td>
      <td><small>${esc(r.prerequisite || '—')}</small></td>
      <td><small>${esc(r.effect)}</small></td>
      <td><button class="btn btn-sm ${state.runas.includes(r.name) ? 'btn-danger' : ''}" data-toggle-runa="${esc(r.name)}" ${full && !state.runas.includes(r.name) ? 'disabled' : ''}>${state.runas.includes(r.name) ? 'Remover' : 'Adicionar'}</button></td>
    </tr>`)].join('');
}

/* ---- 8 · Personalidade & Passado ---- */
STEPS[8].render = function () {
  const essa = D.detalhamento.essencias || [];
  const essencias = essa.filter(e => e.type === 'essencia');
  const personalidades = essa.filter(e => e.type === 'personalidade');
  const html = `
    ${blockCard('Personalidade, Essência e Passado', 'Etapa 8 · Detalhamento', 'Defina as crenças, o comportamento e o passado do personagem.')}
    <div class="card">
      <h3>Essência</h3>
      <p class="hint">Suas crenças centrais.</p>
      <div class="grid3">${essencias.map(e => `<div class="opt-card">
        <input type="radio" name="essencia" value="${esc(e.name)}" id="es-${esc(e.name)}" ${state.essencia === e.name ? 'checked' : ''} data-opt-one>
        <label for="es-${esc(e.name)}"><span class="opt-name">${esc(e.name)}</span><div class="opt-desc">${esc(e.description)}</div></label>
      </div>`).join('')}</div>
    </div>
    <div class="card">
      <h3>Personalidade / Comportamento</h3>
      <div class="grid3">${personalidades.map(e => `<div class="opt-card">
        <input type="radio" name="personalidade" value="${esc(e.name)}" id="ps-${esc(e.name)}" ${state.personalidade === e.name ? 'checked' : ''} data-opt-one>
        <label for="ps-${esc(e.name)}"><span class="opt-name">${esc(e.name)}</span><div class="opt-desc">${esc(e.description)}</div></label>
      </div>`).join('')}</div>
    </div>
    <div class="card">
      <h3>Passado</h3>
      <p class="hint">Escolha um passado: ele concede perícias, ofícios, idiomas, equipamento e uma característica.</p>
      <div class="grid2">${D.detalhamento.passados.map(p => `<div class="opt-card">
        <input type="radio" name="passado" value="${esc(p.name)}" id="pas-${esc(p.name)}" ${state.passado === p.name ? 'checked' : ''} data-opt-one>
        <label for="pas-${esc(p.name)}"><span class="opt-name">${esc(p.name)}</span>
        <div class="opt-desc"><strong>Perícias:</strong> ${(p.skills || []).join(', ') || '—'}<br>
        <strong>Ofícios:</strong> ${(p.tools || []).join(', ') || '—'}<br>
        <strong>Idiomas:</strong> ${(p.languages || []).join(', ') || '—'}</div></label>
      </div>`).join('')}</div>
      ${passadoData() ? `<div class="alert alert-info"><strong>${esc(passadoData().feature ? passadoData().feature.name : '')}</strong> — ${esc(passadoData().feature ? passadoData().feature.description : '')}</div>
        <div class="chips">${(passadoData().equipment || []).map(e => `<span class="chip">${esc((e.qty > 1 ? e.qty + '× ' : '') + e.name)}</span>`).join('')}</div>` : ''}
    </div>
    ${navButtons(true, true)}`;
  $('#content').innerHTML = html;
};

/* ---- 9 · Detalhes ---- */
STEPS[9].render = function () {
  const langs = D.detalhamento.idiomas || [];
  const knowLangs = languagesEfetivas();
  const rowAltura = (D.detalhamento.detalhesPersonagem.alturaPesoAleatorios || []).find(r => {
    const o = origemData() ? origemData().name : '';
    const v = state.origemVariante ? o + ' - ' + state.origemVariante : o;
    return r.origin === (v || o);
  }) || null;
  const html = `
    ${blockCard('Descrição do Personagem', 'Etapa 9 · Detalhamento', 'Aparência física, dados pessoais, idiomas e estilo de vida.')}
    <div class="card">
      <h3>Dados físicos</h3>
      <div class="grid3">
        <div class="field"><label>Sexo / Gênero</label><input type="text" id="d-sexo" class="d-field" value="${esc(state.detalhes.sexo)}"></div>
        <div class="field"><label>Idade</label><input type="text" id="d-idade" class="d-field" value="${esc(state.detalhes.idade)}"></div>
        <div class="field"><label>Estilo de vida</label>${select('d-estilo', D.equipamento.estiloDeVida.map(e => ({ value: e.name, label: e.name + ' — ' + e.cost })), state.detalhes.estiloVida, '—', true)}</div>
      </div>
      <div class="grid2">
        <div class="field"><label>Altura ${rowAltura ? `<small>(${rowAltura.alturaBase} ${rowAltura.modAltura})</small>` : ''}</label>
          <div style="display:flex;gap:8px"><input type="text" id="d-altura" class="d-field" value="${esc(state.detalhes.altura)}">
            ${rowAltura ? `<button class="btn btn-sm" id="btn-altura" data-random="altura">Sortear</button>` : ''}</div>
        </div>
        <div class="field"><label>Peso ${rowAltura ? `<small>(${rowAltura.pesoBase} ${rowAltura.modPeso})</small>` : ''}</label>
          <div style="display:flex;gap:8px"><input type="text" id="d-peso" class="d-field" value="${esc(state.detalhes.peso)}">
            ${rowAltura ? `<button class="btn btn-sm" id="btn-peso" data-random="peso">Sortear</button>` : ''}</div>
        </div>
      </div>
      <div class="grid3">
        <div class="field"><label>Pele</label><input type="text" id="d-pele" class="d-field" value="${esc(state.detalhes.pele)}"></div>
        <div class="field"><label>Cabelo</label><input type="text" id="d-cabelo" class="d-field" value="${esc(state.detalhes.cabelo)}"></div>
        <div class="field"><label>Olhos</label><input type="text" id="d-olhos" class="d-field" value="${esc(state.detalhes.olhos)}"></div>
      </div>
      <div class="field"><label>Outras marcas (tatuagens, cicatrizes, traços mágicos)</label><input type="text" id="d-marcas" class="d-field" value="${esc(state.detalhes.marcas)}"></div>
    </div>
    <div class="card">
      <h3>Idiomas</h3>
      <div class="chips">${knowLangs.map(l => `<span class="chip chip-accent">${esc(l)}</span>`).join('') || '<span class="chip">nenhum</span>'}</div>
      <p class="hint">Adicione idiomas conhecidos (de heranças, passado, origem ou aprendidos):</p>
      <div class="field"><label>Idioma extra</label><select id="add-idioma"><option value="">— escolha —</option>
        ${langs.map(l => `<option value="${esc(l.name)}">${esc(l.name)}${l.script ? ' · ' + esc(l.script) : ''}${l.note ? ' — ' + esc(l.note.split('.')[0]) : ''}</option>`).join('')}
      </select></div>
      <div class="chips" id="idiomas-extra">${state.idiomasExtras.map(l => `<span class="chip">${esc(l)} <span class="x" data-rm-idioma="${esc(l)}">×</span></span>`).join('')}</div>
    </div>
    ${navButtons(true, true)}`;
  $('#content').innerHTML = html;
};

function randomAlturaPeso() {
  const od = origemData(); if (!od) return null;
  const v = state.origemVariante ? od.name + ' - ' + state.origemVariante : od.name;
  const row = (D.detalhamento.detalhesPersonagem.alturaPesoAleatorios || []).find(r => r.origin === v) ||
    (D.detalhamento.detalhesPersonagem.alturaPesoAleatorios || []).find(r => r.origin === od.name) || null;
  if (!row) return null;
  const extra = parseDice(row.modAltura);
  const cmA = Number(row.alturaBase.replace(' cm', '')) + extra;
  const frac = extra * (parseDice(row.modPeso) / 5);
  const kg = Math.round((Number(row.pesoBase.replace(' kg', '')) + frac) * 10) / 10;
  return { altura: (cmA / 100).toFixed(2).replace('.', ',') + ' m', peso: kg.toFixed(1).replace('.', ',') + ' kg', extra };
}

/* ---- 10 · Equipamento ---- */
STEPS[10].render = function () {
  const c = classeSel();
  const auto = equipamentosAutomaticos();
  const attrs = getAttrs();
  const dexMod = mod(attrs.Destreza);
  const armor = D.equipamento.armaduras.find(a => a.name === state.equip.armadura) || null;
  const shield = D.equipamento.escudos.find(s => s.name === state.equip.escudo) || null;

  let baseCA = 10 + dexMod;
  let rd = 0;
  let caNote = 'sem armadura (10 + DES)';
  if (armor) {
    const dexAc = armor.category === 'Pesada' ? 0 : Math.min(dexMod, armor.maxDex != null ? armor.maxDex : 99);
    baseCA = armor.baseAC + dexAc;
    rd = armor.rd || 0;
    caNote = `${armor.name} (+${dexAc} DES)`;
  }
  // armadura natural do Construto
  if (state.origem === 'construto') {
    const construtoInf = origemData().traits.find(t => t.name === 'Proteção Ajustável');
    if (!armor) baseCA = 10 + dexMod;
  }
  if (state.origem === 'bruto' && !armor && false) { /* defesa sem armadura caso especial */ }
  if (!armor && state.classe === 'bruto') { baseCA = 10 + dexMod + mod(attrs.Constituição); caNote = 'Defesa sem Armadura (10 + DES + CON)'; }
  let shieldNote = '';
  if (shield) { baseCA += shield.acBonus; rd += shield.rd || 0; shieldNote = ` +${shield.acBonus} (${shield.name})`; }
  if (armor && armor.category && armor.category !== 'Leve' && armor.category !== 'Média' && armor.category !== 'Pesada') { /* noop */ }

  const html = `
    ${blockCard('Equipamento', 'Etapa 10 · Equipamento', 'Seu equipamento inicial é fornecido pela classe e pelo passado. Você pode adicionar itens extras manualmente.')}
    <div class="stats-strip">
      <div class="stat"><div class="v">${baseCA}</div><div class="l">Classe de Armadura</div></div>
      <div class="stat"><div class="v">${rd}</div><div class="l">Redução de Dano</div></div>
      <div class="stat"><div class="v">${mod(attrs.Destreza)}</div><div class="l">Iniciativa</div></div>
      <div class="stat"><div class="v">${origemData() ? origemData().speed : '—'}</div><div class="l">Deslocamento</div></div>
    </div>
    <div class="card">
      <h3>Equipamento inicial (classe + passado)</h3>
      <div class="chips">${auto.map(i => `<span class="chip">${esc(i)}</span>`).join('') || '<span class="chip">—</span>'}</div>
      <p class="hint">${esc(D.equipamento.riqueza.note)}</p>
    </div>
    <div class="card">
      <h3>Armadura e Escudo</h3>
      <div class="grid2">
        <div class="field"><label>Armadura</label>${select('armadura', D.equipamento.armaduras.map(a => ({ value: a.name, label: `${a.name} (CA ${a.baseAC}${a.maxDex != null ? '+DES até ' + a.maxDex : ''} · RD ${a.rd} · ${a.category})` })), state.equip.armadura, 'Sem armadura', true)}</div>
        <div class="field"><label>Escudo</label>${select('escudo', D.equipamento.escudos.map(s => ({ value: s.name, label: `${s.name} (+${s.acBonus} CA)` })), state.equip.escudo, 'Sem escudo', true)}</div>
      </div>
      ${armor && armor.strengthReq && getAttrs().Força < armor.strengthReq ? `<div class="alert alert-warn">Força insuficiente para ${armor.name}: você sofre as penalidades da armadura (redução de 10 pés no deslocamento e desvantagens).</div>` : ''}
      <p class="hint">Cálculo: CA base = ${armor ? armor.baseAC : '10'}${armor && armor.category !== 'Pesada' ? ' + modificador de Destreza (' + dexMod + ')' : ''}${shield ? ' + escudo (' + shield.acBonus + ')' : ''}${armor ? ' · RD ' + armor.rd : ''}</p>
    </div>
    <div class="card">
      <h3>Armas <small>/ armas naturais</small></h3>
      <div class="field"><label>Adicionar arma</label>
        ${select('add-arma', D.equipamento.armas.map(a => ({ value: `${a.name}|${a.damage}|${a.type}|${a.damageType}`, label: `${a.name} — ${a.damage} ${a.damageType} (${a.type})` })), '', '— escolha —', true)}</div>
      <table class="tbl">
        <thead><tr><th>Arma</th><th>Dano</th><th>Atributo</th><th>Bônus ataque</th><th>Dano final</th><th></th></tr></thead>
        <tbody>
          ${(['chifres|1d6|Melee|Perfurante', 'mordida|1d6|Melee|Perfurante', 'garras|1d4|Melee|Cortante', 'desarmado|1|Melee|Contundente'].map(w => {
            const [n, dmg, type, dmgT] = w.split('|');
            return { name: n + ' (natural)', damage: dmg, type, damageType: dmgT };
          })).concat(state.equip.armas.map(a => {
            const parts = a.split('|');
            return { name: parts[0], damage: parts[1] || '', type: parts[2] || 'Melee', damageType: parts[3] || '' };
          })).map(a => {
            const strMod = mod(attrs.Força), dexA = mod(attrs.Destreza);
            const isMelee = /corpo|melee/i.test(a.type);
            const hasAcuc = false;
            const atk = profBonus(state.nivel) + (isMelee ? strMod : dexA);
            return `<tr>
              <td>${esc(a.name)}</td>
              <td>${esc(a.damage)} ${esc(a.damageType)}</td>
              <td><small>${isMelee ? 'Força' : 'Destreza'}</small></td>
              <td><span class="mod-badge">${atk > 0 ? '+' : ''}${atk}</span></td>
              <td>${esc(a.damage)}${isMelee ? ' + ' + strMod : ' + ' + dexA} ${esc(a.damageType)}</td>
              <td><button class="btn btn-sm btn-danger" data-rm-arma="${esc(a.name)}">×</button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      <details class="desc"><summary>Como calcular ataques</summary><div class="body">O ataque usa 1d20 + bônus de proficiência (se proficiente) + modificador de Força (corpo a corpo) ou Destreza (à distância). Armas com <strong>acudiade</strong> podem usar Destreza e armas com <strong>arremesso</strong> podem usar Força — ajuste conforme a sua arma.</div></details>
    </div>
    <div class="card">
      <h3>Itens adicionais</h3>
      <div class="grid2">
        <div class="field"><label>Conjunto de aventureiro</label>${select('add-conjunto', D.equipamento.conjuntos.map(a => ({ value: a.name, label: `${a.name} — ${a.cost}` })), state.equip.conjuntos[0] || '', '— nenhum —', true)}</div>
        <div class="field"><label>Outros itens / riquezas (texto livre)</label><input type="text" id="add-outros" placeholder="Ex.: 8 PO, tochas..."></div>
      </div>
      ${state.equip.conjuntos.length ? `<div class="chips">${state.equip.conjuntos.map(cn => {
        const cj = D.equipamento.conjuntos.find(x => x.name === cn);
        return `<span class="chip chip-accent">${esc(cn)}: ${esc((cj ? cj.contents : []).join(', '))} <span class="x" data-rm-conjunto="${esc(cn)}">×</span></span>`;
      }).join('')}</div>` : ''}
      ${state.equip.outros.filter(Boolean).length ? `<div class="chips">${state.equip.outros.map(o => `<span class="chip">${esc(o)} <span class="x" data-rm-outro="${esc(o)}">×</span></span>`).join('')}</div>` : ''}
    </div>
    <div class="card">
      <h3>Magias (se conjurador)</h3>
      ${classeSel() && classeSel().spellcasting ? `
        <div class="field"><label>Truques conhecidos</label><input type="text" id="m-truques" value="${esc(state.magias.truques)}" placeholder="Separe por vírgula"></div>
        <div class="field"><label>Magias conhecidas / preparadas</label><textarea id="m-magias" rows="4" placeholder="Nome da magia · nível ... separadas por linha">${esc(state.magias.conhecidas)}</textarea></div>
        <p class="hint">${classeSel().spellcasting.focusDescription ? esc(classeSel().spellcasting.focusDescription) : ''}</p>
      ` : `<p class="hint">${esc(classeSel() ? classeSel().name + ' não conjura magias (ou acrescente as magias concedidas por heranças/subclasses nas anotações).' : '—')}</p>`}
      ${state.subclasse && classeSel() && classeSel().subclass ? collectRiteSpells() : ''}
    </div>
    <div class="card">
      <h3>Notas / traços adicionais da ficha</h3>
      <textarea id="ficha-notas" rows="4" placeholder='Anote características vindas de subclasses, mistérios, ires, técnicas, metas sem suporte direto...'>${esc(state.notas)}</textarea>
    </div>
    ${navButtons(true, true)}`;
  $('#content').innerHTML = html;
};

function collectRiteSpells() {
  const c = classeSel();
  const rite = ((c && c.subclass && c.subclass.options) || []).find(o => o.name === state.subclasse);
  if (!rite) return '';
  const all = rite.spells || [];
  const avail = all.filter(s => s.level <= state.nivel);
  if (!avail.length) return '<p class="hint">As magias do rito são concedidas nos níveis 1, 3, 5, 7 e 9 da classe.</p>';
  return `<p class="note"><strong>Magias de ${esc(rite.name)}:</strong> ${avail.map(s => `${esc(s.name)} (${s.level === 0 ? 'truque' : s.level + 'º'})`).join(', ')}${avail.length < all.length ? ' — próximas em ' + all.filter(s => s.level > state.nivel).map(s => s.level + 'º').join(', ') : ''}.</p>`;
}

/* ---- 11 · Revisão ---- */
STEPS[11].render = function () {
  const c = classeSel(), od = origemData(), rd = D.regioes[state.regiao], pd = passadoData();
  const attrs = getAttrs();
  const spells = collectSpellSummary();
  const html = `
    ${blockCard('Revisão', 'Etapa 11 · Conferência final', 'Confira o resumo completo do personagem antes de gerar a ficha.')}
    <div class="stats-strip">
      <div class="stat"><div class="v">${maxHp()}</div><div class="l">PV</div></div>
      <div class="stat"><div class="v">+${profBonus(state.nivel)}</div><div class="l">Proficiência</div></div>
      <div class="stat"><div class="v">${state.nivel}</div><div class="l">Nível</div></div>
      <div class="stat"><div class="v">${c ? 'd' + c.hitDie : '—'}</div><div class="l">Dado de vida</div></div>
    </div>
    <div class="card">
      <h3>${esc(state.nome || 'Sem nome')}</h3>
      <ul class="small-pad">
        <li><strong>Origem:</strong> ${od ? esc(od.name) : '—'}${state.origemVariante ? ' (' + esc(state.origemVariante) + ')' : ''}</li>
        <li><strong>Região:</strong> ${rd ? esc(rd.name) : '—'}</li>
        <li><strong>Classe:</strong> ${c ? esc(c.name) : '—'}${state.subclasse ? ' — ' + esc(state.subclasse) : ''} (nível ${state.nivel})</li>
        <li><strong>Passado:</strong> ${pd ? esc(pd.name) : '—'}</li>
        <li><strong>Essência:</strong> ${esc(state.essencia || '—')} · <strong>Personalidade:</strong> ${esc(state.personalidade || '—')}</li>
        <li><strong>Heranças (${state.herancas.length}):</strong> ${state.herancas.length ? state.herancas.map(esc).join(', ') : '—'}</li>
        <li><strong>Natureza Rúnica:</strong> ${esc(state.pulsoRunico || '—')} · Runas: ${state.runas.length ? state.runas.map(esc).join(', ') : '—'}</li>
        <li><strong>Idiomas:</strong> ${languagesEfetivas().join(', ') || '—'}</li>
        <li><strong>Perícias:</strong> ${[...skillsEfetivas()].filter(Boolean).join(', ') || '—'}</li>
      </ul>
      <p class="hint">${spells ? spells : ''}</p>
    </div>
    <div class="alert alert-info">Pronto para gerar a ficha? Clique em <strong>Gerar Ficha</strong> — depois use "Imprimir / Salvar PDF" para exportar.</div>
    <div class="nav-row">
      <button class="btn" data-nav="prev">← Anterior</button>
      <div class="right">
        <button class="btn btn-ghost" data-action="reset">Reiniciar</button>
        <button class="btn btn-primary" data-action="sheet">Gerar Ficha</button>
      </div>
    </div>`;
  $('#content').innerHTML = html;
};

function collectSpellSummary() {
  const c = classeSel();
  if (!c || !c.spellcasting) return '';
  const row = (c.levelTable || []).find(l => Number(l.level) === Number(state.nivel));
  const mana = manaAtLevel();
  const parts = [];
  if (c.spellcasting.attribute) parts.push('Atributo de conjuração: ' + c.spellcasting.attribute);
  if (mana != null) parts.push('Mana: ' + mana);
  if (c.spellcasting.cantripsKnown && c.spellcasting.cantripsKnown[state.nivel]) parts.push('Truques: ' + c.spellcasting.cantripsKnown[state.nivel]);
  if (c.spellcasting.spellsKnown && c.spellcasting.spellsKnown[state.nivel]) parts.push('Magias conhecidas: ' + c.spellcasting.spellsKnown[state.nivel]);
  if (row && row.maxSpellLevel) parts.push('Nível máx. de magia: ' + row.maxSpellLevel);
  if (c.spellcasting.arcanaPoints && c.spellcasting.arcanaPoints[state.nivel]) parts.push('Pontos de Arcana: ' + c.spellcasting.arcanaPoints[state.nivel]);
  if (c.spellcasting.preparedFormula) parts.push('Preparação: ' + c.spellcasting.preparedFormula);
  return parts.join(' · ');
}

/* ============================================================
   FICHA
   ============================================================ */

function renderSheet() {
  const c = classeSel(), od = origemData(), rd = D.regioes[state.regiao], pd = passadoData();
  const attrs = getAttrs();
  const pb = profBonus(state.nivel);
  const mana = manaAtLevel();
  const spellsRow = (c && c.levelTable ? c.levelTable.find(l => Number(l.level) === Number(state.nivel)) : null) || {};
  const armor = D.equipamento.armaduras.find(a => a.name === state.equip.armadura) || null;
  const shield = D.equipamento.escudos.find(s => s.name === state.equip.escudo) || null;
  const dexMod = mod(attrs.Destreza);

  let baseCA = 10 + dexMod, rdTotal = 0, caNote = '10' + (dexMod !== 0 ? (dexMod > 0 ? '+' : '') + dexMod + ' (DES)' : ' (DES)');
  if (armor) {
    const dexAc = armor.category === 'Pesada' ? 0 : Math.min(dexMod, armor.maxDex != null ? armor.maxDex : 99);
    baseCA = armor.baseAC + dexAc; rdTotal = armor.rd || 0;
    caNote = `${armor.baseAC}${dexAc ? '+' + dexAc : ''} (${armor.name})`;
  }
  if (!armor && state.classe === 'bruto') { baseCA = 10 + dexMod + mod(attrs.Constituição); caNote = '10+DES+CON'; }
  if (state.origem === 'construto' && !armor) { baseCA = 10 + dexMod; caNote = '10+DES (construto)'; }
  if (shield) { baseCA += shield.acBonus; rdTotal += shield.rd || 0; caNote += ` +${shield.acBonus} (${shield.name})`; }

  const armas = state.equip.armas.map(a => {
    const parts = a.split('|');
    const isMelee = /corpo|melee/i.test(parts[2]);
    const atkMod = isMelee ? mod(attrs.Força) : mod(attrs.Destreza);
    return { name: parts[0], dmg: parts[1], type: parts[2], dmgType: parts[3], atk: pb + atkMod, dmod: atkMod };
  });

  const salv = ABILITIES.map(a => {
    const clsProf = (c && c.savingThrows || []).some(x => x === a || (x.includes(' ou ') && x.split(' ou ').includes(a)));
    const prof = clsProf || !!state.salvaguardas[a];
    return { a, val: mod(attrs[a]) + (prof ? pb : 0), prof };
  });

  const riteSpells = (state.subclasse && c && c.subclass && c.subclass.options || []).find(o => o.name === state.subclasse);

  const html = `
  <div class="sheet">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px">
      <div>
        <h1>${esc(state.nome || 'Ficha de Personagem')}</h1>
        <div class="sub">${esc(state.conceito || '')}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:24pt;font-weight:800;color:#4b3a9e">${state.nivel}</div>
        <div style="font-size:8pt;text-transform:uppercase;letter-spacing:1px;color:#666">Nível</div>
      </div>
    </div>

    <div class="hdr-band">
      <div class="kv"><b>Classe</b><div class="kv-value">${esc(c ? c.name : '—')}${state.subclasse ? ' · ' + esc(state.subclasse) : ''}</div></div>
      <div class="kv"><b>Origem</b><div class="kv-value">${esc(od ? od.name : '—')}${state.origemVariante ? ' (' + esc(state.origemVariante) + ')' : ''}</div></div>
      <div class="kv"><b>Região</b><div class="kv-value">${esc(rd ? rd.name : '—')}</div></div>
      <div class="kv"><b>Passado</b><div class="kv-value">${esc(pd ? pd.name : '—')}</div></div>
      <div class="kv"><b>Bônus de Proficiência</b><div class="kv-value">+${pb}</div></div>
    </div>

    <div class="grid3" style="margin-top:14px">
      <div class="ab-score"><div class="ab-name">PV Máximo</div><div class="ab-mod">${maxHp()}</div><div class="ab-note">d${c ? c.hitDie : '?'} + CON${od && state.origem === 'minotauro' ? ' + Minotauro' : ''}</div></div>
      <div class="ab-score"><div class="ab-name">Classe de Armadura</div><div class="ab-mod">${baseCA}</div><div class="ab-note">${esc(caNote)}</div></div>
      <div class="ab-score"><div class="ab-name">Redução de Dano</div><div class="ab-mod">${rdTotal}</div><div class="ab-note">armadura + escudo</div></div>
      <div class="ab-score"><div class="ab-name">Iniciativa</div><div class="ab-mod">${modStr(attrs.Destreza)}</div><div class="ab-note">mod DES</div></div>
      <div class="ab-score"><div class="ab-name">Deslocamento</div><div class="ab-mod">${od ? od.speed : '—'}</div><div class="ab-note">pés</div></div>
      <div class="ab-score"><div class="ab-name">Mana</div><div class="ab-mod">${mana != null ? mana : '—'}</div><div class="ab-note">${od && state.origem === 'chireanos' ? '+ Energia/' : ''}ponto de mana</div></div>
    </div>

    <h2>Atributos</h2>
    <div class="grid3">
      ${ABILITIES.map(a => {
        const v = attrs[a];
        return `<div class="ab-score"><div class="ab-name">${a}</div><div class="ab-mod">${modStr(v)}</div><div class="ab-val">${v}</div></div>`;
      }).join('')}
    </div>

    <table style="margin-top:8px"><tr>
      <td style="width:50%">
        <h3>Salvaguardas</h3>
        <table class="no-border">
          ${salv.map(s => `<tr><td>Salvaguarda de ${s.a}</td><td style="text-align:right;font-weight:800">${s.prof ? '●' : '○'} ${modStr(s.val)}</td></tr>`).join('')}
        </table>
      </td>
      <td>
        <h3>Perícias <span class="note">(mod + ${pb} se proficiente)</span></h3>
        <table class="no-border">
          ${[...skillsEfetivas()].filter(Boolean).sort().map(s => {
            const total = mod(attrs[SKILL_ABILITY[s] || 'Inteligência']) + pb;
            return `<tr><td>${esc(s)} <span class="note">(${SKILL_ABILITY[s] || ''})</span></td><td style="text-align:right;font-weight:800">${modStr(total)}</td></tr>`;
          }).join('')}
        </table>
      </td>
    </tr></table>

    <h2>Combate</h2>
    <table>
      <tr><th>Arma</th><th>Bônus</th><th>Dano</th></tr>
      ${armas.map(w => `<tr><td>${esc(w.name)}</td><td>+${w.atk}</td><td>${esc(w.dmg)}${w.dmod ? ' + ' + w.dmod : ''} ${esc(w.dmgType || '')}</td></tr>`).join('')}
      <tr><td><em>Golpe sem arma / natural (ex.: chifres, garras)</em></td><td>+${pb + mod(attrs.Força)}</td><td>1 + ${mod(attrs.Força)}</td></tr>
    </table>

    <h2>Runas</h2>
    <table>
      <tr><th>Pulso Rúnico</th><td colspan="2">${esc(state.pulsoRunico || '—')}</td></tr>
      <tr><th>Runas / Runessências</th><td colspan="2">${state.runas.length ? state.runas.map(esc).join(', ') : '—'}</td></tr>
    </table>

    <h2>Traços e Características</h2>
    <div class="col2">
      <ul>
        <li><strong>Origem — ${esc(od ? od.name : '—')}:</strong> ${(od ? od.traits : []).map(t => `${esc(t.name)} (${esc(t.description)})`).join('; ') || '—'}</li>
        <li><strong>Heranças:</strong> ${state.herancas.length ? state.herancas.map(esc).join('; ') : '—'}</li>
        ${(c ? c.features.filter(f => Number(f.level) <= state.nivel) : []).map(f => `<li><strong>Nível ${f.level} — ${esc(f.name)}:</strong> ${esc(f.description)}</li>`).join('')}
        ${pd && pd.feature ? `<li><strong>Passado — ${esc(pd.name)}:</strong> ${esc(pd.feature.name)} — ${esc(pd.feature.description)}</li>` : ''}
        ${state.origem === 'runinata' ? '<li><em>Runinata: descreva os traços de origem combos com o Mestre.</em></li>' : ''}
        ${state.notas ? `<li>${esc(state.notas)}</li>` : ''}
        ${state.tecnicasNota ? `<li><strong>Técnicas de combate:</strong> ${esc(state.tecnicasNota)}</li>` : ''}
      </ul>
    </div>

    ${state.essencia || state.personalidade ? `<h2>Essência &amp; Personalidade</h2>
      <p><strong>Essência:</strong> ${esc(state.essencia || '—')} &nbsp;·&nbsp; <strong>Personalidade:</strong> ${esc(state.personalidade || '—')}</p>` : ''}

    <h2>Equipamento</h2>
    <div class="col2"><ul>
      ${equipamentosAutomaticos().map(i => `<li>${esc(i)}</li>`).join('')}
      ${state.equip.outros.filter(Boolean).map(o => `<li>${esc(o)}</li>`).join('')}
      ${state.equip.conjuntos.map(cn => { const cj = D.equipamento.conjuntos.find(x => x.name === cn); return `<li>${esc(cn)}${cj ? ' — ' + esc(cj.contents.join(', ')) : ''}</li>`; }).join('')}
    </ul></div>
    ${state.equip.armadura ? `<p class="note">Armadura: ${esc(state.equip.armadura)}${state.equip.escudo ? ' · Escudo: ' + esc(state.equip.escudo) : ''}</p>` : ''}

    ${c && c.spellcasting ? `
      <h2>Magias ${spellsRow.maxSpellLevel ? '· nível máx. ' + spellsRow.maxSpellLevel : ''} <span class="note">${esc(c.spellcasting.attribute + ' — CD ' + (8 + pb + mod(attrs[c.spellcasting.attribute])) + ' · ataque +' + (pb + mod(attrs[c.spellcasting.attribute])))}</span></h2>
      ${riteSpells && riteSpells.spells && riteSpells.spells.length ? `<p class="note"><strong>Magias de ${esc(state.subclasse)}:</strong> ${riteSpells.spells.map(s => `${s.name} (${s.level === 0 ? 'truque' : s.level + 'º'})`).join(', ')}</p>` : ''}
      <table class="no-border">
        <tr><td style="width:50%"><strong>Truques conhecidos (${c.spellcasting.cantripsKnown && c.spellcasting.cantripsKnown[state.nivel] || spellsRow.truques || '—'}):</strong><br>${esc(state.magias.truques || '—')}</td>
        <td><strong>Magias conhecidas/preparadas:</strong><br>${esc(state.magias.conhecidas || '—')}</td></tr>
      </table>
      <p class="note">Mana: ${mana != null ? mana : '—'} · custo = nível da magia · ${esc(c.spellcasting.ritualCasting ? 'Ritualista: sim · ' : '')}${esc(c.spellcasting.focusDescription || '')}</p>
    ` : ''}

    <h2>Detalhes</h2>
    <table class="no-border"><tr>
      <td><strong>Idiomas:</strong> ${languagesEfetivas().join(', ') || '—'}</td>
      <td><strong>Estilo de vida:</strong> ${esc(state.detalhes.estiloVida || '—')}</td>
    </tr></table>
    <table class="no-border"><tr>
      <td>Sexo: ${esc(state.detalhes.sexo || '—')}</td>
      <td>Idade: ${esc(state.detalhes.idade || '—')}</td>
      <td>Altura: ${esc(state.detalhes.altura || '—')}</td>
      <td>Peso: ${esc(state.detalhes.peso || '—')}</td>
    </tr></table>
    <table class="no-border"><tr>
      <td>Pele: ${esc(state.detalhes.pele || '—')}</td>
      <td>Cabelo: ${esc(state.detalhes.cabelo || '—')}</td>
      <td>Olhos: ${esc(state.detalhes.olhos || '—')}</td>
    </tr></table>
    ${state.detalhes.marcas ? `<p class="note"><strong>Marcas:</strong> ${esc(state.detalhes.marcas)}</p>` : ''}

    ${state.historia ? `<h2>História</h2><p style="font-size:9.5pt">${esc(state.historia)}</p>` : ''}
    ${state.nivel > 1 ? `<p class="note" style="margin-top:10px">Tabela de progressão de ${esc(c ? c.name : '')}: ${(c.levelTable || []).map(l => `${l.level}: ${(l.features || []).join(', ')}`).join(' | ')}</p>` : ''}
  </div>`;

  $('#sheet').innerHTML = html;
}
function showSheet() {
  renderSheet();
  $('#sheetWrap').classList.add('visible');
  $('.layout').style.display = 'none';
  $('.footer').style.display = 'none';
  window.scrollTo({ top: 0 });
}
function hideSheet() {
  $('#sheetWrap').classList.remove('visible');
  $('.layout').style.display = '';
  $('.footer').style.display = '';
}

/* ============================================================
   EVENTOS (delegação)
   ============================================================ */

function bindNav() {
  document.addEventListener('click', e => {
    const navBtn = e.target.closest('[data-nav]');
    if (navBtn) { persistCurrentStep(); go(currentStep + (navBtn.dataset.nav === 'next' ? 1 : -1)); return; }

    const goto = e.target.closest('[data-goto]');
    if (goto) { persistCurrentStep(); go(Number(goto.dataset.goto)); return; }

    const action = e.target.closest('[data-action]');
    if (action) {
      if (action.dataset.action === 'reset') { resetAll(); return; }
      if (action.dataset.action === 'sheet') { showSheet(); return; }
      if (action.dataset.action === 'back-to-wizard') { hideSheet(); return; }
      if (action.dataset.action === 'print-sheet') { window.print(); return; }
    }

    /* heranças */
    const addH = e.target.closest('[data-add-heranca]');
    if (addH) { toggleHeranca(addH.dataset.addHeranca); STEPS[6].render(); return; }
    const rmH = e.target.closest('[data-rm-heranca]');
    if (rmH) { toggleHeranca(rmH.dataset.rmHeranca); STEPS[6].render(); return; }
    const tgH = e.target.closest('[data-toggle-heranca]');
    if (tgH) { toggleHeranca(tgH.dataset.toggleHeranca, true); STEPS[6].render(); return; }

    /* runas */
    const tgR = e.target.closest('[data-toggle-runa]');
    if (tgR) { toggleRuna(tgR.dataset.toggleRuna); renderRunaTable($('#runa-search') ? $('#runa-search').value.trim().toLowerCase() : ''); return; }
    const rmR = e.target.closest('[data-rm-runa]');
    if (rmR) { toggleRuna(rmR.dataset.rmRuna); renderRunaTable($('#runa-search') ? $('#runa-search').value.trim().toLowerCase() : ''); return; }

    /* equipamento */
    const rmArma = e.target.closest('[data-rm-arma]');
    if (rmArma) { state.equip.armas = state.equip.armas.filter(a => !a.startsWith(rmArma.dataset.rmArma + '|')); save(); STEPS[10].render(); return; }
    const rmCj = e.target.closest('[data-rm-conjunto]');
    if (rmCj) { state.equip.conjuntos = state.equip.conjuntos.filter(x => x !== rmCj.dataset.rmConjunto); save(); STEPS[10].render(); return; }
    const rmOutro = e.target.closest('[data-rm-outro]');
    if (rmOutro) { const v = rmOutro.dataset.rmOutro; state.equip.outros = state.equip.outros.filter(o => o !== v); save(); STEPS[10].render(); return; }
    const rmIdioma = e.target.closest('[data-rm-idioma]');
    if (rmIdioma) { state.idiomasExtras = state.idiomasExtras.filter(l => l !== rmIdioma.dataset.rmIdioma); save(); STEPS[9].render(); return; }
  });

  document.addEventListener('input', e => {
    const el = e.target;
    /* rituais do passo 1 (conceito) */
    if (el.id === 'c-nome') { state.nome = el.value; save(); }
    if (el.id === 'c-conceito') { state.conceito = el.value; save(); }
    if (el.id === 'c-historia') { state.historia = el.value; save(); }
    if (el.id === 'regiao-notas') { state.regiaoNotas = el.value; save(); }
    if (el.id === 'tecnicas') { state.tecnicasNota = el.value; save(); }
    if (el.id === 'add-outros') { state.equip.outros = [el.value]; save(); }
    if (el.id === 'm-truques') { state.magias.truques = el.value; save(); }
    if (el.id === 'm-magias') { state.magias.conhecidas = el.value; save(); }
    if (el.id === 'ficha-notas') { state.notas = el.value; save(); }

    /* atributos */
    const setAttr = el.dataset.setAttr;
    if (setAttr) { state.atributos.assign[setAttr] = el.value === '' ? null : Number(el.value); save(); rerenderStep(); }
    if (el.name === 'plus2') { state.atributos.plus2 = el.value; save(); rerenderStep(); }
    if (el.name === 'plus1') { state.atributos.plus1 = el.value; save(); rerenderStep(); }

    /* melhorias */
    const imMode = el.name && el.name.startsWith('improv-mode-');
    if (imMode) {
      const lv = el.name.replace('improv-mode-', '');
      state.atributos.improvs[lv] = Object.assign({ mode: el.value, a: '', b: '' }, state.atributos.improvs[lv]);
      save(); rerenderStep();
    }
    const imA = el.name && el.name.startsWith('improv-a-');
    if (imA) {
      const lv = el.name.replace('improv-a-', '');
      state.atributos.improvs[lv] = Object.assign({ mode: 'none' }, state.atributos.improvs[lv], { a: el.value });
      save(); rerenderStep();
    }
    const imB = el.name && el.name.startsWith('improv-b-');
    if (imB) {
      const lv = el.name.replace('improv-b-', '');
      state.atributos.improvs[lv] = Object.assign({ mode: 'none' }, state.atributos.improvs[lv], { b: el.value });
      save(); rerenderStep();
    }

    /* região */
    if (el.name === 'regiaoSkill') { state.regiaoSkill = el.value; save(); }
    if (el.name === 'regiaoLang') { state.regiaoLang = el.value; save(); }

    /* nivel */
    if (el.id === 'input-nivel') {
      state.nivel = Math.max(1, Math.min(20, Number(el.value) || 1));
      save();
      rerenderStep();
    }
  });

  document.addEventListener('change', e => {
    const el = e.target;
    /* classe */
    if (el.name === 'classe') { state.classe = el.value; state.subclasse = ''; save(); rerenderStep(); }
    if (el.name === 'origem') { state.origem = el.value; state.origemVariante = ''; save(); rerenderStep(); }
    if (el.name === 'origemVariante') { state.origemVariante = el.value; save(); rerenderStep(); }
    if (el.name === 'regiao') { state.regiao = el.value; state.regiaoSkill = ''; state.regiaoLang = ''; save(); rerenderStep(); }
    if (el.name === 'subclasse') { state.subclasse = el.value; save(); rerenderStep(); }
    if (el.name === 'awakening') { state.subclasse = el.value; save(); rerenderStep(); }
    if (el.name === 'essencia') { state.essencia = el.value; save(); }
    if (el.name === 'personalidade') { state.personalidade = el.value; save(); }
    if (el.name === 'passado') { state.passado = el.value; save(); rerenderStep(); }

    /* multi-seleção de perícias / opções (chips) */
    if (el.dataset.msOpt) {
      const max = Number(el.dataset.msMax || 99);
      const field = el.dataset.msOpt;
      const val = el.value;
      if (el.checked) {
        if (state[field].length >= max) { el.checked = false; return; }
        if (state[field].indexOf(val) === -1) state[field].push(val);
      } else {
        const i = state[field].indexOf(val);
        if (i >= 0) state[field].splice(i, 1);
      }
      save(); rerenderStep();
    }

    /* detalhes */
    const dField = el.classList.contains('d-field');
    if (dField) {
      const map = { 'd-sexo': 'sexo', 'd-idade': 'idade', 'd-altura': 'altura', 'd-peso': 'peso', 'd-pele': 'pele', 'd-cabelo': 'cabelo', 'd-olhos': 'olhos', 'd-marcas': 'marcas' };
      if (map[el.id]) { state.detalhes[map[el.id]] = el.value; save(); }
    }
    if (el.name === 'd-estilo') { state.detalhes.estiloVida = el.value; save(); }

    /* equipamento */
    if (el.name === 'armadura') { state.equip.armadura = el.value; save(); rerenderStep(); }
    if (el.name === 'escudo') { state.equip.escudo = el.value; save(); rerenderStep(); }
    if (el.name === 'add-arma') { if (el.value) { state.equip.armas.push(el.value); save(); rerenderStep(); } }
    if (el.name === 'add-conjunto') { if (el.value) { state.equip.conjuntos = [el.value]; save(); rerenderStep(); } }
    if (el.id === 'add-idioma') { if (el.value) { state.idiomasExtras.push(el.value); save(); rerenderStep(); } }

    /* toggles de perícias / salvaguardas */
    if (el.dataset.skill) { state.pericias[el.dataset.skill] = el.checked; save(); }
    if (el.dataset.salv) { state.salvaguardas[el.dataset.salv] = el.checked; save(); }
  });

  /* cliques de pulso */
  document.addEventListener('click', e => {
    if (e.target.id === 'btn-roll' || e.target.id === 'btn-reroll') {
      state.atributos.rolls = Array.from({ length: 6 }, roll4d6);
      state.atributos.assign = { 'Força': null, 'Destreza': null, 'Constituição': null, 'Inteligência': null, 'Sabedoria': null, 'Carisma': null };
      save(); STEPS[5].render(); return;
    }
    if (e.target.id === 'btn-altura' || e.target.id === 'btn-peso') {
      const r = randomAlturaPeso();
      if (r) {
        if (e.target.id === 'btn-altura') { state.detalhes.altura = r.altura; }
        else { state.detalhes.peso = r.peso; }
        save(); STEPS[9].render();
      }
      return;
    }
    if (e.target.id === 'btn-randomize') {
      randomizeAll();
      rerenderStep();
      return;
    }
  });

  document.addEventListener('change', e => {
    if (e.target.name === 'pulso') { state.pulsoRunico = e.target.value; save(); }
  });
}

function rerenderStep() {
  STEPS[currentStep].render();
}
function resetAll() {
  if (!confirm('Tem certeza que deseja apagar tudo e recomeçar?')) return;
  state = JSON.parse(JSON.stringify(DEFAULT_STATE));
  save();
  currentStep = 0;
  renderNav(); STEPS[0].render();
}

function toggleHeranca(name, silent) {
  const idx = state.herancas.indexOf(name);
  const max = origemData() ? origemData().herancaPoints : 2;
  if (idx >= 0) state.herancas.splice(idx, 1);
  else if (state.herancas.length < max) state.herancas.push(name);
  save();
}
function toggleRuna(name) {
  const idx = state.runas.indexOf(name);
  if (idx >= 0) state.runas.splice(idx, 1);
  else if (state.runas.length < runasMax()) state.runas.push(name);
  save();
}

/* ---- Gerador aleatório completo ---- */
function randomizeAll() {
  if (state.nome || state.origem || state.classe) {
    if (!confirm('Gerar um personagem 100% aleatório? Isso substitui todos os campos atuais.')) return;
  }
  const pick = arr => (arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : '');
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);
  const distinct = (n, from) => shuffle([...from]).slice(0, n);

  /* nome / conceito */
  const s1 = 'Ael|Bel|Cal|Du|Ery|Fen|Gor|Hael|Ily|Jor|Kael|Lyr|Mor|Nay|Oth|Pyr|Qae|Ryn|Shae|Til|Umb|Vor|Wyn|Xer|Yth|Zel|Bri|Cas|Dre|El|Fal|Gym|Hes|Ith|Kur|Lun|Mys|Ner|Or|Per|Quil|Rav|Sol|Tir|Ul|Ver|Wes'.split('|');
  const s2 = ['an', 'ar', 'el', 'end', 'is', 'or', 'yn', 'us', 'ath', 'ien', 'ion', 'wyn', 'mir', 'dred', 'thor', 'ven', 'ick', 'ora', 'eth'];
  state.nome = (pick(s1) + pick(s2)) + (Math.random() < 0.45 ? ' ' + pick(s1).toLowerCase() + pick(s2) : '');
  state.conceito = pick([
    'Caçador de recompensas foragido em busca de redenção',
    'Erudito que perdeu tudo e recomeça na estrada',
    'Mercenário leal que cobra caro e cumpre o contrato',
    'Aventureiro curioso que persegue lendas esquecidas',
    'Sobrevivente do deserto com dívidas do passado',
    'Filho de uma casa nobre em busca de seu próprio nome',
    'Contrabandista que sempre arranja um negócio melhor',
    'Aprendiz de ferreiro rúnico que acionou um pulso antigo'
  ]);
  state.historia = `Personagem criado aleatoriamente durante uma sessão de teste. Ajuste a história conforme sua campanha.`;
  state.origemVariante = '';

  /* origem */
  const origem = pick(Object.keys(D.origens));
  state.origem = origem;
  const od = D.origens[origem];
  state.origemVariante = (od.variants && od.variants.length) ? pick(od.variants).name : '';
  const abs2 = distinct(2, ABILITIES);
  state.atributos.plus2 = abs2[0];
  state.atributos.plus1 = abs2[1];

  /* região */
  state.regiao = pick(Object.keys(D.regioes));
  const ro = D.regioes[state.regiao];
  state.regiaoLang = ro.languages && ro.languages.length ? pick(ro.languages) : '';
  state.regiaoSkill = (ro.skills && ro.skills[0] === 'Qualquer perícia') ? pick(SKILLS) : (ro.skills && ro.skills.length ? pick(ro.skills) : '');
  state.regiaoNotas = '';
  state.idiomasExtras = [];

  /* classe */
  state.classe = pick(Object.keys(D.classes));
  const c = D.classes[state.classe];
  const subOpts = (c.subclass && c.subclass.options) || (c.awakening && c.awakening.options) || [];
  state.subclasse = subOpts.length ? pick(subOpts).name : '';
  state.classeSkills = distinct(c.skillChoices ? c.skillChoices.count : 0, (c.skillChoices ? c.skillChoices.options : []));
  state.tecnicasNota = '';

  /* atributos */
  state.atributos.rolls = Array.from({ length: 6 }, roll4d6);
  const rollOrder = shuffle([0, 1, 2, 3, 4, 5]);
  new Set(ABILITIES).forEach(a => state.atributos.assign[a] = null);
  ABILITIES.forEach((a, i) => { state.atributos.assign[a] = rollOrder[i]; });
  state.atributos.improvs = {};
  improvLevelsAvailable().forEach(lv => {
    const modIm = pick([{ mode: '+2', a: pick(ABILITIES), b: '' }, { mode: '+1+1', a: pick(ABILITIES), b: '' }]);
    if (modIm.mode === '+1+1') { const d = distinct(2, ABILITIES); modIm.a = d[0]; modIm.b = d[1]; }
    state.atributos.improvs[lv] = modIm;
  });

  /* heranças */
  state.herancas = [];
  const maxHer = od.herancaPoints || 0;
  let spent = 0;
  if (maxHer > 0) {
    const pool = shuffle([...(D.herancas.herancas || []), ...(D.herancas.variantes || [])]);
    for (const h of pool) {
      if (h.prerequisite) continue;
      if (spent + (h.cost || 1) > maxHer) continue;
      state.herancas.push(h.name);
      spent += (h.cost || 1);
      if (spent >= maxHer) break;
    }
  }

  /* runas */
  state.pulsoRunico = pick(D.runas.pulsosRunicos || []); state.pulsoRunico = state.pulsoRunico.name || '';
  const runaPool = shuffle([...(D.runas.runas || []).map(r => r.name), ...(D.runas.runessencias || []).map(r => r.name)]);
  state.runas = runaPool.slice(0, runasMax());

  /* personalidade / passado */
  state.essencia = pick((D.detalhamento.essencias || []).filter(e => e.type === 'essencia')).name || '';
  state.personalidade = pick((D.detalhamento.essencias || []).filter(e => e.type === 'personalidade')).name || '';
  state.passado = pick(D.detalhamento.passados || []).name || '';

  /* detalhes */
  const ap = randomAlturaPeso();
  state.detalhes.sexo = pick(['Feminino', 'Masculino', 'Agênero', 'Neutro']);
  state.detalhes.idade = String(ri(16, 95));
  state.detalhes.altura = ap ? ap.altura : '';
  state.detalhes.peso = ap ? ap.peso : '';
  state.detalhes.pele = pick(['clara', 'morena', 'parda', 'negra', 'rosada', 'bronzeada', 'esverdeada', 'azulada']);
  state.detalhes.cabelo = pick(['preto', 'castanho', 'louro', 'ruivo', 'prateado', 'azul-escuro', 'branco', 'curto e grisalho']);
  state.detalhes.olhos = pick(['castanhos', 'verdes', 'azuis', 'âmbar', 'cinzas', 'violeta', 'nevados']);
  state.detalhes.marcas = pick(['cicatriz no braço esquerdo', 'tatuagens rúnicas no antebraço', 'nenhuma particular', 'brinco de platina', 'marca de queimadura no ombro']);
  state.detalhes.estiloVida = pick(D.equipamento.estiloDeVida || []).name || '';

  /* equipamento */
  state.equip.armadura = '';
  state.equip.escudo = '';
  state.equip.armas = [];
  state.equip.conjuntos = [];
  state.equip.outros = [];
  const armPool = (D.equipamento.armaduras || []).filter(a => !a.strengthReq || getAttrs().Força >= a.strengthReq);
  if (armPool.length && Math.random() < 0.6) state.equip.armadura = pick(armPool).name;
  if ((D.equipamento.escudos || []).length && Math.random() < 0.3) state.equip.escudo = pick(D.equipamento.escudos).name;
  const armasPool = D.equipamento.armas || [];
  if (armasPool.length) state.equip.armas = distinct(Math.random() < 0.5 ? 2 : 1, armasPool).map(a => `${a.name}|${a.damage}|${a.type}|${a.damageType}`);
  if ((D.equipamento.conjuntos || []).length && Math.random() < 0.6) state.equip.conjuntos = [pick(D.equipamento.conjuntos).name];
  state.equip.outros = [pick(['8 PO em uma bolsa', '10 PP e um amuleto velho', 'uma carta de um ente querido e 5 PO', 'um diário de anotações e 20 PC', 'um chifre de caça e 2 PO'])];

  /* magias */
  const rite = ((c.subclass && c.subclass.options) || []).find(o => o.name === state.subclasse);
  if (c.spellcasting && rite && rite.spells) {
    const numCant = c.spellcasting.cantripsKnown && c.spellcasting.cantripsKnown[state.nivel] != null ? Number(c.spellcasting.cantripsKnown[state.nivel]) : 1;
    state.magias.truques = shuffle(rite.spells.filter(s => s.level === 0)).slice(0, numCant).map(s => s.name).join(', ');
    state.magias.conhecidas = rite.spells.filter(s => s.level > 0 && s.level <= state.nivel).map(s => `${s.name} (${s.level}º)`).join('\n');
  } else {
    state.magias.truques = '';
    state.magias.conhecidas = '';
  }
  state.notas = pick([
    '',
    'Origem e história ainda a definir com o Mestre.',
    'Pode trocar itens do equipamento inicial pela riqueza inicial da classe.',
    'Criado aleatoriamente — revisar aprimoramentos e técnicas de combate.'
  ]);

  save();
}

/* ---- persistência por passo ---- */
function persistCurrentStep() {
  /* campos de vários passos que usam eventos já são persistidos; reforço os textareas */
  const ids = ['c-nome', 'c-conceito', 'c-historia', 'regiao-notas', 'tecnicas', 'add-outros', 'm-truques', 'm-magias', 'ficha-notas'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const map = {
      'c-nome': 'nome', 'c-conceito': 'conceito', 'c-historia': 'historia',
      'regiao-notas': 'regiaoNotas', 'tecnicas': 'tecnicasNota',
      'add-outros': () => ({ o: state.equip.outros = [el.value] }),
      'm-truques': 'magias.truques', 'm-magias': 'magias.conhecidas', 'ficha-notas': 'notas'
    };
    if (typeof map[id] === 'function') map[id]();
    else if (map[id]) setPath(map[id], el.value);
  });
  save();
}
function setPath(path, v) {
  const parts = path.split('.');
  let o = state;
  for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
  o[parts[parts.length - 1]] = v;
}

/* ---------------- Init ---------------- */

document.addEventListener('DOMContentLoaded', () => {
  bindNav();
  $('#input-nivel').value = state.nivel;
  renderNav();
  STEPS[0].render();
});