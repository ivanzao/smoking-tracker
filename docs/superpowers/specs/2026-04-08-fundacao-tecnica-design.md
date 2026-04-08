# Fundação Técnica — Sub-projeto #1

**Data:** 2026-04-08
**Status:** Design aprovado, aguardando plano de implementação
**Escopo:** Primeiro de 5 sub-projetos da evolução do `smoking-tracker`. Refatora o modelo de dados, extrai a lógica para um hook, limpa dependências, padroniza o nome do projeto e introduz a nova interação de criação de eventos com contexto.

## Contexto

O app hoje é um contador diário simples: um toque em "Cigarro" ou "Folha" incrementa um total do dia, persistido em `localStorage`. Toda a lógica vive em `App.tsx`, o schema é agregado (`{ cigarette, leaf }` por data), o fuso é hardcoded em `America/Sao_Paulo`, existem ~40 componentes `shadcn/ui` no repo dos quais só ~8 estão em uso, e o `DayData` está duplicado em 3 arquivos.

Os próximos sub-projetos (insights, metas, undo, padrões por hora) precisam de uma base que não existe hoje: eventos individuais com contexto, código isolado em um hook testável, e tipos compartilhados.

## Decisões arquiteturais

### Modelo orientado a eventos

O schema agregado é substituído por uma lista plana de eventos individuais. Cada clique no contador cria um registro com timestamp, tipo, e opcionalmente localização e motivo.

**Por quê:** viabiliza todos os sub-projetos futuros (padrões por hora, undo preciso, anotação em tempo real, futuro backend) sem um segundo refactor.

### Renomeações de domínio

- `cigarette` → `tobacco`
- `leaf` → `cannabis`

Motivo: nomes mais precisos e neutros pro domínio real do app.

### Padronização do nome do projeto

O projeto hoje usa **três nomes diferentes** em lugares diferentes, resíduo de renomeações parciais e scaffold inicial. A fundação padroniza tudo em **`smoking-tracker`** (o nome novo do repositório GitHub, e coincidentemente o único que já era usado corretamente na chave do localStorage).

**Referências a atualizar:**

| Arquivo | Valor atual | Valor novo |
|---|---|---|
| `package.json` → `name` | `vite_react_shadcn_ts` | `smoking-tracker` |
| `README.md` → h1 e corpo | `Smoke Leaf Counter` | `Smoking Tracker` |
| `index.html` → `<title>` | `Puff Tracker` | `Smoking Tracker` |
| `index.html` → `og:title` | `Puff Tracker` | `Smoking Tracker` |
| `src/App.tsx` → h1 (`<h1>`) | `Puff Tracker` | `Smoking Tracker` |
| `src/App.tsx` → subtítulo | `do but don't forget` | *(manter ou remover — decisão do usuário)* |
| `localStorage` key | `smoking-tracker` | `smoking-tracker` *(já correto, não mexer)* |

Também deve ser feita uma varredura global por `smoke-leaf-counter`, `smoke_leaf_counter`, `SmokeLeafCounter`, `Smoke Leaf Counter`, `puff-tracker`, `Puff Tracker`, `vite_react_shadcn` e equivalentes para garantir que nenhuma referência passa batido (Dockerfile, meta tags, workflows do GitHub Actions em `.github/`, comentários, etc.).

**Git remote:** o repositório antigo (`ivanzao/smoke-leaf-counter`) será substituído pelo novo `ivanzao/smoking-tracker`. A decisão de apagar o antigo fica a critério do usuário — não é parte do escopo técnico desta fundação.

### Sem retrocompatibilidade

Ao detectar dados da shape antiga no `localStorage`, apaga e começa do zero. Não há migração, não há campo `version`. O app tem poucos dias de uso — os dados atuais não valem preservação.

### Local wall-clock, sem fuso hardcoded

