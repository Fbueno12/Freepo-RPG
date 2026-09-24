# Plano de Implantação — Aba de Fichas

> Plano detalhado de implementação baseado na spec `aba-de-fichas.md`.
> Cada fase é independente e pode ser implementada e testada separadamente.

---

## Fase 0 — Preparação do Modelo de Dados

**Objetivo:** Atualizar tipos e funções Firestore para suportar todos os novos campos.

### 0.1 Atualizar tipos em `src/lib/types.ts`

Adicionar campos à interface `CharacterSheet`:

```typescript
interface CharacterSheet {
  id: string;
  campaignId: string;
  userId: string;
  name: string;
  type: "pc" | "npc";          // ← NOVO
  createdAt: Timestamp;
  updatedAt: Timestamp;
  state: WizardState;
  items?: string[];
  macros?: Macro[];             // ← NOVO
  notes?: string;               // ← NOVO
  secretMessage?: SecretMessage; // ← NOVO (apenas PC)
}
```

Novas interfaces:

```typescript
interface Macro {
  id: string;
  name: string;
  formula: string;
  description?: string;
  createdAt: Timestamp;
}

interface SecretMessage {
  message: string;
  priority: "normal" | "urgent";
  createdAt: Timestamp;
  read: boolean;
}
```

### 0.2 Atualizar funções em `src/lib/characters.ts`

Novas funções necessárias:

| Função | Descrição |
|---|---|
| `saveNpc(campaignId, npcData)` | Criar ficha de NPC (type: "npc", userId: "") |
| `updateCharacterField(campaignId, id, field, value)` | Atualizar campo específico (macros, notes, secretMessage) |
| `addMacro(campaignId, characterId, macro)` | Adicionar macro à ficha |
| `removeMacro(campaignId, characterId, macroId)` | Remover macro da ficha |
| `updateNotes(campaignId, characterId, notes)` | Salvar anotações (com debounce) |
| `setSecretMessage(campaignId, characterId, message)` | Criar/editar comunicado secreto |
| `markSecretMessageRead(campaignId, characterId)` | Marcar comunicado como lido |

Atualizar `saveCharacter` para incluir `type: "pc"` por padrão.

---

## Fase 1 — Organização da Lista (PCs vs NPCs)

**Objetivo:** Separar fichas de jogadores e NPCs na lista, com ordenação alfabética.

### 1.1 Modificar `CharacterPanel.tsx`

- Separar `characters` em dois arrays: `pcCharacters` e `npcCharacters`
- Ordenar cada array alfabeticamente por `name`
- Renderizar duas seções com cabeçalhos:
  - "Fichas de Jogadores" (apenas para GM; jogadores veem apenas as suas)
  - "Fichas de NPCs" (apenas para GM)

### 1.2 Lógica de visibilidade

- **Jogador:** vê apenas suas próprias fichas PC
- **Mestre:** vê todas as fichas PC + todas as fichas NPC

### 1.3 Indicador de comunicado

- Fichas PC com `secretMessage` não lido exibem badge vermelho (ponto ou ícone)

### 1.4 CSS

- Estilo para cabeçalho de seção (`.sheet-section-title`)
- Estilo para badge de comunicado não lido (`.unread-badge`)

---

## Fase 2 — Criar Fichas de NPC (Mestre)

**Objetivo:** Mestre pode criar, editar e excluir fichas de NPC.

### 2.1 Botão "Criar NPC"

- Adicionar botão na aba de Fichas (visível apenas para GM)
- Ao clicar, abre formulário/modal de criação de NPC

### 2.2 Formulário de NPC

Campos:
- Nome (obrigatório)
- Classe/Nível
- 6 Atributos (força, destreza, constituição, inteligência, sabedoria, carisma)
- Perícias relevantes
- HP
- Notas (descrição, história, motivações)

### 2.3 Salvar NPC

- Chamar `saveNpc()` com `type: "npc"` e `userId: ""`
- NPC aparece na seção "Fichas de NPCs"

### 2.4 Editar NPC

