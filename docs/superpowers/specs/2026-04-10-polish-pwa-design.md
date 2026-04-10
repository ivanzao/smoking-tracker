# Polish Visual + PWA — Sub-projeto #5

**Data:** 2026-04-10
**Branch:** a definir

**Escopo:** Quinto sub-projeto do `smoking-tracker`. Polish visual incremental que corrige 6 problemas de UX identificados (hierarquia, densidade, grid semanal, feedback tátil, cores, touch targets) e adiciona PWA com suporte offline.

**Pré-requisitos:** Sub-projetos #1–#4 entregues. O app tem event-based schema, useTracker hook com undo/edit, export/import, metas, métricas, e EditEventDrawer. O build atual usa `vite-plugin-singlefile` para gerar um único `dist/index.html`. O tema é dark-only (`class="dark"` no `<html>`).

---

## 1. Header compacto

### Antes

Header centralizado com `text-4xl sm:text-5xl`, subtítulo abaixo, botão de settings em `absolute top-0 right-0`. Ocupa ~120px de altura vertical.

### Depois

Header alinhado à esquerda com layout flex horizontal:

```
[Smoking Tracker        ⚙]
[do but don't forget      ]
```

- Título: `text-xl font-bold` com `tracking-tight`
- Subtítulo: `text-xs text-muted-foreground`
- Settings: no mesmo flex row, `ml-auto`, padding `p-2` (touch target 40px)
- Altura total: ~48px

### Breakpoint desktop (sm+)

Em desktop (`sm:` e acima), o header pode ter `text-2xl` — mas mantém o layout flex horizontal. Não volta para centralizado.

---

## 2. CounterCards compactos

### Antes

Layout vertical: ícone 64px (com `p-6` extra) → número `text-5xl` → label. Padding `p-6 sm:p-12`. Cada card ocupa ~280px de altura em mobile.

### Depois

Layout horizontal: ícone e número lado a lado.

```
[ 🚬  3    ]  [ 🌿  1    ]
[    Tabaco ]  [  Cannabis ]
```

- Ícone: `w-7 h-7` (28px), sem padding extra ao redor
- Número: `text-3xl font-bold`
- Label: `text-[0.65rem] uppercase tracking-wider text-muted-foreground`
- Layout interno: `flex items-center justify-center gap-3`
- Padding do card: `p-4`
- Border-radius: `rounded-xl` (12px)
- Altura total de cada card: ~80px

### Feedback tátil

- Adicionar `active:scale-[0.96]` e `transition-transform duration-150`
- Remover `hover:scale-[1.02]` (irrelevante em mobile, conflita com o active)
- Manter `hover:border-[color]` e `hover:bg-[color]/5` para desktop

### Breakpoint desktop (sm+)

Em `sm:`, pode ter `p-6` e `text-4xl` no número — um pouco mais espaçoso, mas mantém o layout horizontal.

---

## 3. MetricsCard sempre visível

### Antes

O `MetricsCard` só renderiza quando `currentGoal` existe (`{currentGoal && <MetricsCard ... />}`).

### Depois

O `MetricsCard` renderiza sempre. Quando não há meta:
- A coluna "hoje/meta" mostra apenas o total do dia como `{todayTotal}` sem barra de progresso e sem `/meta`
- A coluna "streak" mostra "—" com label "dias na meta" em muted (sem meta ativa, streak não faz sentido)
- A coluna "média 7d" mostra normalmente (não depende de meta)

Isso requer mudar a interface do `MetricsCard`: `goalLimit` passa de `number` para `number | null`. O componente renderiza condicionalmente a barra de progresso e o formato "X/Y" vs apenas "X". O `App.tsx` remove o `{currentGoal && ...}` wrapper e passa `goalLimit={currentGoal?.limit ?? null}`.

### Ajuste visual

O MetricsCard atual já é razoavelmente compacto. Manter o layout de 3 colunas com `divide-x`. Nenhuma mudança de layout, apenas a lógica condicional de renderização.

---

## 4. Grid semanal 7-col

### Antes

Grid com breakpoints: `grid-cols-2 sm:grid-cols-4 md:grid-cols-7`. Em mobile, 7 dias em grid 2-col cria 4 linhas (2+2+2+1) — layout desigual com célula órfã.

