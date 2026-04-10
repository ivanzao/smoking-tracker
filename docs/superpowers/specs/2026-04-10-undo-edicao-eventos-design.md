# Undo & Edição de Eventos — Sub-projeto #4

**Data:** 2026-04-10
**Branch:** a definir

**Escopo:** Quarto sub-projeto da evolução do `smoking-tracker`. Adiciona undo otimista com toast para addEvent e removeEvent, e edição completa de eventos existentes (type, timestamp, location, reason) via drawer dedicado.

**Pré-requisitos:** Sub-projetos #1 (fundação técnica), #2 (export/import + navegação de meses) e #3 (redução guiada) estão entregues. A base atual expõe `addEvent`, `removeEvent`, `updateEvent` e `clearDay` no hook `useTracker`, com testes abrangentes. O `EditDayDialog` lista eventos do dia com remoção individual e limpeza total. O `NewEventDrawer` cria eventos com `location` e `reason` opcionais. O sonner já é usado para toasts de confirmação.

O roadmap original listou este sub-projeto como "undo, decremento, validação avançada, atalhos, autocomplete de location/reason". O brainstorm restringiu o escopo a **undo e edição** — as únicas dores reais no uso diário. Decremento já está coberto pelo removeEvent existente. Autocomplete, atalhos e validação avançada ficam para sub-projetos posteriores.

---

## 1. Undo — modelo e hook

### Conceito

Um `pendingUndo` no `useTracker` que guarda a ação inversa da última mutação. O toast com "Desfazer" chama `executeUndo()`. Após 5s (duração do toast), o undo expira naturalmente.

### Tipo

```ts
type UndoAction =
  | { type: 'restore-event'; event: TrackerEvent }   // inverso de removeEvent
  | { type: 'remove-event'; eventId: string };        // inverso de addEvent
```

### API do hook (adições)

```ts
// No UseTrackerAPI:
pendingUndo: UndoAction | null;
executeUndo(): void;
```

### Fluxo addEvent

1. Cria o evento normalmente e adiciona ao state
2. Seta `pendingUndo = { type: 'remove-event', eventId }`
3. Toast aparece com botão "Desfazer" (5s)
4. Se clica "Desfazer": remove o evento pelo id, limpa pendingUndo
5. Se expira: pendingUndo fica no state até a próxima ação sobrescrevê-lo — sem consequência

### Fluxo removeEvent

1. Guarda cópia do evento antes de remover
2. Remove do state
3. Seta `pendingUndo = { type: 'restore-event', event }`
4. Toast com "Desfazer" (5s) → reinsere o evento no state

### Regras

- Uma nova ação (add ou remove) sobrescreve o pendingUndo anterior — só a última ação é desfeita
- `pendingUndo` não persiste em localStorage — refresh da página perde o undo (aceitável)
- `executeUndo()` sem pendingUndo é no-op

---

## 2. Toast de undo — integração com sonner

### Responsabilidade

**Quem dispara o toast:** o `App.tsx` e o `EditDayDialog`, não o hook. O hook só expõe `pendingUndo` e `executeUndo()`. Mantém a separação existente (App já faz `toast.success('+1 tabaco')` hoje).

### Toast de addEvent (App.tsx)

O toast existente de `+1 tabaco/cannabis` passa a incluir o botão "Desfazer":

```tsx
toast.success(`+1 ${label}`, {
  duration: 5000,
  action: {
    label: 'Desfazer',
    onClick: () => tracker.executeUndo(),
  },
});
```

### Toast de removeEvent (EditDayDialog)

Ao remover um evento, o EditDayDialog dispara:

```tsx
toast('Evento removido', {
  duration: 5000,
  action: {
    label: 'Desfazer',
    onClick: () => onUndo(),
  },
});
```

### Limpeza

O hook não precisa de timer próprio. O sonner controla a vida do toast (5s). Se o botão não for clicado, o undo simplesmente não acontece. O `pendingUndo` fica no state até a próxima ação sobrescrevê-lo.

---

## 3. Edição de eventos — EditEventDrawer

### Novo componente

`EditEventDrawer` — um drawer (mesmo estilo do `NewEventDrawer`) que abre quando o usuário toca num evento no `EditDayDialog`.

### Interface

```ts
interface EditEventDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: TrackerEvent | null;
  onSave: (id: string, patch: Partial<Omit<TrackerEvent, 'id'>>) => void;
}
```

### Campos editáveis

- **Tipo** — toggle entre tobacco/cannabis (dois botões, o ativo fica highlighted)
- **Horário** — input `time` (HH:mm), inicializado com o horário atual do evento. Só muda a hora/minuto, mantém a data
- **Onde** — input text, igual ao NewEventDrawer
- **Por quê** — input text, igual ao NewEventDrawer

### Fluxo

1. No `EditDayDialog`, tocar na row do evento (fora do botão de lixeira) abre o `EditEventDrawer`
2. Campos pré-preenchidos com os valores atuais
3. Botão "Salvar" chama `onSave(event.id, patch)` → `tracker.updateEvent()`
4. Fecha o drawer

### Nota

`updateEvent` já existe no hook. Edição não gera undo — é intencional e revisada antes de salvar.

---

## 4. Mudanças no EditDayDialog

### Row clicável

Hoje cada row de evento é clicável apenas no botão de lixeira. A mudança: a row inteira (exceto o botão de lixeira) vira clicável e abre o `EditEventDrawer`.

### Implementação

- A row ganha `cursor-pointer` e `onClick` que seta o evento selecionado
- O botão de lixeira faz `e.stopPropagation()` pra não abrir o editor ao deletar
- O `EditDayDialog` ganha state interno `editingEvent: TrackerEvent | null`
- O `EditEventDrawer` renderiza dentro do `EditDayDialog`

### Novas props do EditDayDialog

- `onUpdateEvent: (id: string, patch: Partial<Omit<TrackerEvent, 'id'>>) => void` — repassado ao EditEventDrawer
- `onUndo: () => void` — pra disparar toast de undo ao remover evento

---

## 5. Testes

### Camada de hook (useTracker.test.ts)

- `addEvent` seta `pendingUndo` com tipo `remove-event`
- `executeUndo` após `addEvent` remove o evento adicionado
- `removeEvent` seta `pendingUndo` com tipo `restore-event`
- `executeUndo` após `removeEvent` restaura o evento
- Nova ação sobrescreve `pendingUndo` anterior
- `executeUndo` sem `pendingUndo` é no-op
- `updateEvent` atualiza type e timestamp corretamente

### Componentes

Sem testes de componente — seguindo o padrão dos sub-projetos anteriores. Componentes são validados visualmente. A lógica testável fica toda no hook.

---

## Fora de escopo (próximos sub-projetos ou reavaliação futura)

- Undo para `clearDay` e `setGoal`
- Undo stack (múltiplas ações em sequência)
- Autocomplete de location/reason
- Atalhos de teclado
- Validação avançada
- Redesign visual, dark mode toggle, PWA (sub-projeto #5)