- Mestre clica na ficha do NPC
- Mesmo modal de ficha, mas com todos os campos editáveis
- Mestre pode editar atributos, perícias, itens, macros, notas

### 2.5 Excluir NPC

- Botão 🗑 ao lado da ficha do NPC
- Confirmação antes de excluir
- Chamar `deleteCharacter()`

---

## Fase 3 — Macros de Rolagem

**Objetivo:** Jogadores e Mestre podem criar macros de rolagem automatizada.

### 3.1 Criar macro

- Na seção "Macros" do modal de ficha, botão "Criar macro"
- Formulário com:
  - Nome (ex: "Ataque com Adaga")
  - Fórmula (ex: "1d4+2", "2d20+5+100-30")
  - Descrição (opcional)
- Validar fórmula antes de salvar (usar `rollFormula` como validador)
- Salvar com `addMacro()`

### 3.2 Listar macros

- Seção "Macros" no modal de ficha
- Cada macro exibe: nome, fórmula, botão ▶ (rolar), botão ✕ (remover)

### 3.3 Rolar macro

- Ao clicar ▶, executar `rollFormula(macro.formula)`
- Enviar resultado para chat via `sendChatMessage()`
- Formato: `[Ficha: Nome] Nome da Macro → resultado`
- Tocar som de dados

### 3.4 Remover macro

- Botão ✕ ao lado da macro
- Confirmar remoção
- Chamar `removeMacro()`

### 3.5 Permissões

- **Jogador:** pode criar/remover/rolar macros apenas nas suas fichas
- **Mestre:** pode criar/remover/rolar macros em qualquer ficha

### 3.6 CSS

- Estilo para lista de macros (`.macro-list`)
- Estilo para item de macro (`.macro-item`)
- Botão de rolar com hover teal

---

## Fase 4 — Anotações na Ficha

**Objetivo:** Jogadores podem fazer anotações pessoais na ficha.

### 4.1 Campo de anotações

- Adicionar seção "Anotações" no modal de ficha
- Textarea com placeholder "Suas anotações pessoais..."
- Salvar automaticamente com debounce (800ms)

### 4.2 Lógica de salvamento

- Usar `updateNotes()` com debounce
- Mostrar indicador "salvando..." / "salvo"

### 4.3 Permissões de visibilidade

- **Jogador:** vê e edita apenas suas anotações
- **Mestre:** vê e edita anotações de qualquer ficha
- **Outros jogadores:** NÃO veem anotações de outros

### 4.4 CSS

- Estilo para textarea de anotações (`.sheet-notes`)
- Indicador de status de salvamento

---

## Fase 5 — Comunicados Secretos (Mestre)

**Objetivo:** Mestre pode enviar mensagens secretas para jogadores via ficha.

### 5.1 Botão "Comunicado Secreto"

- Visível apenas para GM ao visualizar ficha de jogador (PC)
- Não aparece em fichas de NPC

### 5.2 Formulário de comunicado

- Modal/formulário com:
  - Mensagem (textarea, obrigatório)
  - Prioridade: Normal / Urgente (radio buttons ou select)
- Botão "Enviar comunicado"

### 5.3 Salvar comunicado

- Chamar `setSecretMessage()` com a mensagem e prioridade
- Comunicado é salvo no campo `secretMessage` da ficha

### 5.4 Visualização pelo jogador

- Na lista de fichas: badge vermelho na ficha com comunicado não lido
- Ao abrir a ficha: comunicado exibido em destaque no topo do modal
  - Prioridade "normal": fundo teal sutil
  - Prioridade "urgent": borda vermelha, ícone de alerta
- Ao ler: comunicado marcado como lido via `markSecretMessageRead()`
- Mestre pode editar/excluir comunicados

### 5.5 Permissões

- Apenas GM pode criar/editar/excluir comunicados
- Apenas o jogador dono da ficha e o GM veem o comunicado
- Comunicados não são visíveis para outros jogadores

### 5.6 CSS

- Estilo para comunicado no topo da ficha (`.secret-message`)
- Estilo para comunicado urgente (`.secret-message--urgent`)
- Badge de não lido (`.unread-badge`)
- Botão de comunicado secreto (`.btn-secret`)

