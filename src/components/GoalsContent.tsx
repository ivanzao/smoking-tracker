import { useRef, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { UseTrackerAPI, ImportOutcome } from '@/hooks/useTracker';
import { ImportError } from '@/lib/export';
import { todayKey } from '@/lib/events';
import { XlsxRange } from '@/lib/xlsx';
import { ExportXlsxDrawer } from '@/components/ExportXlsxDrawer';
import { AccountSection } from '@/components/AccountSection';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UseSyncAPI } from '@/hooks/useSync';

interface GoalsContentProps {
  tracker: UseTrackerAPI;
  /** Absent or disabled when the app runs local-only. */
  sync?: UseSyncAPI;
  /** Tighter spacing so the whole thing fits inside the desktop sidebar without scrolling */
  compact?: boolean;
}

const MAX_GOAL = 99;

const BRUTAL_BUTTON =
  'min-w-0 min-h-11 flex items-center justify-center text-center py-2.5 px-1 border-2 border-border shadow-brutal-sm text-[11px] font-bold uppercase tracking-wide leading-tight active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-transform';

const IMPORT_ERROR_MESSAGES: Record<ImportError, string> = {
  'invalid-json': 'Arquivo não é um JSON válido',
  'invalid-shape': 'Arquivo não parece ser um backup do Smoking Tracker',
  'unsupported-version': 'Versão do arquivo não suportada',
  'invalid-events': 'Arquivo contém eventos inválidos',
  'invalid-goals': 'Arquivo contém metas inválidas',
  'invalid-days': 'Arquivo contém anotações inválidas',
};

