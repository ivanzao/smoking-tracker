# Redesign Neobrutalism — Smoking Tracker

**Data:** 2026-06-26
**Status:** Aprovado para implementação

## Objetivo

Substituir a estética atual (dark theme inspirado em Material 3, verde/laranja) por um estilo **neobrutalism light** com fundo branco quente. Personalidade visual mais marcante mantendo a usabilidade do app de tracking.

## Princípios visuais

- **Forma**: cantos retos (radius 0), bordas pretas grossas, sombras hard-offset sem blur
- **Cor**: paleta monocromática (preto sobre branco quente) + um único acento amarelo
- **Tipografia**: Space Grotesk, geométrica, com bastante peso nos números e títulos
- **Profundidade**: sombras brutais que colapsam em interação (sem transições suaves de cor)
- **Light only**: dark mode é removido nesta passagem

## Sistema de design (tokens)

### Paleta (HSL CSS vars em `src/index.css`)

| Token | Valor HSL | Hex | Uso |
|---|---|---|---|
| `--background` | `42 56% 92%` | #F5EFDF | fundo do app (Parchment) |
| `--card` | `0 0% 100%` | #FFFFFF | superfície de cards |
| `--card-foreground` | `0 0% 7%` | #111111 | texto sobre card |
| `--foreground` | `0 0% 7%` | #111111 | texto principal |
| `--muted` | `42 30% 88%` | #ECE5D2 | superfície neutra (chips off) |
| `--muted-foreground` | `0 0% 40%` | #666666 | texto secundário |
| `--primary` | `47 100% 62%` | #FFD23F | amarelo de acento |
| `--primary-foreground` | `0 0% 7%` | #111111 | texto sobre amarelo |
| `--secondary` | `0 0% 100%` | #FFFFFF | superfície alternativa |
| `--secondary-foreground` | `0 0% 7%` | #111111 | texto sobre secundário |
| `--accent` | `47 100% 62%` | #FFD23F | mesmo que primary (alias) |
| `--accent-foreground` | `0 0% 7%` | #111111 | — |
| `--destructive` | `0 84% 60%` | #EF4444 | delete/danger |
| `--destructive-foreground` | `0 0% 100%` | #FFFFFF | texto sobre danger |
| `--border` | `0 0% 7%` | #111111 | borda preta universal |
| `--input` | `0 0% 100%` | #FFFFFF | fundo de input |
| `--ring` | `0 0% 7%` | #111111 | focus ring |
| `--popover` | `0 0% 100%` | #FFFFFF | popover/tooltip claros |
| `--popover-foreground` | `0 0% 7%` | #111111 | texto popover |

Tokens `surface-container-*` e `on-surface*` legados são removidos — não eram usados de forma sistemática e o sistema novo não precisa de degraus tonais (tudo é preto/branco/parchment/amarelo).

### Forma

- `--radius: 0` em todos os componentes
- Borda padrão: `2px solid hsl(var(--border))`
- Sombra brutal:
  - `--shadow-brutal: 3px 3px 0 hsl(var(--border))` (estado normal de cards/buttons elevados)
  - `--shadow-brutal-sm: 2px 2px 0 hsl(var(--border))` (botões inline, chips)
- Interação "pressed": botões e cards interativos colapsam para `box-shadow: none` + `translate-x-[2px] translate-y-[2px]` no `active:`.
- Focus: anel de 2px preto com offset `2px`, sem blur.

### Tipografia

- **Family**: `'Space Grotesk', system-ui, sans-serif` (substitui Inter)
- Pesos importados: 400, 500, 600, 700
- Numerais grandes (counters): `font-weight: 700`, `letter-spacing: -0.03em`
- Títulos de card: `font-weight: 700`
- Labels caps: `font-weight: 600`, `uppercase`, `letter-spacing: 0.08em`, `font-size: 12px`
- Body: `font-weight: 500` no padrão
- Carregamento via Google Fonts (`<link>` em `index.html`)

### Dark mode

Removido. Saem:
- `darkMode: ["class"]` em `tailwind.config.ts`
- `next-themes` (dependência) — único uso é `useTheme` em `src/components/ui/sonner.tsx`. Após rewriter sonner pra `theme="light"` fixo, remover da `package.json`.
- Variações dark em CSS vars (não existem hoje, mas garantir que `:root` só contenha o set light)

## Componentes UI base (`src/components/ui/*.tsx`)

API pública (props, ref forwarding, slots) **não muda**. Só as classes/variantes Tailwind são reescritas.

