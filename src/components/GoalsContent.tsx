import { useRef, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { UseTrackerAPI, ImportOutcome } from '@/hooks/useTracker';
import { ImportError } from '@/lib/export';
import { todayKey } from '@/lib/events';

interface GoalsContentProps {
  tracker: UseTrackerAPI;
}

const IMPORT_ERROR_MESSAGES: Record<ImportError, string> = {
  'invalid-json': 'Arquivo não é um JSON válido',
  'invalid-shape': 'Arquivo não parece ser um backup do Smoking Tracker',
  'unsupported-version': 'Versão do arquivo não suportada',
  'invalid-events': 'Arquivo contém eventos inválidos',
  'invalid-goals': 'Arquivo contém metas inválidas',
};

export const GoalsContent = ({ tracker }: GoalsContentProps) => {
  const currentGoal = tracker.getCurrentGoal();
  const [goalValue, setGoalValue] = useState(currentGoal?.limit ?? 10);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setGoalValue(currentGoal?.limit ?? 10);
  }, [currentGoal?.limit]);

  const handleSaveGoal = () => {
    tracker.setGoal(goalValue);
    toast.success('Meta atualizada');
  };

  const handleRemoveGoal = () => {
    if (!window.confirm('Remover meta? O streak volta para zero.')) return;
    tracker.setGoal(null);
    toast.success('Meta removida');
  };

  const handleExport = () => {
    const json = tracker.exportEvents();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smoking-tracker-${todayKey()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Backup exportado');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const raw = await file.text();
      const result: ImportOutcome = tracker.importEvents(raw);
      if (result.ok) {
        const parts: string[] = [];
        if (result.added > 0 || result.skipped > 0) {
          parts.push(`${result.added} eventos importados (${result.skipped} duplicados)`);
        }
        if (result.goalsAdded > 0) parts.push(`${result.goalsAdded} metas importadas`);
        toast.success(parts.join('. ') || 'Nenhum dado novo encontrado');
      } else {
        toast.error(IMPORT_ERROR_MESSAGES[result.error]);
      }
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-10">
      {/* Goal section */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider mb-4">
          Meta Diária
        </h2>
        <div className="bg-card border-2 border-border shadow-brutal p-5">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary border-2 border-border flex items-center justify-center">
                <span className="material-symbols-outlined">track_changes</span>
              </div>
              <div>
                <h4 className="font-bold">Limite por dia</h4>
                <p className="text-xs text-muted-foreground">Tabaco + Cannabis combinados</p>
              </div>
            </div>
            <span className="font-bold text-3xl tracking-tight">
              {String(goalValue).padStart(2, '0')}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={20}
            value={goalValue}
            onChange={(e) => setGoalValue(Number(e.target.value))}
            aria-label="Meta diária"
            className="w-full h-2 bg-muted appearance-none cursor-pointer accent-primary mb-4 border-2 border-border"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveGoal}
              aria-label="Salvar meta"
              className="flex-1 py-2.5 bg-primary text-primary-foreground border-2 border-border shadow-brutal-sm text-sm font-bold uppercase tracking-wider active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-transform"
            >
              Salvar Meta
            </button>
            {currentGoal && (
              <button
                onClick={handleRemoveGoal}
                aria-label="Remover meta"
                className="text-xs text-destructive hover:underline px-2 font-semibold"
              >
                Remover
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Data section */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider mb-4">
          Dados
        </h2>
        <div className="bg-card border-2 border-border shadow-brutal">
          <button
            onClick={handleExport}
            aria-label="Exportar JSON"
            className="w-full p-4 flex items-center gap-3 border-b-2 border-border hover:bg-muted text-left transition-colors"
          >
            <span className="material-symbols-outlined">download</span>
            <div>
              <p className="text-sm font-bold">Exportar JSON</p>
              <p className="text-[10px] text-muted-foreground">Baixa backup de todos os eventos</p>
            </div>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            aria-label="Importar JSON"
            className="w-full p-4 flex items-center gap-3 hover:bg-muted text-left transition-colors"
          >
            <span className="material-symbols-outlined">upload</span>
            <div>
              <p className="text-sm font-bold">Importar JSON</p>
              <p className="text-[10px] text-muted-foreground">Restaura a partir de um backup</p>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </section>

      {/* Danger zone */}
      <section className="text-center">
        <button
          onClick={() => {
            if (!window.confirm('Apagar TODOS os dados? Isso não pode ser desfeito.')) return;
            tracker.events.forEach((e) => tracker.removeEvent(e.id));
            toast.success('Todos os dados apagados');
          }}
          className="text-destructive font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 mx-auto hover:underline px-4 py-2 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">delete_forever</span>
          Limpar todos os dados
        </button>
      </section>
    </div>
  );
};
