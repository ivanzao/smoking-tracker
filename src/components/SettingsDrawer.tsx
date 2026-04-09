import { useRef } from 'react';
import { toast } from 'sonner';
import { Download, Upload } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { ImportOutcome } from '@/hooks/useTracker';
import { ImportError } from '@/lib/export';
import { todayKey } from '@/lib/events';

interface SettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: () => string;
  onImport: (raw: string) => ImportOutcome;
}

const IMPORT_ERROR_MESSAGES: Record<ImportError, string> = {
  'invalid-json': 'Arquivo não é um JSON válido',
  'invalid-shape': 'Arquivo não parece ser um backup do Smoking Tracker',
  'unsupported-version': 'Versão do arquivo não suportada',
  'invalid-events': 'Arquivo contém eventos inválidos',
};

export const SettingsDrawer = ({
  open,
  onOpenChange,
  onExport,
  onImport,
}: SettingsDrawerProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        toast.success(
          `Importados ${result.added} eventos (${result.skipped} duplicados ignorados)`
        );
      } else {
        toast.error(IMPORT_ERROR_MESSAGES[result.error]);
      }
    } finally {
      e.target.value = '';
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Configurações</DrawerTitle>
          <DrawerDescription>Backup e restauração dos seus eventos.</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-6">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Exportar dados</h3>
            <p className="text-xs text-muted-foreground">
              Baixa um arquivo JSON com todos os seus eventos.
            </p>
            <Button onClick={handleExport} className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Exportar JSON
            </Button>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Importar dados</h3>
            <p className="text-xs text-muted-foreground">
              Adiciona eventos de um backup. Duplicados (mesmo id) são ignorados.
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
      </DrawerContent>
    </Drawer>
  );
};
