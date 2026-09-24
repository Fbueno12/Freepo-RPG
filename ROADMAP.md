# Freepo - Plataforma de RPG · Roadmap

Plataforma de Virtual Tabletop (VTT) para jogar RPG de mesa com amigos, feita
para ter a cara do nosso grupo em vez de ser uma ferramenta genérica.

---

## Visão

Um ambiente nosso chamado **Freepo** (em homenagem ao personagem memorável),
onde a gente joga **Runarcana RPG** online com a identidade do grupo.

## Decisões tomadas

- [x] **Nome:** Freepo
- [x] **Sistema:** Runarcana RPG
- [x] **Voz/vídeo (call):** fica no **Discord** — mas a plataforma tem chat de sessão
- [x] **Comunicação:** chat de sessão dentro do Freepo (mensagens e rolagens)
- [x] **Anotações:** bloco de notas compartilhado por campanha (todos veem/edita)
- [x] **Música:** player de música durante a sessão (multiplayer, sincronizado)
- [x] **Ficha:** reaproveitar o wizard existente em
      `~/@Projects/wizard-criacao-runarcana`
- [x] **Escala:** grupo pequeno, mas com potencial de crescer
- [x] **Onde roda:** nuvem (acessível de qualquer lugar)
- [x] **Login:** conta com email/senha por jogador
- [x] **Consumo do wizard:** wizard **embutido** no Freepo (tela de criação dentro
      da plataforma; o `state` vira a ficha do jogador)
- [x] **Mapa:** imagem de mapa + tokens/miniaturas (com grid opcional)
- [x] **Ficha em mesa:** abre em **modal/overlay** por cima da mesa
- [x] **Permissões:** Mestre controla a mesa (mapa, NPCs, iniciativa, turnos);
      jogadores rolam dados e usam suas fichas
- [x] **Música — fonte:** URLs compartilhadas em uma playlist da sessão
- [x] **Música — formato:** embeds de **YouTube**
- [x] **Música — sincronização:** mestre controla play/pause/troca; o Freepo
      propaga o comando + ID do vídeo + tempo aproximado, e os players fazem
      seek (busca) até esse ponto (precisão aproximada, inerente ao YouTube)
- [x] **Plataforma:** web (acessível no navegador)
- [x] **Identidade visual:** **dark green** — inspirado no Freepo, o yordle
      flautista de roupas verdes e aparência de panda vermelho

## Integração com o wizard de ficha

O wizard já gera o **modelo completo de dados** da ficha, salvo no
`localStorage` sob a chave `runarcana_wizard_v1`. Ele **não** depende de
framework — apenas `data.js` (dados) + `app.js` (lógica). A ficha serializa
`state`, que contém:

- Identificação: `nome`, `conceito`, `historia`
- Build: `origem`, `regiao`, `classe`, `subclasse`, `herancas`, `passado`
- Números: `atributos` (e cálculos de mods), `pericias`, `salvaguardas`
- Sistema rúnico: `pulsoRunico`, `runas`
- `equip` (armadura, escudo, armas, conjuntos), `magias`, `detalhes`, `notas`

**Estratégia:** o wizard é **embutido** no Freepo — a tela de criação de
personagem reutiliza `data.js` + `app.js` do wizard (JS puro, sem framework),
e o `state` gerado passa a ser a ficha oficial do jogador, salva no banco do
Freepo. Assim preservamos a lógica de criação já pronta e não a reescrevemos.

---

## Stack (definida)

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind
- **Backend/Banco:** **Firebase** (Auth + Firestore + Realtime)
- **Tempo real:** Firebase Realtime / Firestore listeners
- **Auth:** conta email/senha (Firebase Auth)
- **Hospedagem:** nuvem (ex.: Vercel)
- **Música:** embeds de YouTube, sincronização por comando mestre → seek

---

## Fases / Entregas

### Fase 0 - Fundação
- [x] Setup do projeto (Next.js + TypeScript + Tailwind + tema dark green)
- [x] Estrutura de pastas e padrões de código (ver `AGENTS.md`)
- [x] Conexão com Firebase (Auth + Firestore/Realtime)
- [~] Autenticação com email/senha (login/cadastro) — implementada; aguarda
      credenciais reais em `.env.local` para teste completo

### Fase 1 - Mesa básica
- [x] Criação de campanha/sala (Firestore: `campaigns` + `campaignMembers`)
- [x] Chat de sessão (mensagens + histórico em tempo real: `chats/{id}/messages`)
- [x] Rolagem de dados (envia resultado para o chat da mesa)
- [x] Ficha: wizard embutido em `/wizard` (cria o `state` no localStorage) e
      aba **Fichas** importa esse `state` para o Firestore (`characters`)
- [x] Anotações por campanha (bloco compartilhado, salvo automaticamente: `notes`)
- [x] Persistência dos dados (Firebase): campanhas, chat, notas, fichas

> **Pendências de configuração manual:** cobrir o Firestore com as regras de
> `firestore.rules` no console Firebase — **feito na Fase 3** (só membros; o
> mestre/dono controla a mesa); basta republicar no console.

### Fase 2 - Jogando de verdade
- [x] Iniciativa de combate (gerenciador de turnos, `combat` + sync em tempo real)
- [x] Mapa: imagem + tokens/miniaturas (Mestre controla: `map`)
- [x] Sincronização em tempo real entre jogadores (Firestore listeners:
      chat, notas, mapa, combate e música)
- [x] Integração ficha↔rolagem (rolar atributo/perícia direto da ficha no chat)
- [x] Player de música (YouTube, sincronizado por comando do mestre: `music`)

### Fase 3 - Identidade própria
- [x] Refino do tema dark green / "cara do Freepo"
- [x] Extras: NPCs, itens, rolagens rápidas
- [x] Sons e ambientação (dados, mensagens, turnos — Web Audio, sem assets)
- [x] Rolagens rápidas com presets (d20, vantagem, testes comuns) no chat
- [x] NPCs da campanha (`npcs/{campaignId}`: roster persistido; adicionar ao
      combate e/ou ao mapa em 1 clique)
- [x] Inventário por personagem (campo `items` na ficha, sincronizado)
- [x] Regras do Firestore endurecidas: leitura só para membros
      (`campaignMembers/{campaignId}_{userId}` determinístico); alterações de
      mesa (combate/mapa/música/NPCs) só pelo mestre/dono
- [x] Sons: toque de dado, notificação de mensagem e sinal de virada de turno
      (toggle 🔊/🔇 na barra de rolagem)
- [x] Scrollbars temáticas e seleção com a cara do grupo

> **Para ativar:** republicar `firestore.rules` no console Firebase. A
> filiação agora vive em `campaignMembers/{campaignId}` (mapa
> `members: {uid: role}` + array `memberUids`) — campanhas antigas precisam
> ser recriadas/reentradas após a publicação.

---

## Backlog / próximas decisões

- [ ] Nenhuma em aberto — todas as decisões principais foram tomadas.

---

## Como evoluir

- Cada fase vira uma série de issues/tarefas para escrevermos o código juntos.
- Roadmap sempre editável aqui neste arquivo.