---

## Fase 6 — Edição de Ficha pelo Mestre

**Objetivo:** Mestre pode editar todos os campos de qualquer ficha.

### 6.1 Lógica de permissão no modal

- Verificar `isGM` para determinar campos editáveis
- **Jogador:** edita apenas nome, conceito, notas, inventário, macros
- **Mestre:** edita TUDO (atributos, perícias, runas, equipamento, etc.)

### 6.2 Campos editáveis pelo Mestre

- Nome do personagem
- Conceito
- Classe/Nível
- Atributos (6 valores)
- Perícias
- Runas
- Equipamento
- Inventário
- Macros
- Notas

### 6.3 Salvar alterações

- Usar `updateCharacter()` para campos do WizardState
- Usar `updateCharacterField()` para campos específicos (macros, notes)
- Salvar com debounce ou botão "Salvar"

### 6.4 CSS

- Inputs editáveis com estilo distinto (borda sutil)
- Indicador de "editando pelo Mestre"

---

## Fase 7 — Integração com Combate e Mapa

**Objetivo:** Mestre pode adicionar NPCs ao combate e mapa diretamente da ficha.

### 7.1 Botão "Adicionar ao combate"

- Visível apenas para GM ao visualizar ficha de NPC
- Ao clicar:
  - Criar combatente com nome, ícone e iniciativa aleatória (d20)
  - Chamar `addCombatants()` do módulo de combate
  - NPC aparece na lista de iniciativa

### 7.2 Botão "Posicionar no mapa"

- Visível apenas para GM ao visualizar ficha de NPC
- Ao clicar:
  - Criar token com nome e ícone do NPC
  - Posição aleatória no mapa
  - Chamar `addToken()` do módulo de mapa

### 7.3 CSS

- Botões de ação no modal de ficha (`.sheet-actions`)

---

## Ordem de Implementação Recomendada

```
Fase 0 → Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 6 → Fase 7
```

**Justificativa:**
- Fase 0 é pré-requisito para todas as outras (tipos e funções Firestore)
- Fase 1 organiza a lista (necessário para NPCs)
- Fase 2 permite criar NPCs (necessário para macros e integrações)
- Fase 3 (macros) é a funcionalidade mais complexa e valiosa
- Fase 4 (anotações) é simples e independente
- Fase 5 (comunicados) depende da lista organizada (Fase 1)
- Fase 6 (edição pelo Mestre) é extensão natural
- Fase 7 (integração) depende de fichas de NPC existirem

---

## Arquivos a Modificar

| Arquivo | Fases | Mudanças |
|---|---|---|
| `src/lib/types.ts` | 0 | Novas interfaces, campos em CharacterSheet |
| `src/lib/characters.ts` | 0, 2, 3, 4, 5 | Novas funções CRUD |
| `src/components/table/CharacterPanel.tsx` | 1, 2, 3, 4, 5, 6, 7 | Reestruturação completa da lista e modal |
| `src/app/globals.css` | 1, 2, 3, 4, 5, 6, 7 | Novos estilos |
| `src/components/screens/GameScreen.tsx` | — | Sem mudanças (já importa CharacterPanel) |

---

## Checklist de Validação

- [ ] Jogador vê apenas suas fichas
- [ ] Mestre vê todas as fichas (PCs + NPCs)
- [ ] NPCs estão abaixo dos PCs na lista
- [ ] Mestre pode criar/editar/excluir NPCs
- [ ] Macros podem ser criadas com fórmulas complexas
- [ ] Macros rolam dados e enviam para chat
- [ ] Anotações são salvas automaticamente
- [ ] Anotações são privadas (jogador + Mestre apenas)
- [ ] Comunicados secretos funcionam (criar, ler, marcar como lido)
- [ ] Comunicados urgentes têm destaque visual
- [ ] Mestre pode editar qualquer campo de qualquer ficha
- [ ] Mestre pode adicionar NPC ao combate pela ficha
- [ ] Mestre pode posicionar NPC no mapa pela ficha
- [ ] Lint e typecheck passam
- [ ] Build de produção funciona
