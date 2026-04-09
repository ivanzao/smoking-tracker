# Redução Guiada — Sub-projeto #3

**Data:** 2026-04-09
**Status:** Design aprovado, aguardando plano de implementação
**Escopo:** Terceiro sub-projeto da evolução do `smoking-tracker`. Introduz meta diária única (total de eventos), streak de dias dentro da meta com feedback imediato, e métricas de apoio (média móvel 7 dias + delta vs período anterior) pra o usuário verificar se está efetivamente reduzindo o consumo.

## Contexto

Sub-projetos #1 (fundação técnica) e #2 (export/import + navegação de meses) estão entregues. A base atual expõe eventos individuais com timestamp local, hook `useTracker` testável como fonte única de verdade, helpers puros em `src/lib/events.ts`, export/import JSON, e navegação de meses no calendário.

O roadmap original do #1 listou este sub-projeto como "streaks, médias, tendência, metas diárias" — quatro capacidades. O brainstorm restringiu o objetivo a **redução guiada**: a meta e o streak são o coração, e as médias/tendência existem como suporte pra responder *"estou conseguindo reduzir?"*.

## Decisões de produto

### Objetivo: redução guiada, não autoconhecimento

O app passa a ter uma posição opinada. A meta pressiona pra baixo, o streak recompensa a constância, a média móvel valida (ou desmente) a percepção de progresso. Continua sem julgamento verbal — tudo é número e cor — mas deixa de ser um contador neutro.

### Meta única, total de eventos por dia

Uma meta só, contando tabaco + cannabis somados. Decisão marcada como "por enquanto" durante o brainstorm — é a mais simples e é suficiente pro objetivo de redução. Se misturar os dois tipos começar a incomodar, uma segunda versão pode adicionar metas por tipo (fora de escopo deste sub-projeto).

### Meta com histórico, UI mínima

A meta guardada tem histórico: cada mudança registra a data a partir da qual passa a valer, e a avaliação de cada dia passado usa a meta vigente naquele dia. Isso mantém os cálculos retroativos honestos quando o usuário reduz a meta ao longo do tempo.

