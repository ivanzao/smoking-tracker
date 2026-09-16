import { useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useIsMobile } from '@/hooks/use-mobile';
import { todayKey } from '@/lib/events';
import { RANGE_SHORTCUTS, XlsxRange, shortcutRange, validateXlsxRange } from '@/lib/xlsx';

interface ExportXlsxDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (range: XlsxRange) => void;
}

const TITLE = 'Exportar planilha';
const DESCRIPTION = 'Uma aba por semana e uma aba com cada registro. Escolha o período.';

const RANGE_ERROR_MESSAGES = {
  inverted: 'O início precisa ser antes do fim.',
  future: 'O fim não pode ser depois de hoje.',
} as const;

export const ExportXlsxDrawer = ({ open, onOpenChange, onExport }: ExportXlsxDrawerProps) => {
  const isMobile = useIsMobile();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const today = todayKey();
  const error = validateXlsxRange(from, to, today);

  const handleExport = () => {
    if (error) return;
    onExport({ from, to });
    onOpenChange(false);
  };

  const applyShortcut = (days: number) => {
    const range = shortcutRange(days, today);
    setFrom(range.from);
    setTo(range.to);
  };

  const shortcutButton =
    'px-3 py-2.5 text-xs font-bold uppercase tracking-wider border-2 border-border shadow-brutal-sm hover:bg-muted active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-transform';

  const form = (
    <div className="px-4 pb-2 space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {RANGE_SHORTCUTS.map((s) => (
          <button
            key={s.days}
            type="button"
            onClick={() => applyShortcut(s.days)}
            className={shortcutButton}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="xlsx-from">Início</Label>
          <Input
            id="xlsx-from"
            type="date"
            required
            value={from}
            max={to || today}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="xlsx-to">Fim</Label>
          <Input
            id="xlsx-to"
            type="date"
            required
            value={to}
            min={from || undefined}
            max={today}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>
      {error && error !== 'empty' && (
        <p className="text-[10px] font-bold uppercase tracking-wider text-destructive">
          {RANGE_ERROR_MESSAGES[error]}
        </p>
      )}
    </div>
  );

  const exportButton = (
    <Button onClick={handleExport} disabled={error !== null} className="w-full">
      Exportar
    </Button>
  );
  const cancelButton = (
    <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
      Cancelar
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{TITLE}</DrawerTitle>
            <DrawerDescription>{DESCRIPTION}</DrawerDescription>
          </DrawerHeader>
          {form}
          <DrawerFooter>
            {exportButton}
            {cancelButton}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{TITLE}</DialogTitle>
          <DialogDescription>{DESCRIPTION}</DialogDescription>
        </DialogHeader>
        {form}
        <DialogFooter className="px-4 pt-2 gap-2 sm:space-x-0">
          {cancelButton}
          {exportButton}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