export const GoalsContent = ({ tracker, sync, compact = false }: GoalsContentProps) => {
  const currentGoal = tracker.getCurrentGoal();
  const streak = tracker.getCurrentStreak();
  const [goalValue, setGoalValue] = useState(currentGoal?.limit ?? 10);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [xlsxPickerOpen, setXlsxPickerOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);

  useEffect(() => {
    setGoalValue(currentGoal?.limit ?? 10);
  }, [currentGoal?.limit]);

  const handleSaveGoal = () => {
    tracker.setGoal(goalValue);
    toast.success('Meta atualizada');
  };

  const handleRemoveGoal = () => {
    if (!window.confirm('Remover meta? A sequência volta para zero.')) return;
    tracker.setGoal(null);
    toast.success('Meta removida');
  };

  const handleResetStreak = () => {
    if (!window.confirm('Zerar sequência? O contador volta para zero e recomeça amanhã.')) return;
    tracker.resetStreak();
    toast.success('Sequência zerada');
  };

  const handleClearAll = () => {
    tracker.clearAll();
    setClearOpen(false);
    toast.success('Todos os dados apagados');
  };

  const downloadFile = (content: BlobPart, mimeType: string, fileName: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    downloadFile(tracker.exportEvents(), 'application/json', `smoking-tracker-${todayKey()}.json`);
    toast.success('Backup exportado');
  };

  const handleExportXlsx = async (range: XlsxRange) => {
    const report = await tracker.exportXlsx(range);
    downloadFile(
      report.buffer,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      report.fileName,
    );
    toast.success('Planilha exportada');
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
        if (result.notesAdded > 0) parts.push(`${result.notesAdded} anotações importadas`);
        toast.success(parts.join('. ') || 'Nenhum dado novo encontrado');
      } else {
        toast.error(IMPORT_ERROR_MESSAGES[result.error]);
      }
    } finally {
      e.target.value = '';
    }
  };

  const sectionTitle = `text-xs font-bold uppercase tracking-wider ${compact ? 'mb-2' : 'mb-4'}`;
  const dataRow = `w-full ${compact ? 'px-3 py-2' : 'p-4'} flex items-center gap-3 hover:bg-muted text-left transition-colors`;

  return (
    <div className={compact ? 'space-y-4' : 'space-y-8'}>
      {/* Goal section */}
      <section>
        <h2 className={sectionTitle}>
          Meta Diária
        </h2>
        <div className={`bg-card border-2 border-border shadow-brutal ${compact ? 'p-4' : 'p-5'}`}>
          <div className={`flex justify-between items-start ${compact ? 'mb-3' : 'mb-4'}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary border-2 border-border flex items-center justify-center">
                <span aria-hidden="true" className="material-symbols-outlined">track_changes</span>
              </div>
              <div>
                <h3 className="font-bold">Limite por dia</h3>
                <p className="text-xs text-muted-foreground">Tabaco + Cannabis combinados</p>
              </div>
            </div>
          </div>
          <div className={`flex items-center justify-between gap-3 ${compact ? 'mb-3' : 'mb-4'}`}>
            <button
              type="button"
              onClick={() => setGoalValue((v) => Math.max(1, v - 1))}
              disabled={goalValue <= 1}
              aria-label="Diminuir meta"
              className="w-11 h-11 flex items-center justify-center bg-card border-2 border-border shadow-brutal-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-transform disabled:opacity-30"
            >
              <span aria-hidden="true" className="material-symbols-outlined">remove</span>
            </button>
            <output aria-label="Meta diária" className="font-bold text-3xl tracking-tight tabular-nums">
              {String(goalValue).padStart(2, '0')}
            </output>
            <button
              type="button"
              onClick={() => setGoalValue((v) => Math.min(MAX_GOAL, v + 1))}
              disabled={goalValue >= MAX_GOAL}
              aria-label="Aumentar meta"
              className="w-11 h-11 flex items-center justify-center bg-card border-2 border-border shadow-brutal-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-transform disabled:opacity-30"
            >
              <span aria-hidden="true" className="material-symbols-outlined">add</span>
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={handleSaveGoal}
              aria-label="Salvar meta"
              className={BRUTAL_BUTTON + ' bg-primary text-primary-foreground'}
            >
              Salvar Meta
            </button>
            {currentGoal && (
              <button
                onClick={handleRemoveGoal}
                aria-label="Remover meta"
                className={BRUTAL_BUTTON + ' bg-card text-destructive'}
              >
                Remover
              </button>
            )}
            {currentGoal && streak > 0 && (
              <button
                onClick={handleResetStreak}
                aria-label="Zerar sequência"
                className={BRUTAL_BUTTON + ' bg-card text-foreground'}
              >
                Zerar sequência
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Data section */}
      <section>
        <h2 className={sectionTitle}>
          Dados
        </h2>
        {(!sync || sync.status === 'disabled') && (
          <p className="text-sm text-muted-foreground mb-3">
            Seus dados ficam só neste aparelho. Exporte um backup para não perdê-los.
          </p>
        )}
        <div className="bg-card border-2 border-border shadow-brutal">
          <button
            onClick={handleExport}
            aria-label="Exportar JSON"
            className={dataRow + ' border-b-2 border-border'}
          >
            <span aria-hidden="true" className="material-symbols-outlined">download</span>
            <div>
              <p className="text-sm font-bold">Exportar JSON</p>
              <p className="text-xs text-muted-foreground">Baixa backup de todos os eventos</p>
            </div>
          </button>
          <button
            onClick={() => setXlsxPickerOpen(true)}
            aria-label="Exportar planilha"
            className={dataRow + ' border-b-2 border-border'}
          >
            <span aria-hidden="true" className="material-symbols-outlined">table_view</span>
            <div>
              <p className="text-sm font-bold">Exportar planilha</p>
              <p className="text-xs text-muted-foreground">Relatório semanal (XLSX) para compartilhar</p>
            </div>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            aria-label="Importar JSON"
            className={dataRow}
          >
            <span aria-hidden="true" className="material-symbols-outlined">upload</span>
            <div>
              <p className="text-sm font-bold">Importar JSON</p>
              <p className="text-xs text-muted-foreground">Restaura a partir de um backup</p>
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

      {sync?.email && <AccountSection sync={sync} titleClassName={sectionTitle} />}

      <ExportXlsxDrawer
        open={xlsxPickerOpen}
        onOpenChange={setXlsxPickerOpen}
        onExport={handleExportXlsx}
      />

      {/* Danger zone */}
      <section className="text-center">
        <button
          onClick={() => setClearOpen(true)}
          className="min-h-11 text-destructive font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 mx-auto hover:underline px-4 transition-colors"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-sm">delete_forever</span>
          Limpar todos os dados
        </button>
      </section>

      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Apagar todos os dados?</DialogTitle>
            <DialogDescription>
              Isso apaga todos os registros, metas, anotações e a sequência
              {sync?.status === 'signed-in' ? ', neste aparelho e na sua conta' : ''}. Não pode ser
              desfeito.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setClearOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleClearAll}>Apagar tudo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