### Depois

Grid `grid-cols-7` sempre (sem breakpoints). Cada célula compacta:

```
[ Seg ]  [ Ter ]  [ Qua ]  ...  [ Dom ]
[  04 ]  [  05 ]  [  06 ]  ...  [  10 ]
[ ● 2 ]  [ ● 4 ]  [ ● 3 ]  ...  [ ● 3 ]
[ ● 1 ]  [     ]  [ ● 2 ]  ...  [ ● 1 ]
```

### Estrutura da célula

- **Dia da semana**: `text-[0.55rem] text-muted-foreground font-medium` — abreviação curta (`Seg`, `Ter`, `Qua`, `Qui`, `Sex`, `Sáb`, `Dom`). Usar `date-fns/format` com `{ locale: ptBR }` e pattern `'EEE'` truncado pra 3 chars.
- **Dia do mês**: `text-[0.7rem]`
- **Contadores**: dots coloridos (`w-[5px] h-[5px] rounded-full`) + número `text-[0.65rem] font-semibold`. Layout vertical `flex flex-col items-center gap-1`.
  - Dot tabaco: `bg-[hsl(var(--secondary))]` (laranja do theme)
  - Dot cannabis: `bg-[hsl(var(--primary))]` (verde do theme)
- **Dia sem eventos**: `opacity-40`, mostra "—"
- **Hoje**: `bg-accent ring-2 ring-primary` (mantém o padrão atual, mas proporcional)
- **Goal status dot**: mantido no canto superior direito (`absolute top-1 right-1`)

### Padding e dimensão

- Célula: `p-2 rounded-lg` (menor que o `p-3 rounded-2xl` atual)
- Gap entre células: `gap-1.5` (menor que `gap-3`)
- Touch target mínimo: a célula toda é clicável, garantindo ≥44px de largura em 375px viewport (375 - 32px padding - 6×6px gap) / 7 ≈ 46px — passa.

### Feedback tátil

- `active:scale-[0.93]` e `transition-transform duration-100` na célula
- Manter `cursor-pointer` e `hover:scale-105` para desktop

---

## 5. EditDayDialog — rows melhoradas

### Ícone em caixa colorida

Substituir o ícone solto por uma caixa com background tinted:

```tsx
<div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
     style={{ background: ev.type === 'tobacco' ? 'hsl(var(--secondary) / 0.15)' : 'hsl(var(--primary) / 0.15)' }}>
  <Icon className="w-4 h-4" />
</div>
```

Touch target de 36px (w-9 = 36px).

### Chevron de affordance

Adicionar `<ChevronRight className="w-4 h-4 text-muted-foreground/40" />` no final de cada row, após a lixeira. Indica visualmente que a row é clicável (abre EditEventDrawer).

### Location + reason inline

Antes: duas linhas separadas ("Onde: casa" / "Por quê: pós almoço").
Depois: uma linha: `{location} · {reason}` em `text-xs text-muted-foreground`. Se só tem um, mostra sem o separador. Se não tem nenhum, mostra "sem contexto" em `text-muted-foreground/50`.

### Lixeira melhorada

- Padding `p-2` (touch target 40px total com o ícone 16px)
- Hover: `hover:bg-destructive/15 hover:text-destructive` (fundo vermelho sutil)
- `rounded-md` para o hover background
- `e.stopPropagation()` no onClick (já existe, manter)

### Feedback tátil na row

- `active:scale-[0.98]` e `transition-all duration-100`
- `hover:bg-accent/50` (já existe, manter)

---

## 6. Cores unificadas via CSS variables

### Problema

Componentes usam hex hardcoded (`#ba5f27`, `#27ba42`) que divergem das CSS variables do theme (`--secondary`, `--primary`).

### Solução

Substituir todos os hex hardcoded por referências às CSS variables:

| Antes | Depois |
|-------|--------|
| `#ba5f27` (tabaco) | `hsl(var(--secondary))` |
| `#27ba42` (cannabis) | `hsl(var(--primary))` |
| `fill="#ba5f27"` no chart | `fill="hsl(var(--secondary))"` |
| `fill="#27ba42"` no chart | `fill="hsl(var(--primary))"` |
| `bg-[#ba5f27]` | `bg-secondary` |
| `bg-[#27ba42]` | `bg-primary` |

