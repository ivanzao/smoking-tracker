import { useRef, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Download, Upload } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';
import { ImportOutcome } from '@/hooks/useTracker';
import { ImportError } from '@/lib/export';
import { todayKey } from '@/lib/events';

interface SettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: () => string;
  onImport: (raw: string) => ImportOutcome;
  currentGoalLimit: number | null;
  onSetGoal: (limit: number | null) => void;
}

const IMPORT_ERROR_MESSAGES: Record<ImportError, string> = {
  'invalid-json': 'Arquivo não é um JSON válido',
  'invalid-shape': 'Arquivo não parece ser um backup do Smoking Tracker',
  'unsupported-version': 'Versão do arquivo não suportada',
  'invalid-events': 'Arquivo contém eventos inválidos',
  'invalid-goals': 'Arquivo contém metas inválidas',
};

export const SettingsDrawer = ({
  open,
  onOpenChange,
  onExport,
  onImport,
  currentGoalLimit,
  onSetGoal,
}: SettingsDrawerProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [goalInput, setGoalInput] = useState('');
  const isMobile = useIsMobile();

  useEffect(() => {
    if (open) {
      setGoalInput(currentGoalLimit !== null ? String(currentGoalLimit) : '');
    }
  }, [open, currentGoalLimit]);

  const parsedGoal = Number(goalInput);
  const isGoalValid = goalInput !== '' && Number.isInteger(parsedGoal) && parsedGoal > 0;

  const handleSaveGoal = () => {
    if (!isGoalValid) return;
    onSetGoal(parsedGoal);
    toast.success('Meta atualizada');
  };

  const handleRemoveGoal = () => {
    if (!window.confirm('Remover meta atual? O streak volta pra zero.')) return;
    onSetGoal(null);
    toast.success('Meta removida');
  };

  const handleExport = () => {
    const json = onExport();
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
      const result = onImport(raw);
      if (result.ok) {
        const parts: string[] = [];
        if (result.added > 0 || result.skipped > 0) {
          parts.push(`${result.added} eventos importados (${result.skipped} duplicados)`);
        }
        if (result.goalsAdded > 0 || result.goalsSkipped > 0) {
          parts.push(`${result.goalsAdded} metas importadas`);
        }
        toast.success(parts.join('. ') || 'Nenhum dado novo encontrado');
      } else {
        toast.error(IMPORT_ERROR_MESSAGES[result.error]);
      }
    } finally {
      e.target.value = '';
    }
  };

  const bodyContent = (
    <div className="px-4 pb-6 space-y-6">
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Meta diária</h3>
        <p className="text-xs text-muted-foreground">
          Máx. eventos por dia (tabaco + cannabis).
        </p>
        <div className="flex gap-2">
          <Input
            type="number"
            min={1}
            step={1}
            placeholder="ex: 10"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleSaveGoal} disabled={!isGoalValid}>
            Salvar
          </Button>
        </div>
        {currentGoalLimit !== null && (
          <button
            onClick={handleRemoveGoal}
            className="text-xs text-rose-500 hover:underline"
          >
            Remover meta
          </button>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Exportar dados</h3>
        <p className="text-xs text-muted-foreground">
          Baixa um arquivo JSON com todos os seus eventos e metas.
        </p>
        <Button onClick={handleExport} className="w-full">
          <Download className="w-4 h-4 mr-2" />
          Exportar JSON
        </Button>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Importar dados</h3>
        <p className="text-xs text-muted-foreground">
          Adiciona eventos e metas de um backup. Duplicados (mesmo id) são ignorados.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          className="w-full"
        >
          <Upload className="w-4 h-4 mr-2" />
          Escolher arquivo
        </Button>
      </section>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Configurações</DrawerTitle>
            <DrawerDescription>Meta diária, backup e restauração.</DrawerDescription>
          </DrawerHeader>
          {bodyContent}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Configurações</DialogTitle>
          <DialogDescription>Meta diária, backup e restauração.</DialogDescription>
        </DialogHeader>
        {bodyContent}
      </DialogContent>
    </Dialog>
  );
};
