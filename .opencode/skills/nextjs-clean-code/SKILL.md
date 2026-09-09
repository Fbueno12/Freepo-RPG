---
name: nextjs-clean-code
description: Use quando for criar ou refatorar código Next.js em qualquer projeto (rotas, componentes, data fetching, tipos, hooks). Reúne boas práticas de clean code para App Router com foco em simplicidade: server components por padrão, componente pequeno e com uma responsabilidade, data fetching colocado perto do uso e tipagem sem excesso. Ativa sempre que o usuário pedir "componente", "server/client component", "rota", "refatorar to-do app" ou mexer em pages.tsx.
---

# Next.js Clean Code — simples e direto

Regras curtas para manter código Next.js claro, pequeno e fácil de mudar.
Princípio máximo: **keep it simple/stupid**. Nada complicado que não pague o próprio custo.

## 1. Server components são o padrão

- Tudo nasce **server component**. Só adiciona `"use client"` quando precisar
  de interatividade, hooks, browser APIs ou eventos.
- Se o componente só renderiza JSX a partir de props, é server component.
  Isso elimina a maior parte do overhead de hydration.
- Regra de bolso: interativo → client; renderização de dados → server.

```tsx
// app/posts/page.tsx — server component por padrão
async function getPosts() {
  const res = await fetch("https://api.example.com/posts", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch posts");
  return res.json() as Post[];
}

export default async function PostsPage() {
  const posts = await getPosts();
  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
```

## 2. Componentes pequenos e com uma responsabilidade

- Um componente faz **uma coisa bem feita**. Se passar de ~200 linhas ou mexer
  em várias preocupações (auth + dados + estado + UI), extraia.
- Separe UI reutilizável (procura por `ui/`, `layout/`, `screens/`/`table/`
  existentes antes de criar pasta nova) e composição na página.

```tsx
// Bom: focado e composto
export default function UserDashboard() {
  return (
    <DashboardLayout>
      <UserProfile />
      <ActivityFeed />
      <QuickActions />
    </DashboardLayout>
  );
}
```

## 3. Data fetching perto de onde é usado

- Busque dados o mais próximo do uso, direto no `page.tsx`/server component.
- Chamadas de API reutilizáveis viram funções de serviço com erro tratado e
  cache explícito.

```ts
// services/userService.ts
export async function getUserById(id: string) {
  const res = await fetch(`${process.env.API_URL}/users/${id}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Failed to fetch user: ${res.statusText}`);
  return res.json() as User;
}
```

## 4. Tipagem sem excesso (KISS)

- Defina tipos próximos dos dados, na pasta `types/` do projeto quando
  compartilhados; tipos de props ficam junto do componente.
- Não crie camadas de abstração de tipos "só por segurança".
- `type guard` só quando um valor vem de fora (API, JSON.parse, Firestore).

```ts
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}
export type UserRole = "admin" | "user" | "guest";

export function isUser(obj: unknown): obj is User {
  return typeof obj === "object" && obj !== null && "id" in obj && "email" in obj;
}
```

- Desestruture props tipadas no componente (`Props extends` ou interface local).

## 5. Estados de erro e loading padrão do Next

- Use os arquivos reservados `app/**/error.tsx` e `app/**/loading.tsx`;
  não reinvente.
- Modelo `({ board }: { board: Board })` para props, `{ error: Error & { digest?: string }; reset: () => void }` para erro.

```tsx
// app/posts/error.tsx
"use client";
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div>
      <h2>Algo deu errado</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Tentar de novo</button>
    </div>
  );
}

// app/posts/loading.tsx
export default function Loading() {
  return <PostsSkeleton />;
}
```

## 6. Hooks customizados só quando compensa

- Extraia lógica para hook quando repetir em 2+ lugares ou quando sujar o
  componente (formulários, debounce, listeners, estado de Firebase).
- Não crie hook com um único uso; coloque a lógica no componente até doer.

```ts
// hooks/useDebounce.ts
import { useEffect, useState } from "react";
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
```

## 7. Variáveis de ambiente validadas uma vez

- Um único módulo de config valida e exporta as envs usadas; `NEXT_PUBLIC_`
  só no que vai pro browser (nunca secrets).

```ts
// config/env.ts
const required = ["API_URL", "NEXT_PUBLIC_FIREBASE_API_KEY"] as const;
for (const key of required) {
  if (!process.env[key]) throw new Error(`Falta env: ${key}`);
}
export const env = { apiUrl: process.env.API_URL!, firebaseKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY! } as const;
```

## 8. Performance com o mínimo de esforço

- Imagens: `next/image` (`width`, `height` ou `fill`, `alt` sempre).
- Código pesado e não crítico: `next/dynamic` só quando a página sofre sem ele.

```tsx
import dynamic from "next/dynamic";
const HeavyChart = dynamic(() => import("@/components/HeavyChart"), { loading: () => <ChartSkeleton />, ssr: false });
```

## 9. Convenções de nomenclatura

| O quê        | Padrão        | Exemplo                    |
| ------------ | ------------- | -------------------------- |
| Componentes  | PascalCase    | `UserProfile.tsx`          |
| Hooks        | camelCase + use | `useAuth.ts`             |
| Serviços/funções | camelCase | `getUserById.ts`        |
| Constantes   | UPPER_SNAKE   | `MAX_RETRY_COUNT`          |
| Tipos        | PascalCase    | `User`, `BlogPost`         |

## 10. Documente só o complexo

- Código deve ser autoexplicativo; comente a lógica que não é óbvia (o "porquê").
- Tudo que dá para nomear, nomeie — comentário não compensa nome ruim.

## Referência

Baseado em (2026):
- "Next.js Clean Code: Best Practices for Scalable Applications" — dev.to (sizan mahmud0)
- Commentário do post: "server é o padrão; marque client só quando precisar de estado, effects ou browser APIs".