### `button.tsx`
Variantes via `cva`:
- `default`: `bg-primary text-primary-foreground border-2 border-border shadow-[3px_3px_0_hsl(var(--border))] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`
- `secondary`: igual mas `bg-secondary`
- `destructive`: `bg-destructive text-destructive-foreground` + mesma borda/sombra
- `outline`: `bg-transparent` + borda/sombra
- `ghost`: sem borda, sem sombra, `hover:bg-muted`
- `link`: sem borda, sem sombra, underline no hover
Tamanhos: `sm` (h-9, px-3), `default` (h-10, px-4), `lg` (h-12, px-6), `icon` (h-10 w-10). Todos `rounded-none`.

### `card.tsx`
`bg-card border-2 border-border shadow-[3px_3px_0_hsl(var(--border))] rounded-none`. `CardHeader`, `CardContent`, `CardFooter` mantém espaçamentos atuais. `CardTitle` ganha `font-bold tracking-tight`.

### `input.tsx`
`bg-input border-2 border-border rounded-none px-3 h-10 focus:outline-none focus:ring-0 focus:shadow-[3px_3px_0_hsl(var(--border))] focus:-translate-x-[1px] focus:-translate-y-[1px] transition-transform`.

### `dialog.tsx` / `drawer.tsx`
- Painel: `bg-card border-2 border-border shadow-[6px_6px_0_hsl(var(--border))] rounded-none`
- Overlay: `bg-black/40` (mais claro que o atual 80% pra contrastar com fundo creme)
- Botão de close: variante `ghost` do button novo

### `tabs.tsx`
- `TabsList`: `bg-muted border-2 border-border rounded-none p-1`
- `TabsTrigger`: `rounded-none data-[state=active]:bg-primary data-[state=active]:shadow-[2px_2px_0_hsl(var(--border))] data-[state=active]:border-2 data-[state=active]:border-border`

### `tooltip.tsx`
`bg-foreground text-card border-2 border-border rounded-none px-2 py-1 text-xs font-medium shadow-none`.

### `toast.tsx` / `sonner.tsx`
- Default: `bg-card border-2 border-border shadow-[3px_3px_0_hsl(var(--border))] rounded-none`
- Destructive: `bg-destructive text-destructive-foreground border-2 border-border`
- `sonner.tsx` hoje importa `useTheme` de `next-themes` — substituir por `theme="light"` fixo (light-only)

### `label.tsx`
`font-semibold uppercase tracking-wider text-xs text-foreground`.

## Componentes do app (`src/components/*.tsx`)

Sempre que possível, **substituem hover de borda colorida por interação "press"** (translate + sombra colapsa). Cor verde/laranja some — usar amarelo só onde a *informação* é "ativo/positivo".

### `CounterCard.tsx`
- Sai: `bg-surface-container-high rounded-2xl border border-transparent hover:border-secondary/30`
- Entra: card brutal padrão; conteúdo com:
  - número em `text-5xl font-bold tracking-tight` preto
  - label em uppercase preta abaixo
  - ícone `material-symbols-outlined` preto, no canto superior
  - tipo (tabaco/cannabis) vira um chip pequeno amarelo no topo do card (em vez de cor do ícone)
- `active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`

### `BottomNav.tsx`
- Sai: container com bg surface, NavLinks com cor ativa
- Entra: container `bg-card border-t-2 border-border`; NavLink ativo recebe fundo `bg-primary` (amarelo) e ícone preto; inativo: ícone preto, fundo transparente

### `TopNav.tsx`
- Container: `bg-card border-b-2 border-border`
- Tabs internos seguem o padrão `tabs.tsx`

### `NavLink.tsx`
- Item ativo: `bg-primary text-primary-foreground` (rectangular, sem rounded)
- Item inativo: `text-foreground hover:bg-muted`
- Indicador de seleção: o fundo amarelo *é* o indicador (sem underline)

### `CalendarView.tsx`
- Grid: cada célula `border-2 border-border`, sem gap interno (compartilham borda colapsando)
- Dia comum: fundo branco, número preto
- Dia com registros: número preto + chip pequeno com count (chip = `bg-foreground text-card border-2 border-border` para "passou da meta" ou `bg-primary text-primary-foreground` pra "dentro da meta")
- Dia futuro: `bg-muted text-muted-foreground`
- Hoje: borda direita+inferior `4px` em vez de `2px` (destaque sem mudar cor)

### `MonthlyChart.tsx` (recharts)
- Barras: `fill="hsl(var(--foreground))"` (preto sólido)
- Eixos: `stroke="hsl(var(--foreground))"`, `strokeWidth={1}`
- Grid: linhas pretas tracejadas leves (`stroke="hsl(var(--foreground))" strokeOpacity={0.15} strokeDasharray="2 4"`)
- Tooltip custom: `bg-card border-2 border-border shadow-[3px_3px_0_hsl(var(--border))]`, sem rounded
- Linha de meta: `stroke="hsl(var(--primary))"`, `strokeWidth={3}`, sem dash