Apesar do histórico existir no dado, a UI não expõe nenhuma tela de edição histórica. O usuário vê/edita só o valor atual via SettingsDrawer. Correções retroativas ficam disponíveis via export/import JSON (já entregue no #2). YAGNI pra UI de gerenciamento de histórico.

### Streak com feedback imediato

Hoje conta no streak enquanto `total <= meta`. Se um novo evento faz o total passar da meta, o streak vai pra zero na hora, sem esperar o dia fechar. A ideia é criar tensão positiva: o usuário vê o streak quebrar no momento do impulso.

Dias sem eventos contam como "dentro" (zero ≤ qualquer meta). Dias sem meta vigente (antes da primeira configuração) não contam — nem a favor nem contra — e interrompem a contagem do streak.

### Primeiro uso = layout atual intocado

Enquanto o usuário não define uma meta, o layout é exatamente o que é hoje: contadores → calendário. O `MetricsCard` só aparece depois que a primeira meta é configurada. Primeiro uso continua sendo zero ruído; a feature se revela quando o usuário escolhe engajar.

## Modelo de dados

```ts
// src/types.ts (acrescenta)

export interface GoalEntry {
  id: string;               // uuid v4
  limit: number;            // inteiro positivo, eventos/dia totais (tabaco + cannabis)
  effectiveFrom: string;    // dayKey "YYYY-MM-DD", inclusivo
}

// StorageShape passa a ser:
export interface StorageShape {
  events: TrackerEvent[];
  goals: GoalEntry[];       // ordenado por effectiveFrom asc; pode estar vazio
}
```

### Regras do histórico de metas

- Lista vazia = usuário nunca configurou meta. `MetricsCard` não aparece.
- `goals[i]` vigora de `effectiveFrom[i]` até `effectiveFrom[i+1] - 1 dia`; a última entrada vigora até hoje e adiante.
- Antes da primeira `effectiveFrom`: sem meta vigente. Dias nesse intervalo ficam neutros no calendário e interrompem o streak.
- `setGoal(limit)` com o mesmo valor da meta vigente: no-op.
- `setGoal(limit)` cria uma entrada com `effectiveFrom = todayKey()`. Se já existir uma entrada com `effectiveFrom = hoje`, é sobrescrita (evita lixo quando o usuário mexe várias vezes no mesmo dia).
- `setGoal(null)` remove a entrada vigente se sua `effectiveFrom <= hoje`; caso contrário no-op. O usuário volta pro estado "sem meta".

### Persistência

**Boot:**

1. Lê `localStorage['smoking-tracker']`. Ausente → `{ events: [], goals: [] }`.
2. Parse JSON. Falhou → descarta, estado zerado.
3. `events` não é array ou contém item inválido → descarta tudo, estado zerado.
4. `goals` **ausente** → assume `[]`. Não é descarte, é default de um campo novo (permite carregar storage pré-#3).
5. `goals` presente mas não é array → descarta tudo, estado zerado.
6. `goals` presente com item inválido (`limit` não-inteiro, `limit <= 0`, `effectiveFrom` não bate `^\d{4}-\d{2}-\d{2}$`, `id` ausente) → descarta tudo, estado zerado.
7. Passou em tudo → carrega. Reordena `goals` por `effectiveFrom` asc como guarda contra imports fora de ordem.

**Escrita:** um único `useEffect` com deps `[events, goals]` grava `{ events, goals }` sempre que qualquer um muda. Sem guard de length.

### Export / import

- Export serializa `goals` junto com `events`. Se o formato de export tiver um número de versão, ele é incrementado.
- Import valida `goals` com o mesmo rigor do boot. Qualquer `GoalEntry` inválido rejeita o arquivo inteiro (mesma política do #2 pra `events`). Sem merge parcial.
- Arquivo exportado antes do #3 (sem campo `goals`) continua funcionando no import: carrega `events` e trata `goals` como `[]`.
- Import é substituição total de estado: `events` **e** `goals` são substituídos juntos, atomicamente. Não há importação seletiva.

## Arquitetura de módulos

```
src/
├── types.ts                      [MODIFICAR]  +GoalEntry, StorageShape.goals
├── lib/
│   ├── events.ts                            (inalterado)
│   ├── events.test.ts                       (inalterado)
│   ├── stats.ts                  [NOVO]     Helpers puros de metas, streak, médias
│   ├── stats.test.ts             [NOVO]
│   ├── export.ts                 [MODIFICAR] +goals no payload e na validação
│   └── export.test.ts            [MODIFICAR] +casos de goals
├── hooks/
│   ├── useTracker.ts             [MODIFICAR] +goals, setGoal, queries derivadas
│   └── useTracker.test.ts        [MODIFICAR] +casos de goals, streak reativo
├── components/
│   ├── MetricsCard.tsx           [NOVO]
│   ├── CounterCard.tsx                      (inalterado)
│   ├── CalendarView.tsx          [MODIFICAR] +pontinho de status por célula
│   ├── MonthlyChart.tsx          [MODIFICAR] +linha de média móvel (ComposedChart)
│   ├── SettingsDrawer.tsx        [MODIFICAR] +seção "Meta diária"
│   ├── EditDayDialog.tsx                    (inalterado)
│   └── NewEventDrawer.tsx                   (inalterado)
└── App.tsx                       [MODIFICAR] +render condicional de MetricsCard
```

## Helpers puros (`src/lib/stats.ts`)

Todas as funções são puras, sem React, testáveis isoladamente. Trabalham com `TrackerEvent[]` e `GoalEntry[]` como entrada.

```ts
import { TrackerEvent, GoalEntry } from '@/types';

export type DayGoalStatus = 'within' | 'over' | 'no-goal';

/** Meta vigente num dia específico. null se nenhuma meta cobre aquele dia. */
export function getGoalForDay(goals: GoalEntry[], dayKey: string): GoalEntry | null;

/** Meta vigente hoje. Atalho de getGoalForDay(goals, todayKey()). */
export function getCurrentGoal(goals: GoalEntry[]): GoalEntry | null;

/**
 * Status do dia em relação à meta vigente naquele dia.
 *  - 'within':  dayTotal <= goal.limit
 *  - 'over':    dayTotal > goal.limit
 *  - 'no-goal': não há meta vigente naquele dia
 */
export function getDayGoalStatus(
  events: TrackerEvent[],
  goals: GoalEntry[],
  dayKey: string
): DayGoalStatus;

/**
 * Streak atual de dias consecutivos dentro da meta, ancorado em hoje.
 *
 * Regras:
 *  - Se hoje é 'within', conta hoje + dias anteriores consecutivos 'within',
 *    parando no primeiro 'over' OU 'no-goal'.
 *  - Se hoje é 'over', streak = 0 (quebrou hoje).
 *  - Se hoje é 'no-goal', streak = 0.
 *  - Dias sem eventos contam como 'within' (0 <= limit).
 */
export function getCurrentStreak(
  events: TrackerEvent[],
  goals: GoalEntry[]
): number;

/**
 * Média diária dos últimos N dias (anchor inclusivo), em eventos/dia (total).
 * Divide o total de eventos no range por N, não pelo número de dias com eventos.
 */
export function getRollingAverage(
  events: TrackerEvent[],
  days: number,
  anchor?: string  // dayKey, default = todayKey()
): number;

/**
 * Delta percentual entre a média dos últimos N dias e os N dias anteriores a esses.
 * Retorna:
 *  - number: (atual - anterior) / anterior, ex: -0.15 para -15%
 *  - null:   se o período anterior tem zero eventos (delta indefinido)
 */
export function getAverageDelta(
  events: TrackerEvent[],
  days: number
): number | null;

/**
 * Série de média móvel de N dias sobre uma lista de dayKeys.
 * Para cada dayKey, calcula a média dos N dias terminando naquele dia (inclusivo).
 * Usado pelo MonthlyChart pra desenhar a linha de tendência.
 */
export function getMovingAverageSeries(
  events: TrackerEvent[],
  dayKeys: string[],
  windowDays: number
): Array<{ dayKey: string; average: number }>;
```

**Notas de design:**

- `getCurrentStreak` encapsula toda a regra de "quando hoje conta" numa função só. O componente só pede o número.
- `getRollingAverage` aceita `anchor` opcional pra facilitar testes determinísticos sem mock de `Date`.
- `getMovingAverageSeries` recebe `dayKeys` de fora pra não duplicar lógica de range com os componentes que já calculam dias do mês.
- Nenhuma função toca `Date.now()` diretamente exceto indiretamente via `todayKey()`.

## Hook `useTracker` estendido

```ts
interface UseTrackerAPI {
  // --- já existente ---
  events: TrackerEvent[];
  addEvent(input: { type: EventType; location?: string; reason?: string }): void;
  removeEvent(id: string): void;
  updateEvent(id: string, patch: Partial<Omit<TrackerEvent, 'id'>>): void;
  clearDay(dayKey: string): void;
  getDayTotals(dayKey: string): DayTotals;
  getEventsForDay(dayKey: string): TrackerEvent[];
  getTodayTotals(): DayTotals;
  exportEvents(): string;
  importEvents(json: string): ImportResult;

  // --- novo ---
  goals: GoalEntry[];
  setGoal(limit: number | null): void;
  getCurrentGoal(): GoalEntry | null;
  getDayGoalStatus(dayKey: string): DayGoalStatus;
  getCurrentStreak(): number;
  getRollingAverage(days: number): number;
  getAverageDelta(days: number): number | null;
}
```

**Comportamentos:**

- **Boot e persistência** seguem as regras da seção "Persistência" acima.
- **`setGoal(limit)`**:
  - `limit === null` → remove a entrada vigente se existir; caso contrário no-op.
  - `limit > 0` e igual à meta vigente → no-op.
  - `limit > 0` e existe entrada com `effectiveFrom === todayKey()` → substitui `limit` nela.
  - Senão → append `{ id: uuid, limit, effectiveFrom: todayKey() }`.
  - Lista é mantida ordenada por `effectiveFrom` após qualquer mutação.
- **Validação de input:** se `limit` não for inteiro positivo finito, o hook ignora silenciosamente. O componente é responsável por validar antes (input numérico, botão Salvar desabilitado em valores inválidos). Sem toast interno — mantém a regra da fundação de que efeitos de UI são responsabilidade dos componentes.
- **Queries** delegam direto pros helpers puros de `stats.ts`. Sem memoização — volume de dados é pequeno, os helpers são baratos.
- **`exportEvents` / `importEvents`** passam a serializar e validar `goals`. Rejeitam import inválido inteiro.

## Componentes

### `MetricsCard.tsx` (novo)

Componente burro. Renderizado pelo `App` condicionalmente, só quando `tracker.getCurrentGoal()` é não-null.

**Props:**

```ts
interface MetricsCardProps {
  todayTotal: number;        // tabaco + cannabis de hoje
  goalLimit: number;         // tracker.getCurrentGoal()!.limit
  streak: number;            // tracker.getCurrentStreak()
  average7d: number;         // tracker.getRollingAverage(7)
  delta7d: number | null;    // tracker.getAverageDelta(7)
}
```

**Layout** (mesma estrutura desktop e mobile, baseado no mockup B aprovado):

- Card com `border`/`bg` coerente com `CounterCard`.
- Três blocos iguais separados por `border-l`.
- **Bloco 1 — "hoje / meta":** valor grande `{todayTotal}/{goalLimit}`, barra fina abaixo (`div` com `width: min(100%, total/limit * 100%)`). Cor verde (`bg-emerald-500`) se `todayTotal <= goalLimit`, vermelha (`bg-rose-500`) e 100% preenchida se passou.
- **Bloco 2 — "streak":** `🔥 {streak}` quando `streak > 0`; apenas `0` (sem emoji) quando `streak === 0`. Sublinha "dias na meta".
- **Bloco 3 — "média 7d":** valor com uma casa decimal, `toFixed(1)`. Sublinha com delta: `▼ {pct}%` verde se `delta7d < 0`, `▲ {pct}%` vermelho se `delta7d > 0`, `—` se `delta7d === null`.

Sem lógica interna além de formatação. Recebe tudo pronto.

### `CounterCard.tsx`

Inalterado.

### `CalendarView.tsx`

- Nova prop: `getDayGoalStatus: (dayKey: string) => DayGoalStatus`.
- Em cada célula de dia (semanal e mensal), renderiza um pontinho de ~6px no canto superior direito:
  - `'within'` → `bg-emerald-500`
  - `'over'` → `bg-rose-500`
  - `'no-goal'` → sem pontinho
- Pontinho é decorativo, `aria-hidden`. Sem tooltip, sem click, sem interação.
- Nenhuma outra mudança.

### `MonthlyChart.tsx`

- Substitui `BarChart` por `ComposedChart` do recharts.
- Adiciona um `<Line>` por cima das `<Bar>` com os pontos da série móvel 7d.
- Cor da linha: `stroke-emerald-500` (coerente com o pontinho de "within").
- A série é calculada no próprio `MonthlyChart` via `getMovingAverageSeries(tracker.events, dayKeys, 7)`. Recebe `events` como prop (ou o próprio hook — decisão na execução, contanto que não espalhe cálculo por múltiplos componentes).
- Eixo Y continua `['auto', 'auto']` e escala junto com a linha.
- Tooltip do recharts mostra os valores das barras + a média móvel naquele ponto.

### `SettingsDrawer.tsx`

Ganha uma seção "Meta diária" acima das ações de export/import existentes.

**Layout:**

```
┌─ Meta diária ──────────────────┐
│ Máx. eventos por dia (total)   │
│ [ input number ]   [Salvar]    │
│                                │
│ (link) Remover meta            │
└────────────────────────────────┘
```

- Input numérico controlado, inicia com `currentGoalLimit ?? ''`.
- "Salvar" habilitado apenas quando o valor é inteiro positivo finito. Ao clicar, chama `onSetGoal(Number(value))` e dispara toast `Meta atualizada`.
- "Remover meta" só aparece se `currentGoalLimit !== null`. Pede confirmação via `window.confirm('Remover meta atual? O streak volta pra zero.')`. Se confirmado, chama `onSetGoal(null)` e dispara toast `Meta removida`.

**Novas props:**

```ts
currentGoalLimit: number | null;
onSetGoal: (limit: number | null) => void;
```

### `App.tsx`

Ganha:

- `const currentGoal = tracker.getCurrentGoal();`
- `const todayTotal = totals.tobacco + totals.cannabis;`
- Render condicional de `<MetricsCard />` entre o grid de contadores e o `<CalendarView />`, só quando `currentGoal !== null`.
- Nova prop `getDayGoalStatus={tracker.getDayGoalStatus}` pro `CalendarView`.
- Novas props `currentGoalLimit={currentGoal?.limit ?? null}` e `onSetGoal={tracker.setGoal}` pro `SettingsDrawer`.

## Testes

**`src/lib/stats.test.ts`** (novo):

- `getGoalForDay` com range válido, range antes da primeira entrada, múltiplas entradas.
- `getCurrentGoal` retorna a última quando há meta vigente, `null` quando lista vazia.
- `getDayGoalStatus` → `'within'` pra `total <= limit`.
- `getDayGoalStatus` → `'over'` pra `total > limit`.
- `getDayGoalStatus` → `'within'` pra dia sem eventos.
- `getDayGoalStatus` → `'no-goal'` pra dia antes da primeira meta.
- `getCurrentStreak` = 0 quando hoje é `'over'`.
- `getCurrentStreak` inclui hoje quando `'within'`.
- `getCurrentStreak` para no primeiro `'over'` passado.
- `getCurrentStreak` para no primeiro `'no-goal'` passado.
- `getCurrentStreak` = 0 quando não há meta vigente hoje.
- `getCurrentStreak` conta sequência de 5+ dias corretamente.
- `getRollingAverage(7)` divide por 7, não pelo número de dias com eventos.
- `getRollingAverage` com `anchor` customizado.
- `getAverageDelta(7)` negativo quando atual < anterior.
- `getAverageDelta(7)` positivo quando atual > anterior.
- `getAverageDelta(7)` = `null` quando período anterior tem zero eventos.
- `getMovingAverageSeries` sobre sequência de dayKeys calcula janela móvel corretamente.

**`src/hooks/useTracker.test.ts`** (adições):

- Boot com `events` + `goals` válidos carrega ambos.
- Boot com `events` válidos mas sem `goals` → `goals: []`, sem crash.
- Boot com `goals` inválidos → storage descartado, estado zerado.
- `setGoal(10)` no primeiro uso cria entrada com `effectiveFrom = hoje`.
- `setGoal(10)` duas vezes no mesmo dia resulta em uma entrada.
- `setGoal(8)` depois de `setGoal(10)` no mesmo dia sobrescreve pra 8.
- `setGoal(10)` em dia posterior a entrada anterior faz append.
- `setGoal(null)` remove entrada vigente.
- `setGoal(-1)` / `setGoal(0)` / `setGoal(NaN)` são no-op.
- Após `setGoal(10)` + adicionar eventos que passam do limite, `getCurrentStreak()` retorna 0.
- Após remover evento que volta pro limite, `getCurrentStreak()` volta a contar.
- Mudança em `goals` dispara persistência no localStorage.

**`src/lib/export.test.ts`** (adições):

- Export inclui `goals` no payload.
- Import de payload sem `goals` carrega `events` e zera `goals`.
- Import com `goals` não-array rejeita arquivo inteiro.
- Import com `GoalEntry` inválido (`limit` zero, `effectiveFrom` malformado) rejeita.
- Import com `goals` válido substitui completamente o histórico anterior.

## Critérios de aceitação

1. Com nenhuma meta configurada, o layout é idêntico ao atual: contadores → calendário. Sem `MetricsCard` renderizado.
2. Definir meta via SettingsDrawer faz o `MetricsCard` aparecer imediatamente, entre contadores e calendário.
3. Bloco "hoje/meta" mostra `{total}/{limit}` onde `total = tabaco + cannabis` de hoje. Barra reflete `total/limit`.
4. Quando `total <= limit` a barra é verde; quando `total > limit` ela é vermelha e enche 100%.
5. Adicionar um evento que faz o total passar do limite quebra o streak na hora (`streak = 0` sem reload).
6. Remover um evento que faz o total voltar pro limite restaura o streak (inclui hoje novamente).
7. Bloco "streak" mostra `🔥 N` quando `N > 0` e `0` sem emoji quando `N === 0`.
8. Bloco "média 7d" mostra o valor com uma casa decimal e o delta percentual vs os 7 dias anteriores.
9. Quando os 7 dias anteriores têm zero eventos totais, o delta mostra `—`.
10. `MonthlyChart` desenha uma linha de média móvel de 7 dias sobreposta às barras, usando `ComposedChart` do recharts.
11. A linha de média móvel é visualmente distinta das barras e usa a mesma cor de "within".
12. `CalendarView` mostra um pontinho sutil (verde = within, vermelho = over) no canto superior direito de cada célula com meta vigente naquele dia. Dias sem meta ficam neutros.
13. O pontinho aparece nas vistas semanal e mensal.
14. `SettingsDrawer` tem uma seção "Meta diária" com input numérico, botão "Salvar", e link "Remover meta" (condicional).
15. Salvar meta com o mesmo valor da meta vigente é no-op (não cria duplicata no histórico).
16. Salvar meta duas vezes no mesmo dia com valores diferentes resulta em uma única entrada (com o último valor).
17. Remover meta pede confirmação via `window.confirm` e remove a entrada vigente.
18. Export JSON inclui o campo `goals` no payload.
19. Importar arquivo sem `goals` funciona (carrega events, zera goals).
20. Importar arquivo com `goals` inválido rejeita o arquivo inteiro sem mutar estado.
21. Recarregar a página preserva meta atual, histórico de metas, e todos os eventos.
22. `npm test` roda a suíte inteira (stats, events, useTracker, export) e passa.
23. `npm run build` gera o HTML único sem warnings novos.
24. Toda métrica derivada é calculada por função pura em `src/lib/stats.ts`; nenhum cálculo de streak/média vive em componente.

## Fora de escopo (próximos sub-projetos ou reavaliação futura)

- Best streak histórico / recorde pessoal.
- Metas separadas por tipo (tabaco vs cannabis). Fica anotado pra reavaliação se misturar os dois começar a incomodar.
- UI de edição do histórico de metas — correções retroativas via export/import JSON.
- Gráfico dedicado de streak.
- Notificações ou alertas quando o streak quebra.
- Metas semanais ou mensais.
- Undo, decremento, validação avançada (sub-projeto #4).
- Redesign visual, dark mode toggle, PWA (sub-projeto #5).
