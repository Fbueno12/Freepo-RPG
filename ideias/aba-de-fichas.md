# Spec — Aba de Fichas

> Documento de especificação para a aba de Fichas da Mesa de Jogo.
> Todos os casos de uso para jogadores e Mestre.

---

## Sumário

- [Visão geral](#visão-geral)
- [Papéis](#papéis)
- [Casos de uso — Jogador](#casos-de-uso--jogador)
  - [Gerar ficha via Wizard](#1-gerar-ficha-via-wizard)
  - [Visualizar própria ficha](#2-visualizar-própria-ficha)
  - [Editar própria ficha](#3-editar-própria-ficha)
  - [Adicionar item à ficha](#4-adicionar-item-à-ficha)
  - [Criar macro de rolagem para item](#5-criar-macro-de-rolagem-para-item)
  - [Usar macro de rolagem](#6-usar-macro-de-rolagem)
  - [Fazer anotações na ficha](#7-fazer-anotações-na-ficha)
- [Casos de uso — Mestre](#casos-de-uso--mestre)
  - [Visualizar todas as fichas](#8-visualizar-todas-as-fichas)
  - [Editar ficha de jogador](#9-editar-ficha-de-jogador)
  - [Gerenciar fichas de NPC](#10-gerenciar-fichas-de-npc)
  - [Criar comunicado secreto na ficha](#11-criar-comunicado-secreto-na-ficha)
  - [Ordenação da lista de fichas](#12-ordenação-da-lista-de-fichas)
- [Modelo de dados](#modelo-de-dados)
- [Fluxos de interação](#fluxos-de-interação)

---

## Visão geral

A aba de Fichas é o centro de gerenciamento de personagens da mesa. Ela permite que jogadores criem, visualizem e editem suas próprias fichas, e que o Mestre tenha controle total sobre todas as fichas da campanha — incluindo NPCs e comunicações secretas.

A ficha é gerada a partir do **Wizard de Runarcana** (criador de personagem) e depois pode ser expandida com itens, macros e anotações ao longo da campanha.

---

## Papéis

| Papel | O que pode fazer |
|---|---|
| **Jogador (PC)** | Gerar, visualizar e editar **apenas** sua própria ficha |
| **Mestre (GM)** | Visualizar e editar **todas** as fichas (jogadores + NPCs), criar comunicados secretos |

---

## Casos de uso — Jogador

### 1. Gerar ficha via Wizard

**Ator:** Jogador  
**Pré-condição:** Jogador está na mesa de jogo, aba "Fichas" ativa  
**Pós-condição:** Ficha criada e salva no Firestore

**Fluxo:**
1. Jogador clica no botão "Criar ficha" (ou abre o Wizard embarcado)
2. Wizard de Runarcana é exibido (iframe) com o criador de personagem completo
3. Jogador preenche todos os campos: nome, conceito, história, origem, região, classe, subclasse, heranças, atributos, perícias, runas, equipamento
4. Jogador clica em "Salvar ficha"
5. Sistema lê o estado do Wizard do `localStorage` (`runarcana_wizard_v1`)
6. Ficha é salva no Firestore em `campaigns/{campaignId}/characters/{characterId}`
7. Jogador vê sua ficha listada na aba de Fichas

**Regras:**
- Cada jogador pode ter **múltiplas fichas** (um jogador pode ter mais de um personagem)
- A ficha é vinculada ao `userId` do jogador que a criou
- Apenas o jogador criador pode editar sua ficha (via regras Firestore)

---

### 2. Visualizar própria ficha

**Ator:** Jogador  
**Pré-condição:** Jogador possui pelo menos uma ficha criada  
**Pós-condição:** Modal de ficha completa é exibido

**Fluxo:**
1. Jogador vê a lista de suas fichas na aba
2. Jogador clica em uma ficha
3. Modal abre exibindo a ficha completa:
   - **Cabeçalho:** emoji do avatar, nome, conceito/origem/região/classe
   - **Atributos:** 6 atributos do Runarcana com valor, modificador e botão de rolar
   - **Perícias:** chips com valores não-zero, cada uma com botão de rolar
   - **Runas:** chips com nomes das runas
   - **Equipamento:** chips com itens
   - **Inventário:** itens adicionados durante a campanha (com botão de remover)
   - **Anotações:** campo de texto para anotações pessoais
   - **Macros:** lista de macros de rolagem criadas
   - **Rodapé:** Pulso Rúnico (se disponível)

---

### 3. Editar própria ficha

**Ator:** Jogador  
**Pré-condição:** Jogador está visualizando sua ficha  
**Pós-condição:** Alterações salvas no Firestore

**Fluxo:**
1. Jogador abre o modal da ficha
2. Jogador clica no botão "Editar" (ou edita diretamente nos campos habilitados)
3. Campos editáveis pelo jogador:
   - Nome do personagem
   - Conceito
   - Notas da ficha
   - Inventário (adicionar/remover itens)
   - Macros de rolagem
4. Alterações são salvas automaticamente (debounce) ou ao clicar "Salvar"
5. Outros jogadores e o Mestre veem as alterações em tempo real

**Regras:**
- Atributos, perícias e runas **não são editáveis** diretamente (vêm do Wizard)
- Para alterar atributos, o jogador deve reabrir o Wizard
- Apenas o proprietário pode editar

---

### 4. Adicionar item à ficha

**Ator:** Jogador  
**Pré-condição:** Jogador está visualizando sua ficha  
**Pós-condição:** Item adicionado ao inventário

**Fluxo:**
1. Jogador abre o modal da ficha
2. Na seção "Inventário", jogador digita o nome do item no campo de entrada
3. Jogador pressiona **Enter** ou clica no botão "Adicionar"
4. Item aparece como chip removível na lista de inventário
5. Item é salvo no Firestore (`items` array da ficha)

**Regras:**
- Itens são strings livres (nome do item)
- Jogador pode remover itens clicando no "×" do chip
- O Mestre também pode adicionar/remover itens na ficha do jogador

---

### 5. Criar macro de rolagem para item

**Ator:** Jogador  
**Pré-condição:** Jogador está editando sua ficha, item já existe no inventário  
**Pós-condição:** Macro associada ao item

**Fluxo:**
1. Jogador abre o modal da ficha
2. Na seção de inventário, ao lado de um item, jogador clica em "Criar macro"
3. Modal/formulário de macro é exibido com:
   - **Nome da macro:** nome descritivo (ex: "Ataque com Adaga")
   - **Fórmula de rolagem:** fórmula no formato `NdS±M` (ex: `1d4+2`)
   - **Descrição (opcional):** texto explicativo
4. Jogador salva a macro
5. Macro aparece na seção "Macros" da ficha
6. Macro é salva no Firestore

**Regras:**
- Uma ficha pode ter **múltiplas macros**
- Macros podem ser associadas a itens ou serem independentes
- A fórmula segue o parser de dados: `NdS±M` com múltiplos modificadores (ex: `2d20+5+100-30`)

---

### 6. Usar macro de rolagem

**Ator:** Jogador  
**Pré-condição:** Jogador possui macros criadas  
**Pós-condição:** Resultado da rolagem enviado para o chat

**Fluxo:**
1. Jogador abre o modal da ficha
2. Na seção "Macros", jogador clica no botão de rolar (▶) ao lado da macro
3. Sistema executa a rolagem usando a fórmula da macro
4. Resultado é enviado como mensagem para o chat da campanha com:
   - Nome do personagem
   - Nome da macro
   - Fórmula utilizada
   - Resultado individual dos dados
   - Modificador
   - Total

**Formato da mensagem no chat:**
```
[Ficha: Nome do Personagem] Ataque com Adaga
[1d4+2] → [3] + 2 = 5
```

---

### 7. Fazer anotações na ficha

**Ator:** Jogador  
**Pré-condição:** Jogador está visualizando/editando sua ficha  
**Pós-condição:** Anotações salvas na ficha

**Fluxo:**
1. Jogador abre o modal da ficha
2. Na seção "Anotações", jogador digita texto livre
3. Anotações são salvas automaticamente (debounce) ou ao clicar "Salvar"
4. Anotações são visíveis **apenas para o jogador** (e para o Mestre)

**Regras:**
- Campo de texto livre (markdown simples ou texto puro)
- O Mestre pode ver as anotações de qualquer ficha
- As anotações **não são visíveis** para outros jogadores
- Útil para: planos do personagem, lembretes, backstory, etc.

---

## Casos de uso — Mestre

### 8. Visualizar todas as fichas

**Ator:** Mestre  
**Pré-condição:** Mestre está na mesa de jogo, aba "Fichas" ativa  
**Pós-condição:** Lista completa de fichas exibida

**Fluxo:**
1. Mestre abre a aba "Fichas"
2. Lista exibe **todas** as fichas da campanha, separadas por seção:
   - **Fichas de Jogadores** (acima)
   - **Fichas de NPCs** (abaixo)
3. Mestre clica em qualquer ficha para abrir o modal completo

**Regras:**
- Mestre vê fichas de todos os jogadores + NPCs
- Fichas de jogadores são exibidas primeiro (ordem alfabética por nome)
- Fichas de NPCs são exibidas abaixo (ordem alfabética por nome)
- Cada ficha mostra: nome, classe/nível, tipo (PC/NPC), nome do jogador (para PCs)

---

### 9. Editar ficha de jogador

**Ator:** Mestre  
**Pré-condição:** Mestre está visualizando a ficha de um jogador  
**Pós-condição:** Alterações salvas no Firestore

**Fluxo:**
1. Mestre clica na ficha de um jogador
2. Modal abre com a ficha completa
3. Mestre pode editar **todos** os campos:
   - Nome, conceito, atributos, perícias, runas
   - Inventário (adicionar/remover itens)
   - Macros de rolagem
   - Anotações
4. Alterações são salvas e sincronizadas com o jogador em tempo real

**Regras:**
- Mestre tem permissão total de edição em qualquer ficha
- Alterações do Mestre são imediatas para o jogador
- Útil para: ajustar fichas, corrigir erros, aplicar bônus de magia/itens

---

### 10. Gerenciar fichas de NPC

**Ator:** Mestre  
**Pré-condição:** Mestre está na aba "Fichas"  
**Pós-condição:** Fichas de NPC criadas/editadas/excluídas

**Fluxo de criação:**
1. Mestre clica em "Criar NPC"
2. Formulário é exibido com campos:
   - **Nome:** nome do NPC
   - **Tipo:** seleção "NPC"
   - **Classe/Nível:** classe e nível do NPC
   - **Atributos:** 6 atributos do Runarcana
   - **Perícias:** perícias relevantes
   - **HP:** pontos de vida
   - **Notas:** descrição, história, motivações
3. Mestre preenche e salva
4. Ficha de NPC aparece na seção "Fichas de NPCs"

**Fluxo de edição:**
1. Mestre clica na ficha do NPC
2. Modal abre com ficha completa
3. Mestre edita qualquer campo
4. Alterações salvas

**Fluxo de exclusão:**
1. Mestre clica no botão "Excluir" na ficha do NPC
2. Confirmação é exibida
3. Ficha é removida do Firestore

**Regras:**
- NPCs **não são visíveis** para jogadores (apenas para o Mestre)
- Mestre pode adicionar NPCs ao combate diretamente da ficha
- Mestre pode posicionar NPCs no mapa diretamente da ficha

---

### 11. Criar comunicado secreto na ficha

**Ator:** Mestre  
**Pré-condição:** Mestre está visualizando a ficha de um jogador  
**Pós-condição:** Comunicado salvo e visível apenas para o jogador

**Fluxo:**
1. Mestre abre a ficha de um jogador
2. Mestre clica no botão "Comunicado secreto" (ou seção dedicada)
3. Modal/formulário é exibido com:
   - **Mensagem:** campo de texto para o comunicado
   - **Prioridade:** opcional (normal/urgente)
4. Mestre escreve a mensagem e salva
5. Comunicado é salvo na ficha do jogador
6. **Jogador vê um alerta** na sua ficha indicando que há um comunicado do Mestre
7. Ao abrir a ficha, jogador vê a mensagem em destaque

**Regras:**
- Comunicado é **visível apenas** para o jogador dono da ficha e para o Mestre
- Outros jogadores **não veem** o comunicado
- Mestre pode editar/excluir comunicados
- Comunicados marcados como "urgente" ganham destaque visual (borda vermelha, ícone)
- Após o jogador ler, o comunicado pode ser marcado como "lido" (opcional)

**Exemplos de uso:**
- "Você percebe que o guardião está mentindo. Role Percepção com vantagem."
- "Em seus sonhos, você vê uma visão do futuro. The Next Session verá as consequências."
- "Urgente: Você foi envenenado. Perda de 2 PV por turno até encontrar antídoto."

---

### 12. Ordenação da lista de fichas

**Ator:** Mestre  
**Pré-condição:** Mestre está na aba "Fichas"  
**Pós-condição:** Lista organizada

**Estrutura da lista:**

```
┌─────────────────────────────────────┐
│  FICHAS DE JOGADORES                │
├─────────────────────────────────────┤
│  🧙 Aelindra — Mago Nv.5 (João)   │
│  ⚔️ Draven — Guerreiro Nv.3 (Ana)  │
│  🎭 Mirael — Bardo Nv.4 (Pedro)    │
├─────────────────────────────────────┤
│  FICHAS DE NPCs                     │
├─────────────────────────────────────┤
│  👹 Goblin Líder — Nv.2            │
│  🧟 Lich Rei — Nv.10               │
│  🐺 Lobo Alfa — Nv.1               │
└─────────────────────────────────────┘
```

**Regras de ordenação:**
- **Seção de Jogadores:** ordenada alfabeticamente por nome do personagem
- **Seção de NPCs:** ordenada alfabeticamente por nome do NPC
- Cada ficha exibe: ícone/avatar, nome, classe/nível, jogador (apenas para PCs)
- Fichas com comunicado não lido têm indicador visual (ponto vermelho ou badge)

---

## Modelo de dados

### CharacterSheet ( Firestore )

```typescript
interface CharacterSheet {
  id: string;                    // UUID da ficha
  campaignId: string;            // ID da campanha
  userId: string;                // ID do jogador (vazio para NPCs)
  name: string;                  // Nome do personagem
  type: "pc" | "npc";           // Tipo de ficha
  createdAt: Timestamp;
  updatedAt: Timestamp;
  state: WizardState;           // Estado do Wizard de Runarcana
  items?: string[];             // Inventário (itens livres)
  macros?: Macro[];             // Macros de rolagem
  notes?: string;               // Anotações pessoais
  secretMessage?: SecretMessage; // Comunicado secreto do Mestre (apenas PC)
}

interface Macro {
  id: string;                    // UUID da macro
  name: string;                  // Nome descritivo (ex: "Ataque com Adaga")
  formula: string;               // Fórmula de rolagem (ex: "1d4+2")
  description?: string;          // Descrição opcional
  createdAt: Timestamp;
}

interface SecretMessage {
  message: string;               // Texto do comunicado
  priority: "normal" | "urgent"; // Prioridade
  createdAt: Timestamp;
  read: boolean;                 // Se o jogador já leu
}
```

### WizardState ( existente )

```typescript
interface WizardState {
  nome?: string;
  conceito?: string;
  historia?: string;
  origem?: string;
  regiao?: string;
  classe?: string;
  subclasse?: string;
  herancas?: string[];
  passado?: string;
  atributos?: Record<string, number>;    // forca, destreza, constituicao, inteligencia, sabedoria, carisma
  pericias?: Record<string, number>;
  salvaguardas?: Record<string, number>;
  pulsoRunico?: string;
  runas?: Record<string, unknown>;
  equip?: Record<string, unknown>;
  magias?: unknown[];
  detalhes?: Record<string, unknown>;
  notas?: string;
  [key: string]: unknown;
}
```

---

## Fluxos de interação

### Fluxo 1: Jogador cria ficha e usa macro

```
Jogador → Clica "Criar ficha"
  → Wizard abre (iframe)
  → Preenche dados do personagem
  → Clica "Salvar"
  → Ficha criada no Firestore
  → Ficha aparece na lista

Jogador → Abre ficha → Clica "Criar macro"
  → Preenche: "Ataque com Adaga", "1d4+2"
  → Salva macro
  → Macro aparece na seção "Macros"

Jogador → Clica ▶ na macro "Ataque com Adaga"
  → Rola 1d4+2
  → Resultado enviado para chat
  → Todos veem: "[Ficha: Mirael] Ataque com Adaga → [3] + 2 = 5"
```

### Fluxo 2: Mestre cria comunicado secreto

```
Mestre → Abre ficha de Mirael (Jogador)
  → Clica "Comunicado secreto"
  → Escreve: "Você sente uma presença maligna ao lado. Role Percepção."
  → Define prioridade: "urgente"
  → Salva

Mirael (Jogador) → Abre sua ficha
  → Vê badge de comunicado não lido (vermelho)
  → Clica para ler
  → Mensagem exibida em destaque com borda vermelha
  → Comunicado marcado como "lido"
```

### Fluxo 3: Mestre gerencia fichas de NPC

```
Mestre → Clica "Criar NPC"
  → Preenche: "Goblin Líder", HP: 15, Notas: "Guarda o tesouro"
  → Salva
  → Ficha aparece na seção "Fichas de NPCs"

Mestre → Abre ficha do Goblin Líder
  → Clica "Adicionar ao combate"
  → Goblin aparece na lista de iniciativa com d20 rolado

Mestre → Abre ficha do Goblin Líder
  → Clica "Posicionar no mapa"
  → Token do Goblin criado em posição aleatória no mapa
```

### Fluxo 4: Jogador adiciona item e cria macro

```
Jogador → Abre ficha → Seção "Inventário"
  → Digita "Espada Longa +1"
  → Pressiona Enter
  → Item aparece como chip

Jogador → Ao lado do item "Espada Longa +1"
  → Clica "Criar macro"
  → Preenche: "Ataque Espada", "1d20+5", "1d8+3"
  → Salva
  → Macro criada e vinculada ao item
```

---

## Casos de uso futuros (fora do escopo atual)

- [ ] **Sincronização com Wizard:** atualizar ficha automaticamente ao reabrir o Wizard
- [ ] **Templates de NPC:** criar fichas de NPCs a partir de templates pré-definidos
- [ ] **Exportar ficha:** exportar ficha como PDF ou imagem
- [ ] **Histórico de alterações:** log de todas as mudanças na ficha
- [ ] **Permissões granulares:** permitir que jogadores editem apenas certos campos
- [ ] **Fichas compartilhadas:** permitir que jogadores vejam fichas de outros jogadores (com permissão)
- [ ] **Macros compartilhadas:** permitir que jogadores compartilhem macros entre si
- [ ] **Integração com combate:** ficha atualiza automaticamente durante o combate (HP, condições, etc.)