### `GoalsContent.tsx`
- Slider: track preto fino (2px), thumb quadrado preto (`16x16`, sem rounded), fill amarelo à esquerda do thumb
- Card de meta: padrão brutal; valor da meta grande, contexto pequeno

### `EditDayDialog.tsx`, `NewEventDrawer.tsx`, `EditEventDrawer.tsx`
Herdam do dialog/drawer + button + input novos. Conferir spacing interno (sem mudança estrutural).

### `pages/TrackerPage.tsx` e `pages/HistoryPage.tsx`
**Tocadas** — usam tokens legados inline (`bg-surface-container-*`, `text-on-surface*`, `rounded-2xl`, `rounded-xl`). Conversão:

- `bg-surface-container-low/high/highest/lowest` → `bg-card` (e adicionar `border-2 border-border shadow-[3px_3px_0_hsl(var(--border))]` quando o bloco for um card visual)
- `text-on-surface` → `text-foreground`
- `text-on-surface-variant` → `text-muted-foreground`
- `border-outline-variant/*` → `border-border`
- `rounded-xl` / `rounded-2xl` / `rounded-full` → `rounded-none`
- A barra de progresso em TrackerPage (`bg-surface-container-high` track + `bg-primary` fill) vira track `border-2 border-border bg-card` com fill `bg-primary` sem rounded
- A "wave" diária (TrackerPage) que mistura `bg-primary`/`bg-secondary`/`bg-surface-container-highest`: cannabis → `bg-foreground`, tobacco → `bg-primary`, nenhum → `bg-muted`

### `pages/GoalsPage.tsx`
Só re-renderiza `GoalsContent` — sem mudança.

### `hooks/`, `lib/`, `types.ts`
Não tocadas.

### Testes
- `src/components/BottomNav.test.tsx` — o teste atual asserta `text-primary` na aba ativa. Com a nova marcação, a aba ativa usa `bg-primary text-primary-foreground`. Atualizar a asserção para `bg-primary`.
- `src/App.test.tsx` — testa só texto/navegação, segue passando.

## Arquivos afetados (resumo)

```
src/index.css                   — vars novas, fonte, util .shadow-brutal
tailwind.config.ts              — radius 0, remove darkMode, boxShadow.brutal
index.html                      — preload Space Grotesk
package.json                    — remove next-themes (se sem uso)
src/components/ui/button.tsx
src/components/ui/card.tsx
src/components/ui/input.tsx
src/components/ui/dialog.tsx
src/components/ui/drawer.tsx
src/components/ui/tabs.tsx
src/components/ui/tooltip.tsx
src/components/ui/toast.tsx
src/components/ui/sonner.tsx
src/components/ui/label.tsx
src/components/CounterCard.tsx
src/components/BottomNav.tsx
src/components/TopNav.tsx
src/components/NavLink.tsx
src/components/CalendarView.tsx
src/components/MonthlyChart.tsx
src/components/GoalsContent.tsx
src/pages/TrackerPage.tsx          — substitui tokens legados inline
src/pages/HistoryPage.tsx          — substitui tokens legados inline
src/components/BottomNav.test.tsx  — atualiza asserção text-primary → bg-primary
```

## Critérios de aceite

- App roda em modo light only sobre fundo Parchment #F5EFDF
- Todos os cards/inputs/botões interativos têm borda 2px preta + sombra brutal 3px
- Cantos retos em 100% dos componentes (radius 0)
- Acento é amarelo #FFD23F, sem verde/laranja/coral em lugar nenhum
- Tipografia Space Grotesk em todo o app
- Destructive (delete) usa vermelho #EF4444 sobre borda preta
- `npm run test:run` passa (testes existentes testam comportamento, não estilo)
- `npm run build` gera bundle sem warnings novos
- Validação manual: percorrer Tracker, History, Calendar, Goals e abrir todos os dialogs/drawers

## Fora do escopo

- Reescrever charts além de cor (Chart type, dados, agregação ficam)
- Ícones — segue usando Material Symbols (preto sólido)
- Dark mode (decidido: removido nesta passagem; pode voltar como spec separado depois)
- Animações elaboradas — só transform/shadow para interação "press"
- Lógica de negócio (counters, persistência, metas) — sem alteração

## Estratégia de implementação

PR único cobrindo todos os arquivos acima. Ordem sugerida dentro do PR:
1. Tokens (`index.css`, `tailwind.config.ts`, `index.html`, `package.json`)
2. UI base (`src/components/ui/*`)
3. Componentes do app (`src/components/*`)
4. Verificação visual + ajustes finos