### Arquivos afetados

- `src/components/CounterCard.tsx` — `hover:border-[#ba5f27]`, `hover:bg-[#ba5f27]/5`
- `src/components/MonthlyChart.tsx` — `fill="#ba5f27"`, `fill="#27ba42"`, `bg-[#ba5f27]`, `bg-[#27ba42]`
- `src/components/CalendarView.tsx` (grid semanal) — novos dots usarão CSS vars desde o início

### Nota

As CSS variables dark theme já definem: `--primary: 162 73% 46%` (verde-teal) e `--secondary: 15 86% 68%` (laranja). Essas cores são ligeiramente diferentes dos hex hardcoded atuais. O resultado visual vai mudar um pouco — para melhor, pois ficam coerentes com o theme.

---

## 7. PWA — manifest + service worker + offline

### Remover vite-plugin-singlefile

O `vite-plugin-singlefile` inliniza tudo em um HTML. Isso impede:
- Service worker como arquivo separado
- Cache granular de assets
- Manifest JSON separado

Remover o plugin de `vite.config.ts` e de `package.json`. O build passa a gerar `dist/index.html` + assets JS/CSS em `dist/assets/`.

### Web App Manifest

Criar `public/manifest.json`:

```json
{
  "name": "Smoking Tracker",
  "short_name": "Smoking",
  "description": "Contador de consumo diário de tabaco e cannabis",
  "start_url": "./",
  "display": "standalone",
  "background_color": "#2b2b2b",
  "theme_color": "#2b2b2b",
  "icons": [
    { "src": "./icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "./icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Adicionar `<link rel="manifest" href="./manifest.json" />` e `<meta name="theme-color" content="#2b2b2b" />` ao `index.html`.

### Ícones

Gerar `public/icon-192.png` e `public/icon-512.png`. Abordagem: criar um script Node (`scripts/generate-icons.js`) que usa `canvas` (ou equivalente) para renderizar um ícone simples — fundo `#2b2b2b` com emoji 🚬 centralizado. Rodar uma vez durante setup, commitar os PNGs gerados. Não precisa rodar no build — são assets estáticos.

### Service Worker

Usar `vite-plugin-pwa` (Vite PWA plugin) que gera o service worker automaticamente com Workbox:

```bash
npm install --save-dev vite-plugin-pwa
```

Configurar em `vite.config.ts`:

```ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg}'],
      },
      manifest: false, // usamos o manifest manual em public/
    }),
  ],
});
```

Isso gera `sw.js` no build, pré-cachea todos os assets, e auto-atualiza quando há nova versão.

### Registro do service worker

O `vite-plugin-pwa` injeta o registro automaticamente com `registerType: 'autoUpdate'`. Não precisa de código manual em `main.tsx`.

### Dockerfile

O Dockerfile atual provavelmente copia `dist/index.html` como arquivo único. Atualizar para copiar a pasta `dist/` inteira. Verificar e ajustar conforme necessário.

---

## 8. Fora de escopo

- Dark mode toggle (mantém dark-only)
- Mudança de fluxo ou interação (tap → drawer continua igual)
- Novos features (autocomplete, atalhos, etc.)
- Testes de componente (mantém o padrão: lógica testada no hook, componentes validados visualmente)
- Redesign dos drawers (NewEventDrawer, EditEventDrawer, SettingsDrawer — ficam como estão)

---

## 9. Testes

### Lógica pura

Nenhuma mudança na lógica do hook ou helpers — os 111 testes existentes devem continuar passando sem modificação.

### Build

- `npx tsc --noEmit` — zero erros
- `npm run build` — gera `dist/` com `index.html`, assets, `sw.js`, `manifest.json`
- `npm run test:run` — 111 testes passam

### Smoke test manual

- Mobile (375px): header compacto, cards horizontais, metrics visível, grid 7-col sem scroll, tudo acima do fold
- Desktop (1024px+): layout proporcional e decente, não esticado
- Tap em CounterCard: feedback visual (scale down), drawer abre
- Tap em célula do grid: dialog abre
- Rows no EditDayDialog: chevron visível, tap abre EditEventDrawer, lixeira com hover vermelho
- PWA: "Add to Home Screen" funciona, app abre fullscreen, funciona offline