Timestamps armazenados como ISO com offset local (ex: `"2026-04-08T14:30:00-03:00"`). Agrupamento por dia usa a parte de data local do timestamp, sem conversão UTC. Isso alinha com a visão de futuro backend: o front trabalha sempre no domínio local, o backend é livre pra normalizar como quiser.

Remove `date-fns-tz` e todo `date-utils.ts`.

### Interação: tap → bottom drawer

O toque nos cards de contador não incrementa mais direto. Abre um **bottom drawer** (via `vaul`/shadcn `Drawer`) com dois inputs opcionais ("Onde?" e "Por quê?") e um botão "Registrar". Submeter cria o evento com `timestamp = agora`.

Motivo: o valor de `location` e `reason` vem de anotar no momento quente. Forçar o form no toque captura contexto quando importa, sem pesar demais (ambos campos são opcionais, então o caminho rápido é "toque → enter").

### Testes: hook + helpers puros

Adota Vitest + React Testing Library, cobrindo apenas `src/lib/events.ts` e `src/hooks/useTracker.ts`. Componentes visuais ficam sem teste automatizado.

Motivo: 80/20 — a lógica nova é o coração do produto e é onde regressões causam dano silencioso. Componentes são validados no olho.

### Limpeza de dependências

Todo componente `shadcn/ui` não usado é removido do `src/components/ui/`. As dependências `@radix-ui/*` correspondentes e outras libs do scaffold inicial (`cmdk`, `embla-carousel-react`, `input-otp`, `react-day-picker`, `react-resizable-panels`, `date-fns-tz`) saem do `package.json`.

