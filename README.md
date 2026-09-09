# Freepo

Mesa de jogo virtual (VTT) para a mesa de RPG do Runarcana, construído com Next.js, TypeScript e Firebase.

---

## Sumário

- [Visão geral](#visão-geral)
- [Stack](#stack)
- [Funcionalidades](#funcionalidades)
  - [Autenticação](#autenticação)
  - [Campanhas](#campanhas)
  - [Mesa de Jogo](#mesa-de-jogo)
    - [Chat](#chat)
    - [Anotações](#anotações)
    - [Música](#música)
    - [Mapa](#mapa)
    - [Dados](#dados)
    - [Combate e Iniciativa](#combate-e-iniciativa)
    - [Fichas de Personagem](#fichas-de-personagem)
    - [Bestiário (NPCs)](#bestiário-npcs)
    - [Presença Online](#presença-online)
    - [Efeitos Sonoros](#efeitos-sonoros)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Firestore](#firestore)
- [Design visual](#design-visual)
- [Desenvolvimento](#desenvolvimento)

---

## Visão geral

O Freepo é uma plataforma de mesa de jogo virtual para jogar RPG online. Um jogador assume o papel de **Mestre (GM)** e controla a mesa — música, mapa, combate e fichas — enquanto os demais jogadores (PCs) participam em tempo real.

Toda a sincronização entre jogadores ocorre via Firestore em tempo real. Não há servidor customizado; o cliente se comunica diretamente com o Firebase.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) |
| Linguagem | TypeScript (strict mode) |
| UI | React 19 |
| Estilo | Tailwind CSS 4 + CSS customizado |
| Backend | Firebase (Auth + Firestore) |
| Áudio | Web Audio API (sintetizado, sem arquivos) |
| Vídeo | YouTube IFrame API (carregada dinamicamente) |

---

## Funcionalidades

### Autenticação

Sistema completo de autenticação via Firebase Auth:

- **Login** com email e senha
- **Cadastro** de novos usuários
- **Recuperação de senha** via modal — envia email de redefinição
- Mensagens de erro traduzidas para português
- Sessão persistente entre recarregamentos da página

### Campanhas

Gerenciamento de campanhas com sistema de códigos:

- **Criar campanha** — nome, sistema (padrão: Runarcana), nível (1–20)
- **Entrar em campanha** — colar o código gerado para se juntar
- **Listar campanhas** — exibe todas as campanhas do usuário em um grid responsivo
- **Deletar campanha** — somente o criador pode excluir
- Cada campanha tem um **código de 8 caracteres** copiável
- Papéis: o criador é sempre **Mestre (GM)**; quem entra é sempre **Jogador (PC)**
- Indicador de quantos jogadores estão na campanha

### Mesa de Jogo

Ao entrar em uma campanha, o jogador acessa a **Mesa de Jogo** — uma interface dividida em três painéis:

```
┌──────────────────────────────────────────────┐
│  Barra superior: nome da campanha, jogadores  │
├────────┬──────────────────────┬──────────────┤
│        │                      │  Chat        │
│  Mapa  │    Área central      │  Anotações   │
│  Dados │  (Mapa/Dados/Combate │  Música      │
│  Combate│   /Fichas)          │              │
│  Fichas│                      │              │
└────────┴──────────────────────┴──────────────┘
```

- **Barra superior** — nome da campanha, sistema/nível, badge MESTRE/JOGADOR, lista de jogadores online, código da campanha, botão de sair
- **Painel esquerdo** — abas para Mapa, Dados, Combate e Fichas
- **Painel central** — conteúdo da aba selecionada
- **Painel direito** — abas para Chat, Anotações e Música

---

#### Chat

Mensageiro em tempo real:

- Mensagens enviadas por todos os jogadores da campanha
- Mensagens do jogador aparecem à direita (fundo teal); as dos outros, à esquerda (fundo escuro)
- **Rolagens de dado integradas** — ao rolar dados, o resultado aparece formatado no chat com fórmula, total em destaque e resultados individuais
- Entrada de fórmula de dado + entrada de mensagem (ambas com Enter para enviar)
- Notificação sonora para novas mensagens (quando habilitado)
- Auto-scroll para a última mensagem

#### Anotações

Bloco de notas compartilhado:

- **Salvamento automático** — debounce de 800ms após cada tecla
- **Sincronização em tempo real** — todos os membros veem as alterações
- Qualquer membro pode editar
- Rodapé indica "salva automaticamente" e "compartilhado com a mesa"

#### Música

Sistema de trilha sonora com YouTube:

- **Reprodução sincronizada** — o GM controla qual música toca para todos
- **Gerenciamento de playlists (GM):**
  - Adicionar faixa: colar link do YouTube ou ID do vídeo, com título opcional
  - Remover faixa
  - Tocar faixa — clica em ▶ para iniciar
  - Parar música — clica em ■ para interromper
- **Barra de controles:**
  - Miniatura da faixa atual, título, indicador "tocando"
  - Controle de volume compartilhado (+/−)
  - Botão de parar (■) — visível apenas para o GM
- **Sincronização temporal** — quando um jogador entra no meio da reprodução, a música continua no mesmo ponto que todos estão ouvindo (via `startedAt` + cálculo de elapsed time)
- **Player oculto** — o iframe do YouTube tem 1×1px, invisível; somente o áudio é reproduzido
- **Inicilização automática** — o primeiro GM a abrir a aba de música cria o documento de estado no Firestore

#### Mapa

Mapa interativo com tokens:

- **Imagem de fundo** — definida via URL (ou gradiente CSS padrão)
- **Grid sobreposto** — linhas de 44×44px semi-transparentes
- **Tokens** — miniaturas circulares com emojis e bordas coloridas por tipo:
  - **PC** — borda teal (`--glow`)
  - **NPC** — borda vermelha (`--red`)
  - **GM** — borda dourada (`--gold`)
- **Gerenciamento de tokens (GM):**
  - Adicionar token: nome, ícone (11 opções: piano, espada, mago, arco, adaga, escudo, pergaminho, lobo, javali, zumbi, ogro), tipo (PC/NPC/GM)
  - Arrastar e soltar — reposicionar tokens (coordenadas percentuais)
  - Remover token — botão "X" em cada token
- **Tokens NPC ocultos** — jogadores veem NPCs como "???" com ícone "?"
- **Imagem de fundo (GM)** — input de URL para definir fundo personalizado

#### Dados

Sistema de rolagem de dados:

- **Botões rápidos** — d4, d6, d8, d10, d12, d20 (clique para rolar)
- **Fórmula personalizada** — campo de entrada para fórmulas como `2d20+3`, `1d6`, `d4-1`
- **Fórmulas predefinidas:**
  - d20 (1d20)
  - Vantagem (2d20)
  - Investida (2d6+3)
  - Fogo rúnico (3d6)
  - Adaga (1d4+2)
  - Arco (1d8+4)
- **Parser de fórmula** — suporta formato `NdS±M` (ex: `2d20+3`), números puros e fallback para d20
- **Integração com chat** — todas as rolagens são enviadas como mensagens com dados do tipo `DiceRoll`
- **Dica** — "2d20 já conta como vantagem — pegue o maior resultado no chat"

#### Combate e Iniciativa

Rastreador de turnos e iniciativa:

- **Iniciar combate (GM):**
  - Busca todas as fichas de personagem da campanha
  - Cria combatentes com iniciativa aleatória (d20)
  - Ordena por valor decrescente
- **Combate ativo:**
  - Lista de iniciativa ordenada (maior valor primeiro)
  - Turno atual destacado com badge "ATUAL" e borda teal
  - Cada linha: valor de iniciativa, ícone, nome, rótulo de tipo
  - GM pode remover combatentes NPC
- **Controles do GM:**
  - "Próximo turno" — avança o índice (com wrap-around), toca som de sinal
  - "Rolar iniciativa" — refaz todas as rolagens
  - "Encerrar combate" — desativa o combate
- **Sem combate** — estado vazio com botão "Iniciar combate" (somente GM)

#### Fichas de Personagem

Sistema completo de fichas:

- **Wizard embarcado** — iframe carregando o criador de personagem Runarcana (`/wizard/runarcana-wizard.html`)
- **Importar do wizard** — lê o estado do `localStorage` e salva como ficha no Firestore
- **Lista de fichas** — exibe todas as fichas da campanha com nome, classe e nível
- **Deletar ficha** — o proprietário pode excluir sua ficha

**Modal de ficha completa:**
- Cabeçalho — emoji do avatar, nome, conceito/origem/região/classe
- **Atributos** — 6 atributos do Runarcana (Força, Destreza, Constituição, Inteligência, Sabedoria, Carisma) com:
  - Valor do atributo
  - Modificador calculado: `floor((valor - 10) / 2)`
  - Botão de rolar: envia d20+modificador para o chat
- **Perícias** — exibição em chips com valores não-zero, cada uma com botão de rolar
- **Runas** — nomes das runas em chips
- **Equipamento** — itens em chips
- **Inventário:**
  - Itens removíveis em chips
  - Input para adicionar item (Enter ou botão)
  - Permissão: proprietário ou GM pode editar
  - Sincronização em tempo real com Firestore
- **Rodapé** — valor do "Pulso Rúnico" (se presente)

#### Bestiário (NPCs)

Gerenciamento de NPCs pelo Mestre:

- **Criar NPC** — nome, ícone (8 criaturas), HP, notas
- **Ações do GM:**
  - Adicionar ao combate — cria combatente com iniciativa aleatória
  - Posicionar no mapa — cria token em posição aleatória
  - Remover NPC
- Persistência via Firestore

#### Presença Online

Indicador de quem está na mesa:

- **Ao entrar na mesa** — usuário é marcado online via `setOnline`
- **Ao sair** — marcado offline via `setOffline` (também no `beforeunload`)
- **Inscrição em tempo real** — `subscribePresence` atualiza a lista
- **Exibição** — jogadores online aparecem com pontos verdes na barra superior
- **Badge do GM** — "MESTRE" (vermelho) ou "JOGADOR" (teal)

#### Efeitos Sonoros

Sons sintetizados via Web Audio API (sem arquivos de áudio):

- **Dados** — 6 blips rápidos de onda quadrada (1800–4000Hz) + 2 cliques de onda senoidal (660Hz + 880Hz) — simula chocalhar e resultado
- **Mensagem** — dois tons ascendentes de onda senoidal (520Hz + 780Hz)
- **Sinal** — dois tons descendentes de onda senoidal (440Hz + 330Hz) — indica mudança de turno
- **Toggle** — botão para habilitar/desabilitar sons, preferência salva no `localStorage`

---

## Estrutura do projeto

```
src/
  app/
    page.tsx                 ← Entrada principal (SPA com state-driven screens)
    layout.tsx               ← Root layout (lang="pt-BR", globals.css)
    globals.css              ← Todo o estilo (2000+ linhas)
    error.tsx                ← Error boundary global
    wizard/page.tsx          ← Página standalone do wizard de personagem
  components/
    layout/
      Header.tsx             ← Barra de navegação superior
    screens/
      LoginScreen.tsx        ← Autenticação (login, cadastro, reset)
      LobbyScreen.tsx        ← Dashboard de campanhas
      GameScreen.tsx         ← Mesa de jogo (orquestrador principal)
    table/
      Sidebar.tsx            ← Painel esquerdo (abas: Mapa/Dados/Combate/Fichas)
      MapView.tsx            ← Mapa interativo com tokens
      DiceView.tsx           ← Interface de rolagem de dados
      InitiativeView.tsx     ← Rastreador de iniciativa + bestiário
      CharacterPanel.tsx     ← Fichas de personagem + wizard embarcado
      RightPanel.tsx         ← Painel direito (abas: Chat/Anotações/Música)
  contexts/
    AuthContext.tsx           ← Provider de autenticação Firebase
  lib/
    firebase.ts              ← Configuração do Firebase
    types.ts                 ← Todas as interfaces TypeScript
    campaigns.ts             ← CRUD de campanhas, chat, notas
    characters.ts            ← CRUD de fichas + ponte localStorage
    combat.ts                ← Estado de combate
    map.ts                   ← Estado do mapa + tokens
    music.ts                 ← Estado da música + playlist
    npcs.ts                  ← Gerenciamento de NPCs
    presence.ts              ← Presença online
    dice.ts                  ← Parser + rolagem de dados
    youtube.ts               ← Extração de ID + thumbnail
    sound.ts                 ← Efeitos sonoros sintetizados
  hooks/
    useYouTubePlayer.ts      ← Wrapper do YouTube IFrame API
    useSound.ts              ← Hook de efeitos sonoros com toggle
public/
  Freepo.jpeg                ← Logo/avatar do app
  wizard/                    ← Wizard de criação de personagem (HTML/JS/CSS)
scripts/
  test-rules.mjs             ← Testes unitários das regras Firestore
```

---

## Firestore

### Coleções

| Coleção | Caminho | Descrição |
|---|---|---|
| Campanhas | `campaigns/{id}` | Metadados da campanha |
| Membros | `campaignMembers/{id}` | Membros e papéis por campanha |
| Chat | `chats/{campaignId}/messages/{id}` | Mensagens da campanha |
| Anotações | `notes/{campaignId}` | Bloco de notas compartilhado |
| Fichas | `campaigns/{campaignId}/characters/{id}` | Fichas de personagem |
| Combate | `combat/{campaignId}` | Estado do combate |
| Mapa | `map/{campaignId}` | Estado do mapa e tokens |
| Música | `music/{campaignId}` | Estado da música e playlist |
| NPCs | `npcs/{campaignId}` | Bestiário da campanha |
| Presença | `presence/{campaignId}/users/{uid}` | Usuários online |

### Regras de acesso (resumo)

- **Leitura** — qualquer membro da campanha
- **Escrita de mesa** (combate, mapa, música, NPCs) — GM ou dono da campanha
- **Fichas** — autor ou GM podem editar
- **Chat** — autor ou GM podem deletar
- **Campanha** — somente o dono pode deletar
- **Membros** — qualquer usuário autenticado pode se juntar (transação atômica)

---

## Design visual

### Paleta de cores

| Token | Cor | Uso |
|---|---|---|
| `--bg` | `#110f0c` | Fundo principal |
| `--panel` | `#1e1a15` | Fundo de painéis |
| `--text` | `#e8e0d4` | Texto principal |
| `--muted` | `#8a7c6e` | Texto secundário |
| `--accent` | `#7a8c52` | Ações primárias (verde) |
| `--glow` | `#5fd4d0` | Destaques interativos (teal) |
| `--red` | `#c75b2a` | Perigo, badge do GM |
| `--gold` | `#a07838` | Dados, iniciativa |

### Tipografia

- **Títulos:** Cinzel (serifada, weight 600–800)
- **Corpo:** Inter (sans-serif, weight 400–700)

### Botões

| Classe | Aparência |
|---|---|
| `.btn` | Fundo verde gradiente |
| `.btn-glow` | Fundo teal gradiente |
| `.btn-ghost` | Transparente, borda sutil |
| `.btn-danger` | Fundo vermelho gradiente |
| `.icon-btn` | Quadrado 34×34px |

### Layout responsivo

Em `max-width: 640px`:
- Grid do jogo encolhe: `56px 1fr 260px`
- Fichas ficam em coluna única

---

## Desenvolvimento

### Pré-requisitos

- Node.js 18+
- Projeto Firebase configurado (ou emuladores)

### Scripts

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run start        # Servidor de produção
npm run lint         # ESLint
npm run emulators    # Firebase emuladores (porta 9099/8080)
npm run dev:emu      # Dev com emuladores
npm run test:rules   # Testes das regras Firestore
```

### Variáveis de ambiente

Arquivo `.env.local` (nunca commitar):

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_EMULATOR=true  # opcional, para desenvolvimento local
```

### Verificação

```bash
npm run lint          # ESLint
npx tsc --noEmit      # Typecheck
npm run build         # Build de produção
```
