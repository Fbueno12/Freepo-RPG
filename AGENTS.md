<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Freepo — Padrões do projeto

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS 4**
- **Firebase** (Auth + Firestore) para backend/banco
- Fontes: **Cinzel** (títulos) e **Inter** (texto), via Google Fonts

## Estrutura de pastas

```
src/
  app/            → rotas (page.tsx, layout.tsx, globals.css)
  components/
    layout/       → componentes de estrutura (Header, etc.)
    screens/      → telas completas (Login, Lobby, Game)
    table/        → partes da mesa de jogo (Sidebar, MapView, RightPanel…)
    ui/           → componentes reutilizáveis pequenos
  contexts/       → React context (AuthContext, etc.)
  lib/            → utilidades e clientes externos (firebase.ts)
  hooks/          → hooks customizados
```

## Padrões de código

- Componentes que usam navegador/Firebase: `"use client"` no topo.
- **Tailwind** para estilização; custom classes **só** no `globals.css` se
  reutilizadas em vários lugares (`.btn`, `.icon-btn`, `.field`, `.ava`).
- Design tokens (cores/fontes) ficam como CSS variables em `globals.css`
  (`--bg`, `--panel`, `--glow`, `--accent`, …) e expostas ao Tailwind via
  `@theme inline`.
- Variáveis de ambiente Firebase: prefixo `NEXT_PUBLIC_`, em `.env.local`.
- **Nunca** commitar `.env.local`.

## Verificação

- `npm run lint` — ESLint
- `npx tsc --noEmit` — typecheck
- `npm run build` — build de produção

## Firebase

- Config em `src/lib/firebase.ts` (inicializa app, auth, db, storage).
- Auth: `src/contexts/AuthContext.tsx` expõe `useAuth()` com
  `user`, `loading`, `login`, `register`, `resetPassword`, `logout`.