Ficam: `card`, `button`, `tabs`, `dialog`, `drawer`, `input`, `label`, `tooltip`, `sonner`, `toaster`, `toast`, `use-toast`. `next-themes` fica (sub-projeto #5 usa). `recharts` fica (MonthlyChart usa).

`react-hook-form` / `zod` / `@hookform/resolvers`: ficam **se** o drawer for implementado com `react-hook-form`; saem se for controlled simples. Decisão na execução.

## Modelo de dados

```ts
// src/types.ts
export type EventType = 'tobacco' | 'cannabis';

export interface TrackerEvent {
  id: string;              // uuid v4
  timestamp: string;       // ISO com offset local: "2026-04-08T14:30:00-03:00"
  type: EventType;
  location?: string;       // texto livre, opcional
  reason?: string;         // texto livre, opcional
}

export interface DayTotals {
  tobacco: number;
  cannabis: number;
}
```

**Persistência:**

```ts
// localStorage key: "smoking-tracker"
interface StorageShape {
  events: TrackerEvent[];  // ordenado por timestamp asc
}
```

**Boot:**

1. Lê `localStorage['smoking-tracker']`
2. Se ausente → estado vazio `{ events: [] }`
3. Se presente e parseável com chave `events: Array` → carrega
4. Caso contrário (shape antiga agregada ou lixo) → descarta silenciosamente, estado vazio

**Escrita:** toda mudança no array `events` dispara persistência. Sem guard de `length > 0` (corrige o bug atual).

## Arquitetura de módulos

```
src/
├── types.ts                      [NOVO]   Tipos de domínio compartilhados
├── lib/
│   ├── utils.ts                            (inalterado — cn helper)
│   ├── events.ts                 [NOVO]   Helpers puros (getDayKey, getDayTotals, ...)
│   ├── events.test.ts            [NOVO]
│   └── date-utils.ts             [DELETAR]
├── hooks/
│   ├── useTracker.ts             [NOVO]   Fonte única de verdade
│   ├── useTracker.test.ts        [NOVO]
│   ├── use-mobile.tsx                      (inalterado)
│   └── use-toast.ts                        (inalterado)
├── components/
│   ├── NewEventDrawer.tsx        [NOVO]
│   ├── CounterCard.tsx           [MODIFICAR]
│   ├── CalendarView.tsx          [MODIFICAR]
│   ├── MonthlyChart.tsx          [MODIFICAR]
│   ├── NavLink.tsx                         (inalterado)
│   └── ui/                       [LIMPAR — manter só os em uso]
├── App.tsx                       [MODIFICAR]  Vira shell
└── main.tsx                                (inalterado)
```

## Helpers puros (`src/lib/events.ts`)

Trabalham com wall-clock local, sem fuso horário.

```ts
import { TrackerEvent, DayTotals, EventType } from '@/types';

// "2026-04-08T14:30:00-03:00" → "2026-04-08"
export function getDayKey(timestamp: string): string;

// timestamp = agora, ISO local com offset
export function nowLocalIso(): string;

export function getEventsForDay(
  events: TrackerEvent[],
  dayKey: string
): TrackerEvent[];

export function getDayTotals(
  events: TrackerEvent[],
  dayKey: string
): DayTotals;

// range inclusivo de "YYYY-MM-DD" strings entre duas datas
export function getDaysInRange(from: Date, to: Date): string[];

// dayKey do dia de hoje (local)
export function todayKey(): string;
```

Todas testadas unitariamente.

## Hook `useTracker` (`src/hooks/useTracker.ts`)

```ts
interface UseTrackerAPI {
  events: TrackerEvent[];

  // mutações
  addEvent(input: {
    type: EventType;
    location?: string;
    reason?: string;
  }): void;
  removeEvent(id: string): void;
  updateEvent(
    id: string,
    patch: Partial<Omit<TrackerEvent, 'id'>>
  ): void;
  clearDay(dayKey: string): void;

  // queries
  getDayTotals(dayKey: string): DayTotals;
  getEventsForDay(dayKey: string): TrackerEvent[];
  getTodayTotals(): DayTotals;
}

export function useTracker(): UseTrackerAPI;
```

**Responsabilidades:**

- Estado interno: `TrackerEvent[]`
- `useEffect` de boot: carrega do localStorage, trata shape antiga
- `useEffect` de persistência: escreve no localStorage sempre que `events` muda (sem guard)
- `addEvent` gera `id` (uuid v4), `timestamp` via `nowLocalIso()`, normaliza location/reason (string vazia → `undefined`), insere preservando ordem por timestamp
- Queries são memoizadas (`useMemo`) quando apropriado
- **Sem toasts aqui** — efeitos de UI são responsabilidade dos componentes que chamam

## Componentes

### `App.tsx` (refactor — shell)

Perde: estado de `data`, `useEffect` de load/save, `incrementCount`, `resetCount`, lógica de toast, todo estado do dialog.

Ganha:
- `const tracker = useTracker()`
- `const [drawerType, setDrawerType] = useState<EventType | null>(null)`
- `const [editingDay, setEditingDay] = useState<string | null>(null)`
- Renderiza `<CounterCard>` (2x), `<CalendarView>`, `<NewEventDrawer>`, `<EditDayDialog>`

### `CounterCard.tsx` (modificar)

- Props: `type: EventType`, `count: number`, `onTap: () => void`
- `onTap` abre o drawer (`setDrawerType(type)` no pai)
- Remove a prop `onReset` e o botão "Zerar" — ação de limpar dia passa pra dentro do EditDayDialog
- Remove toda a lógica de hover com `useState` + inline style — usa classes Tailwind `hover:` diretamente
- Label e ícone derivam de `type`: `tobacco` → "Tabaco" + `Cigarette`; `cannabis` → "Cannabis" + `Leaf`

### `NewEventDrawer.tsx` (novo)

Usa shadcn `Drawer` (`vaul`).

```tsx
<Drawer open={open} onOpenChange={onOpenChange}>
  <DrawerContent>
    <DrawerHeader>
      <DrawerTitle>Registrar {label}</DrawerTitle>
    </DrawerHeader>
    <div className="p-4 space-y-3">
      <Input placeholder="Onde? (casa, trabalho, bar...)" ... />
      <Input placeholder="Por quê? (primeiro do dia, pós almoço...)" ... />
    </div>
    <DrawerFooter>
      <Button onClick={handleSubmit}>Registrar</Button>
    </DrawerFooter>
  </DrawerContent>
</Drawer>
```

Props: `open`, `onOpenChange`, `type`, `onSubmit(input)`.

Submit: chama `onSubmit({ type, location, reason })`, dispara toast `+1 tabaco/cannabis`, reseta inputs, fecha.

Form implementado como state controlled simples. Se for decidido usar `react-hook-form` na execução, a API do componente não muda.

### `CalendarView.tsx` (modificar)

- Remove interface `DayData` local → importa de `@/types`
- Recebe `getDayTotals: (dayKey: string) => DayTotals` e `onDayClick: (dayKey: string) => void` como props (em vez de `data: Record<string, DayData>`)
- Usa `getDaysInRange` + `todayKey` de `@/lib/events` no lugar de `getWeekDays`/`getMonthDays` locais
- Substitui `dayData.cigarette` → `totals.tobacco`, `dayData.leaf` → `totals.cannabis`
- Passa `getDayTotals` adiante pro MonthlyChart

### `MonthlyChart.tsx` (modificar)

- Remove interface `DayData` local → importa de `@/types`
- Recebe `getDayTotals` e a lista de `dayKeys` do mês (em vez de `Record<string, DayData>` e `Date[]`)
- `YAxis domain` passa de `[0, 6]` hardcoded para `['auto', 'auto']` (ou `[0, dataMax]`)
- Remove o comentário-TODO abandonado em `handleChartClick`
- Atualiza `dataKey` das `<Bar>`: `cigarette` → `tobacco`, `leaf` → `cannabis`

### `EditDayDialog` (modificar — hoje é inline no App.tsx, vira componente)

Antes: dois inputs numéricos (cigarro / folha). Depois: lista de eventos do dia + ações.

Conteúdo:
- Título: "Dia DD/MM/YYYY"
- Lista dos eventos daquele dia, cada item com:
  - Ícone por tipo + hora (HH:MM)
  - `location` e `reason` (quando presentes)
  - Botão remover
- Botão "Limpar dia" (destrutivo, confirma antes)

**MVP desta fundação:** listar eventos do dia + remover um evento individual + limpar dia inteiro (com confirmação). Editar inline `location` e `reason` de um evento existente fica fora de escopo deste sub-projeto.

## Testes

**Novas dependências de runtime:** `uuid` (usado pelo hook para gerar `id` dos eventos).

**Novas dev-deps:** `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@types/uuid`.

**`src/lib/events.test.ts`:**

- `getDayKey` extrai `YYYY-MM-DD` da porção local de um ISO com offset
- `getDayKey` preserva a data local mesmo perto de meia-noite (ex: `"2026-04-08T23:59:59-03:00"` → `"2026-04-08"`)
- `nowLocalIso` retorna string parseável terminada em offset
- `getEventsForDay` filtra por dayKey corretamente
- `getDayTotals` soma por tipo, retorna `{ tobacco: 0, cannabis: 0 }` pra dia sem eventos
- `getDaysInRange` retorna range inclusivo, ordem ascendente
- `todayKey` retorna formato `YYYY-MM-DD`

**`src/hooks/useTracker.test.ts`:**

- Boot sem dados → `events` vazio
- Boot com eventos válidos → carrega
- Boot com shape antiga (`{ "2026-04-01": { cigarette, leaf } }`) → descarta, `events` vazio
- `addEvent` insere com `id` e `timestamp` gerados
- `addEvent` persiste no localStorage
- `addEvent` normaliza `location: ''` para `undefined`
- `removeEvent` remove por `id` e persiste
- `updateEvent` aplica patch parcial sem afetar outros campos
- `clearDay('2026-04-08')` remove apenas eventos daquele dia
- `getTodayTotals` soma eventos do dia de hoje por tipo
- `getDayTotals('YYYY-MM-DD')` retorna soma correta

**`package.json` scripts:**

```json
{
  "test": "vitest",
  "test:run": "vitest run"
}
```

**`vitest.config.ts`:** configuração mínima com `environment: 'jsdom'` e alias `@` igual ao Vite.

## Limpeza de dependências

**Componentes a deletar de `src/components/ui/`:** accordion, alert-dialog, aspect-ratio, avatar, breadcrumb, calendar, carousel, chart, checkbox, collapsible, command, context-menu, dropdown-menu, form *(a menos que drawer use RHF)*, hover-card, input-otp, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, switch, table, textarea, toggle, toggle-group.

**Dependências npm a remover:** `@radix-ui/react-accordion`, `@radix-ui/react-alert-dialog`, `@radix-ui/react-aspect-ratio`, `@radix-ui/react-avatar`, `@radix-ui/react-checkbox`, `@radix-ui/react-collapsible`, `@radix-ui/react-context-menu`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-hover-card`, `@radix-ui/react-menubar`, `@radix-ui/react-navigation-menu`, `@radix-ui/react-popover`, `@radix-ui/react-progress`, `@radix-ui/react-radio-group`, `@radix-ui/react-scroll-area`, `@radix-ui/react-select`, `@radix-ui/react-separator`, `@radix-ui/react-slider`, `@radix-ui/react-switch`, `@radix-ui/react-toggle`, `@radix-ui/react-toggle-group`, `cmdk`, `embla-carousel-react`, `input-otp`, `react-day-picker`, `react-resizable-panels`, `date-fns-tz`.

**Manter:** `@radix-ui/react-dialog`, `@radix-ui/react-label`, `@radix-ui/react-slot`, `@radix-ui/react-tabs`, `@radix-ui/react-toast`, `@radix-ui/react-tooltip`, `class-variance-authority`, `clsx`, `date-fns`, `lucide-react`, `next-themes`, `react`, `react-dom`, `recharts`, `sonner`, `tailwind-merge`, `tailwindcss-animate`, `vaul`.

**Condicionais (decidir na execução):** `react-hook-form`, `@hookform/resolvers`, `zod` — removidos se o drawer usar state controlled.

## Critérios de aceitação

1. Toque em "Tabaco" ou "Cannabis" abre bottom drawer com dois inputs opcionais + botão registrar
2. Registrar cria um `TrackerEvent` com `id`, `timestamp` ISO local, `type`, e `location`/`reason` quando preenchidos
3. Totais do dia nos cards refletem eventos em tempo real
4. Vista semanal e mensal usam totais derivados dos eventos
5. MonthlyChart escala o eixo Y automaticamente pelo valor máximo real
6. Recarregar a página preserva eventos
7. Se existir shape antiga no localStorage, é descartada sem crash
8. `npm test` roda a suíte de `events` e `useTracker` e passa
9. `npm run build` gera o HTML único sem warnings novos
10. `src/components/ui/` contém apenas componentes em uso real
11. Dialog de editar dia permite visualizar eventos do dia, remover um evento individual, e limpar o dia inteiro
12. Nenhum uso de `date-fns-tz` ou fuso hardcoded no código restante
13. Grep por `smoke-leaf-counter`, `Smoke Leaf Counter`, `Puff Tracker`, `puff-tracker`, `vite_react_shadcn` retorna **zero** resultados (exceto neste próprio spec e no histórico git)
14. `package.json.name` é `smoking-tracker`; título da aba do browser é `Smoking Tracker`

## Fora de escopo (próximos sub-projetos)

- Export/import JSON, navegação de meses anteriores (sub-projeto #2)
- Streaks, médias, tendência, metas diárias (sub-projeto #3)
- Undo, decremento, validação avançada, atalhos, autocomplete de location/reason (sub-projeto #4)
- Redesign visual, dark mode toggle, PWA (sub-projeto #5)
- Backend / sincronização remota
