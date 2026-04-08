Export/Import JSON e Navegação de Meses — Sub-projeto #2
=========================================================

**Data:** 2026-04-08
**Status:** Design aprovado, aguardando plano de implementação
**Escopo:** Segundo dos 5 sub-projetos da evolução do `smoking-tracker`. Adiciona export/import de eventos como arquivo JSON e navegação temporal (meses anteriores) na aba Mês do calendário.

## Contexto

A fundação (sub-projeto #1) estabeleceu um hook `useTracker` como fonte única de verdade sobre uma lista de `TrackerEvent[]`, persistida em `localStorage['smoking-tracker']`. A `CalendarView` hoje mostra sempre o mês atual (`startOfMonth(today)` / `endOfMonth(today)`) e não há nenhuma forma de exportar/importar dados — se o usuário perder o `localStorage` perde tudo, e não há como ver histórico de meses anteriores mesmo que os eventos ainda existam.

Este sub-projeto resolve as duas lacunas em um único design porque compartilham muito pouco código e zero risco de interferência: export/import mexe em helpers puros novos + dois métodos no hook; navegação de mês mexe apenas em `CalendarView`.

## Decisões arquiteturais

### Export/import como helpers puros + métodos finos no hook

Toda a lógica pesada (serialização, validação estrita, merge com dedupe) mora em `src/lib/export.ts` como funções puras, testáveis sem React. O `useTracker` ganha dois métodos (`exportEvents`, `importEvents`) que são wrappers finos sobre esses helpers. Segue o mesmo padrão da fundação: lógica pura em `lib/`, hooks apenas orquestram.

### Validação estrita do arquivo importado

O parser rejeita o arquivo inteiro se qualquer coisa estiver fora do schema esperado. Não há modo tolerante. Quatro categorias de erro distintas (`invalid-json`, `invalid-shape`, `unsupported-version`, `invalid-events`) permitem mensagens de erro específicas ao usuário.

**Por quê:** o usuário pode selecionar qualquer arquivo por engano — um JSON de outro app, uma shape de versão futura, um arquivo corrompido. Validação estrita evita importar lixo silencioso e entra em contradição direta com a liberdade dada ao parse do `localStorage` (que limpa e começa do zero). A diferença: dados no `localStorage` são efêmeros por natureza; um arquivo de backup é escolha deliberada do usuário e merece feedback explícito.

### Merge por `id` com dedupe

`importEvents` faz merge: adiciona eventos do arquivo que ainda não existem (por `id`) e mantém os existentes em caso de colisão. Como `id` é uuid v4, colisão acidental é ~impossível — o merge é seguro e permite importar múltiplos backups ou consolidar devices futuros sem perder dados.

O resultado do merge é comunicado via toast: `"Importados N eventos (M duplicados ignorados)"`.

### Versionamento do arquivo exportado

O arquivo tem `version: 1` no header, junto com `exportedAt`, `eventCount`, `dateRange` e `events`. Isso é consciente da decisão inversa tomada no sub-projeto #1 para o `localStorage` (sem versão, descarta shape antiga). A diferença: um arquivo de backup tem vida longa e pode ser importado em uma versão do app muito posterior — versionar aqui é o único mecanismo honesto para evoluir o schema no futuro sem quebrar backups antigos.

`eventCount` e `dateRange` são **metadados informativos** (úteis para o usuário abrir o JSON e inspecionar a olho), **não validados** contra `events` na importação — confiar neles seria frágil sem ganho real.

### Navegação de mês limitada aos dados

Setas `‹` e `›` na aba Mês do `CalendarView`. Limites:

- Seta direita desabilitada quando `viewMonth === mês atual` (não faz sentido ver o futuro).
- Seta esquerda desabilitada quando `viewMonth <= mês do evento mais antigo`. Sem eventos, ambas desabilitadas.

**Por quê:** navegar por meses vazios não adiciona valor; limitar aos dados é a leitura mais honesta do histórico. Custa um `min()` sobre os timestamps.

### Semana sem navegação

A aba Semana continua sendo "últimos 7 dias até hoje" — sem setas, sem estado próprio. Navegar semanas anteriores traz pouco valor que a aba Mês não mostre melhor.

### Estado de navegação mora em `CalendarView`

O `viewMonth` é estado puramente local ao calendário — nenhum outro componente precisa dele. Não há motivo para subir pro `App.tsx` ou pro hook. O `EditDayDialog` continua funcionando sem alterações porque já opera sobre qualquer `dayKey`.

### SettingsDrawer como entrada única para ações administrativas

Export e import ficam agrupados em um novo `SettingsDrawer` aberto por um ícone de engrenagem no header. O drawer reaproveita o `vaul`/shadcn `Drawer` já usado pelo `NewEventDrawer`, mantendo o vocabulário visual consistente. Também abre espaço natural para o sub-projeto #5 (dark mode toggle, PWA settings) reutilizar o mesmo componente no futuro.

## Modelo de dados

### Arquivo exportado (`src/lib/export.ts`)

```ts
export const EXPORT_VERSION = 1;

export interface ExportFile {
  version: 1;
  exportedAt: string;                      // ISO local com offset, via nowLocalIso()
  eventCount: number;                      // events.length
  dateRange: {
    from: string | null;                   // dayKey do primeiro evento, null se vazio
    to: string | null;                     // dayKey do último evento, null se vazio
  };
  events: TrackerEvent[];                  // ordem ascendente por timestamp
}
```

**Nome do arquivo baixado:** `smoking-tracker-YYYY-MM-DD.json`, onde `YYYY-MM-DD = todayKey()`.

**Formatação:** `JSON.stringify(file, null, 2)` — pretty-printed, legível a olho nu.

### Tipos de resultado

```ts
export type ImportError =
  | 'invalid-json'
  | 'invalid-shape'
  | 'unsupported-version'
  | 'invalid-events';

export type ParseResult =
  | { ok: true; events: TrackerEvent[]; exportedAt: string; eventCount: number }
  | { ok: false; error: ImportError };

export interface MergeResult {
  merged: TrackerEvent[];
  added: number;
  skipped: number;
}

export type ImportOutcome =
  | { ok: true; added: number; skipped: number }
  | { ok: false; error: ImportError };
```

## Helpers puros (`src/lib/export.ts`) — NOVO

```ts
// Monta o objeto de export a partir dos eventos atuais.
export function buildExport(events: TrackerEvent[]): ExportFile;

// Serializa em JSON pretty-printed. Wrapper trivial.
export function serializeExport(events: TrackerEvent[]): string;

// Parser estrito. Nunca lança — retorna ParseResult discriminado.
export function parseImport(raw: string): ParseResult;

// Merge por id. Mantém o existente em caso de colisão, reordena por timestamp.
export function mergeEvents(
  current: TrackerEvent[],
  incoming: TrackerEvent[]
): MergeResult;
```

### Regras de validação estrita (`parseImport`)

Ordem de checagem:

1. `JSON.parse(raw)` falha → `{ ok: false, error: 'invalid-json' }`
2. Raiz não é objeto não-nulo, ou faltam os campos `version`, `exportedAt`, `eventCount`, `dateRange`, `events` → `'invalid-shape'`
3. `version !== 1` → `'unsupported-version'`
4. `events` não é array, **ou** algum item não bate `{ id: string, timestamp: string, type: 'tobacco' | 'cannabis', location?: string, reason?: string }` → `'invalid-events'`

Campo desconhecido no nível raiz ou dentro de um evento: **rejeita** (modo estrito). A permissividade para campos extras fica fora do escopo; se um sub-projeto futuro adicionar um campo opcional, a bump de `version` comunica a mudança explicitamente.

`eventCount` e `dateRange` não são cruzados contra `events`.

### `mergeEvents`

- Monta `Set` com `id` dos eventos atuais.
- Percorre `incoming`: se `id` já está no set, incrementa `skipped`; senão empurra no acumulador e incrementa `added`.
- Concatena com os atuais e ordena por `timestamp` ascendente.
- Retorna `{ merged, added, skipped }`.

## Extensão do `useTracker` (`src/hooks/useTracker.ts`)

API ganha dois métodos; o resto fica intacto.

```ts
export interface UseTrackerAPI {
  // ...todos os métodos atuais
  exportEvents(): string;
  importEvents(raw: string): ImportOutcome;
}
```

**Comportamento:**

- `exportEvents()` → retorna `serializeExport(events)`. Sem side effects.
- `importEvents(raw)`:
  1. `const parsed = parseImport(raw)`
  2. Se `!parsed.ok` → retorna `{ ok: false, error: parsed.error }`
  3. `const { merged, added, skipped } = mergeEvents(events, parsed.events)`
  4. `setEvents(merged)` — persistência acontece via o `useEffect` de save já existente, nada novo
  5. Retorna `{ ok: true, added, skipped }`

## Helpers novos em `src/lib/events.ts`

```ts
// startOfMonth do evento mais antigo. null se events === [].
// Usado para o limite esquerdo da navegação.
export function getEarliestEventMonth(events: TrackerEvent[]): Date | null;

// 'YYYY-MM' de uma Date, usando wall-clock local.
// Usado para comparar se viewMonth é o mês atual.
export function getMonthKey(date: Date): string;
```

O limite direito da navegação é sempre o mês de hoje, por definição — não precisa de helper. Por isso só o `earliest` é exposto.

## Componentes

### `CalendarView.tsx` (modificar)

**Props novas:**

```ts
interface CalendarViewProps {
  getDayTotals: (dayKey: string) => DayTotals;
  onDayClick: (dayKey: string) => void;
  events: TrackerEvent[];    // NOVO — só usado para limites de navegação
}
```

**Estado novo:**

```ts
const [viewMonth, setViewMonth] = useState<Date>(() => startOfMonth(new Date()));
```

**Lógica:**

- `const earliest = useMemo(() => getEarliestEventMonth(events), [events]);`
- `monthDays = getDaysInRange(startOfMonth(viewMonth), endOfMonth(viewMonth))`
- `canGoBack = earliest !== null && viewMonth > earliest`
- `canGoForward = getMonthKey(viewMonth) !== getMonthKey(new Date())`
- `goBack()` → `setViewMonth(subMonths(viewMonth, 1))` quando `canGoBack`
- `goForward()` → `setViewMonth(addMonths(viewMonth, 1))` quando `canGoForward`

**UI — header do mês acima do `MonthlyChart`:**

```
  ‹   Abril 2026   ›
```

- `‹`/`›` via `Button variant="ghost" size="icon"` com `ChevronLeft`/`ChevronRight` de `lucide-react`.
- Label: `format(viewMonth, "MMMM yyyy", { locale: ptBR })`, via `date-fns/locale` (sem dependência nova — já vem com `date-fns`).
- Primeira letra maiúscula via classe Tailwind `capitalize`.
- Setas desabilitadas usam a prop `disabled` do `Button` (opacidade/cursor cuidados pela própria variant).

A aba Semana continua usando `subDays(new Date(), 6)` até `new Date()` — sem mudança, sem interação com `viewMonth`.

### `SettingsDrawer.tsx` (novo)

Usa shadcn `Drawer` (`vaul`), seguindo o mesmo padrão do `NewEventDrawer`.

**Props:**

```ts
interface SettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: () => string;
  onImport: (raw: string) => ImportOutcome;
}
```

**Conteúdo:**

- `DrawerTitle`: "Configurações"
- Seção "Exportar dados"
  - Texto curto: "Baixa um arquivo JSON com todos os seus eventos."
  - `Button` "Exportar JSON" → handler:
    1. `const json = onExport()`
    2. Cria `Blob([json], { type: 'application/json' })`
    3. Cria URL via `URL.createObjectURL`, dispara download via `<a>` programático com `download = 'smoking-tracker-${todayKey()}.json'`
    4. `URL.revokeObjectURL` após o click
    5. `toast.success('Backup exportado')`
- Seção "Importar dados"
  - Texto curto: "Adiciona eventos de um backup. Duplicados (mesmo id) são ignorados."
  - `<input type="file" accept="application/json" ref={inputRef} hidden>` + `Button` "Escolher arquivo" que dispara `inputRef.current?.click()`
  - `onChange` do input:
    1. `const file = e.target.files?.[0]`; se ausente, retorna
    2. `const raw = await file.text()`
    3. `const result = onImport(raw)`
    4. Toast:
       - `ok: true` → `toast.success("Importados ${added} eventos (${skipped} duplicados ignorados)")`
       - `ok: false` → `toast.error(...)` com mensagem por tipo:
         - `invalid-json` → "Arquivo não é um JSON válido"
         - `invalid-shape` → "Arquivo não parece ser um backup do Smoking Tracker"
         - `unsupported-version` → "Versão do arquivo não suportada"
         - `invalid-events` → "Arquivo contém eventos inválidos"
    5. `e.target.value = ''` para permitir re-selecionar o mesmo arquivo

### `App.tsx` (modificar)

- Novo estado: `const [settingsOpen, setSettingsOpen] = useState(false)`
- Header: adicionar ícone `Settings` do `lucide-react` como `Button variant="ghost" size="icon"` alinhado à direita. Layout do header muda para posicionar o botão no canto superior direito mantendo o título visualmente centralizado (grid ou flex com spacer; decisão de layout na execução).
- Passar `events={tracker.events}` para `<CalendarView>`
- Renderizar `<SettingsDrawer open={settingsOpen} onOpenChange={setSettingsOpen} onExport={tracker.exportEvents} onImport={tracker.importEvents} />`
- Nenhum outro componente muda.

## Testes

**`src/lib/export.test.ts` (novo):**

- `buildExport` com eventos vazios → `eventCount: 0`, `dateRange: { from: null, to: null }`
- `buildExport` com eventos → `eventCount` correto, `dateRange.from`/`to` são os dayKeys dos extremos, `events` preservados
- `serializeExport` produz JSON parseável cujo roundtrip (`JSON.parse`) bate com `buildExport`
- `parseImport` com JSON inválido → `invalid-json`
- `parseImport` com raiz não-objeto / campos faltando → `invalid-shape`
- `parseImport` com `version: 2` → `unsupported-version`
- `parseImport` com `events` não-array → `invalid-events`
- `parseImport` com evento sem `id`/`timestamp`/`type` → `invalid-events`
- `parseImport` com `type: 'outro'` → `invalid-events`
- `parseImport` com arquivo válido → `ok: true` com events
- `mergeEvents([], incoming)` → todos adicionados
- `mergeEvents(current, [])` → nenhum adicionado, nenhum skipado
- `mergeEvents` com sobreposição → conta added/skipped corretos, mantém existente, ordena ascendente

**`src/lib/events.test.ts` (adicionar):**

- `getEarliestEventMonth([])` → `null`
- `getEarliestEventMonth` com um evento → `startOfMonth` daquele evento
- `getEarliestEventMonth` com eventos em meses diferentes → `startOfMonth` do mais antigo
- `getMonthKey(new Date('2026-04-08'))` → `'2026-04'`

**`src/hooks/useTracker.test.ts` (adicionar):**

- `exportEvents` + `importEvents` em outro hook instance → roundtrip restaura os eventos
- `importEvents` com JSON inválido → `{ ok: false, error: 'invalid-json' }`, estado inalterado
- `importEvents` com eventos novos sobre estado pré-existente → `added` correto, `events` combinado
- `importEvents` com todos os eventos já presentes → `added: 0, skipped: N`, persistência dispara mas conteúdo não muda

Navegação de mês (`CalendarView`) fica sem teste automatizado, seguindo o padrão do sub-projeto #1 ("componentes são validados no olho"). A lógica que sustenta os limites (`getEarliestEventMonth`, `getMonthKey`) é testada unitariamente.

## Dependências

Nenhuma nova dependência runtime. Todas as ferramentas necessárias já estão no projeto:

- `vaul` (Drawer), `sonner` (toasts), `lucide-react` (ícones), `date-fns` + `date-fns/locale` (formatação/manipulação), `uuid` (já usado pelo hook).

Nenhuma remoção também.

## Critérios de aceitação

1. Clicar no ícone de engrenagem no header abre o `SettingsDrawer`
2. "Exportar JSON" baixa um arquivo `smoking-tracker-YYYY-MM-DD.json` com `version: 1`, `exportedAt`, `eventCount`, `dateRange` e `events`
3. Importar um arquivo válido com eventos novos adiciona-os ao estado, persiste, e mostra toast com contagem
4. Importar um arquivo válido contendo apenas eventos já existentes não altera o estado e mostra toast com `skipped`
5. Importar um arquivo com JSON inválido, shape errada, versão diferente de 1, ou eventos malformados rejeita o arquivo inteiro e mostra toast de erro específico
6. O mesmo arquivo pode ser re-selecionado pelo `<input type="file">` sem recarregar a página
7. Aba Mês mostra header com `‹ Abril 2026 ›` (nome do mês em pt-BR)
8. Seta esquerda navega para o mês anterior; seta direita navega para o próximo
9. Seta direita desabilita quando `viewMonth` é o mês atual
10. Seta esquerda desabilita quando `viewMonth` é o mês do evento mais antigo (ou se não há eventos)
11. Clicar em um dia de um mês passado abre o `EditDayDialog` com os eventos daquele dia
12. Aba Semana continua mostrando os últimos 7 dias até hoje, sem navegação
13. `npm test` passa incluindo os testes novos de `export`, `events` (novos helpers) e `useTracker` (export/import)
14. `npm run build` gera o HTML sem warnings novos

## Fora de escopo (próximos sub-projetos)

- Streaks, médias, tendência, metas diárias (sub-projeto #3)
- Undo, decremento, validação avançada, atalhos, autocomplete de location/reason (sub-projeto #4)
- Redesign visual, dark mode toggle, PWA (sub-projeto #5)
- Backend / sincronização remota
- Navegação de semanas anteriores
- Edição inline de `location`/`reason` de eventos já existentes
- Export recortado por período (só mês visível, só tabaco, etc.)
- Merge modes alternativos (substituir em vez de dedupe)
