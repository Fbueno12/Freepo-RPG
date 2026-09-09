---
name: css-best-practices
description: Use quando for escrever ou refatorar CSS em qualquer projeto. Reúne boas práticas de CSS puro (sem frameworks utilitários) com foco em simplicidade: tokens, @layer, classes semânticas e baixa especificidade. Ativa sempre que o usuário pedir "CSS", "estilo", "layout", "remover Tailwind" ou mexer em .css.
---

# Boas práticas de CSS — simples e direto

Regras curtas para manter o CSS claro, pequeno e fácil de mudar.
Princípio máximo: **keep it simple/stupid**. Nada complicado que não pague o próprio custo.

## 1. Design tokens em CSS custom properties

Defina em `:root` as decisões de design (cores, fontes, raios, sombras).
Cada variável descreve **o papel**, não o valor final.

```css
:root {
  --bg: #110f0c;
  --panel: #1e1a15;
  --text: #e8e0d4;
  --muted: #8a7c6e;
  --line: #3a3225;
  --accent: #7a8c52;
  --glow: #5fd4d0;
  --font-body: "Inter", system-ui, sans-serif;
  --font-heading: "Cinzel", serif;
}
```

Regras:
- Componentes usam `var(--token)`, nunca cor literal espalhada.
- Se uma cor vira tema, troca-se **um** valor em `:root`.
- Não crie token em excesso; crie só quando repetir 3+ vezes.
- `currentColor` e `inherit` são preferíveis a tokens desnecessários.

## 2. Tudo semântico, zero classes utilitárias

Classes descrevem **o que o elemento é** (`.camp-name`, `.lobby-grid`,
`.chat-msg`), não pedaços de layout (`px-4`, `mt-2`, `bg-panel`).

```css
.camp {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 20px;
}
.camp:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
}
```

- Nome por função: `.login-card`, `.btn-glow`, `.map-tools`.
- Estado é pseudo-classe (`.btn:hover`) ou classe de estado (`.tab.on`).
- Evite estilo em `jsx` inline para tudo que não seja um caso pontual real
  (posição dinâmica de token no mapa, por exemplo).

## 3. Especificidade baixa e previsível

- Só use classes e elementos. Nunca `#id` para estilo.
- Uma regra de profundidade (`.card .title`), evite empilhar seletores.
- Se precisar ganhar/largar prioridade, prefira `:where()` (zero especificidade)
  em vez de `!important` ou IDs.
- O último CSS ganha. Use isso a seu favor na mesma especificidade.

```css
:where(h1, h2, h3) {
  font-family: var(--font-heading);
}
```

## 4. Organização com @layer (e comentários de seção)

Declare as camadas no topo do arquivo; assim o reset nunca vence componente.

```css
@layer reset, base, components;
```

Se o projeto for pequeno, um único arquivo com seções comentadas já basta.

## 5. Layout sem framework

- `display: flex` resolve 90% dos casos; `display: grid` para grades de cards.
- Subcomponentes do mesmo bloco recebem o layout no **pai**, não classe por
  classe utility no filho.

```css
.lobby-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 18px;
}
.lobby-head {
  display: flex;
  align-items: center;
  gap: 16px;
}
.lobby-head .actions {
  margin-inline-start: auto;
}
```

## 6. Unidades simples

- `0`, `ems`, `%, vh/vw`, `rem` onde faz sentido. Prefira `em` para padding
  de texto e `0.5rem`-múltiplos para espaçamentos de layout.
- Para este conjunto de telas, **px em valores de precisão visual é aceitável
  e mais simples de ajustar** (ex.: padding de botão). Não enlouqueça com
  sistemas de espaçamento.

## 7. Acessibilidade no padrão

- Nunca `user-select: none` em textos de conteúdo.
- `:focus` visível nos inputs (borda + box-shadow leve).
- Botões: `cursor: pointer`, `font-family` herdada, sem fundo padrão.
- Use `::placeholder` para placeholder; não abuse de cores de texto inválidas
  antes do usuário interagir (`:user-invalid`).

## 8. Não derive conhecimento por repetição

- Não duplique regras "só por segurança". `:where()`/`:is()` agrupam.
- Fonte, cor e raio vêm dos tokens; código duplicado **é aceitável** quando
  significa clareza, mas valores duplicados não são.

## Referência

Pesquisa usada para este guia (2026):
- MDN — Using CSS custom properties
- GoogleChrome/modern-web-guidance (guia de CSS)
- Monterail — Practical CSS guidelines
- Artigos sobre design tokens em camadas (primitivo → semântico → componente)