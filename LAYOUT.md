# Freepo - Layout e Navegação

Documento de layout da plataforma. Define telas, navegação e a composição da
mesa de jogo. **Sem código** — apenas para validarmos a estrutura antes de
programar.

---

## 1. Fluxo de navegação (telas)

```
[ Login / Cadastro ]  →  [ Lobby (campanhas) ]  →  [ Mesa de Jogo ]
                               ▲                          │
                               └──────────────────────────┘ (voltar)
```

### Autenticação (sem sessão)
- Tela de **Login** e **Cadastro** (email/senha via Firebase Auth).
- Tela de "recuperar senha" simples.
- Caminho: só entra no Lobby se estiver autenticado.

### Lobby — Home (autenticado)
Lista as **campanhas** das quais o jogador participa:
- Cartões com nome da campanha, papel (Mestre/Jogador), última atividade.
- Botões: **Criar nova campanha** e **Entrar por código** (convite).
- Selecionar uma campanha → vai para a **Mesa de Jogo**.

### Mesa de Jogo (a tela central)
É onde tudo acontece. Detalhada na seção 2.

---

## 2. Mesa de Jogo — layout principal

Pensada para **desktop** como prioridade (o grupo usa PC). Estrutura em
colunas/painéis.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ┌─────────┬─────────────────────────────────────────────┬────────────┐ │
│  │  Sidebar│                                             │  Painel    │ │
│  │  de     │        ÁREA PRINCIPAL (Mapa / Mesa)         │  lateral   │ │
│  │  abas   │                                             │  (abas)    │ │
│  │         │                                             │            │ │
│  │  🎲     │  Ex.: Mapa com tokens  /  Ficha             │  💬 Chat   │ │
│  │  📋     │                                             │  📝 Anot.  │ │
│  │  📍     │                                             │  🎵 Música │ │
│  │  ⚔️     │                                             │  ⚔️ Inic.  │ │
│  │         │                                             │            │ │
│  └─────────┴─────────────────────────────────────────────┴────────────┘ │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │  Barra de rolagem de dados (rápida)          [🎲 Rolar]            ││
│  └────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

### Componentes da Mesa

**a) Sidebar de abas (esquerda)** — alterna o conteúdo da Área Principal:
- 🎲 **Dados** — rolagens rápidas
- 📋 **Fichas** — seleciona a ficha para exibir/gerenciar
- 📍 **Mapa** — imagem + tokens
- ⚔️ **Iniciativa** *(pode aqui ou no painel lateral — decidir)*

**b) Área Principal (centro)** — mostra o conteúdo da aba ativa:
- **Mapa:** imagem de fundo + tokens/miniaturas arrastáveis (Mestre controla)
- **Ficha:** a ficha do personagem (dados do wizard)
- **Dados:** mesa virtual de rolagem com animação

**c) Painel lateral (direita)** — abas que sobrepõem no mesmo espaço:
- 💬 **Chat de sessão** — mensagens + rolagens compartilhadas
- 📝 **Anotações** — bloco de notas da campanha
- 🎵 **Música** — playlist (YouTube) + controle do mestre

**d) Barra inferior** — rolagem de dados rápida + botão de rolar
(sempre visível, independente da aba ativa).

**e) Ficha** — abre em **modal/overlay** por cima da mesa (não troca o mapa).
O Mestre pode abrir fichas de NPCs e dos jogadores.

---

## 3. Decisões de layout (fechadas)

- [x] Sidebar (esquerda): abas 🎲 Dados · 📋 Fichas · 📍 Mapa · ⚔️ Iniciativa
- [x] Painel lateral (direita): abas 💬 Chat · 📝 Anotações · 🎵 Música
- [x] Barra inferior fixa: rolagem rápida de dados
- [x] Iniciativa na sidebar (Área Principal)
- [x] Ficha em modal/overlay
- [x] Anotações compartilhadas (bloco único da campanha)
- [x] Desktop primeiro (mobile depois)
