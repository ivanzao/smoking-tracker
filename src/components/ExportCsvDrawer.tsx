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
import { useIsMobile } from '@/hooks/use-mobile';
import { CsvPeriod } from '@/lib/csv';

interface ExportCsvDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (period: CsvPeriod) => void;
}

const PERIODS: { value: CsvPeriod; label: string; hint: string }[] = [
  { value: '7d', label: '7 dias', hint: 'Hoje e os 6 dias anteriores' },
  { value: '30d', label: '30 dias', hint: 'Hoje e os 29 dias anteriores' },
  { value: 'all', label: 'Todos', hint: 'Do primeiro registro até hoje' },
];

const TITLE = 'Exportar CSV';
const DESCRIPTION = 'Relatório dia a dia para compartilhar. Escolha o período.';

export const ExportCsvDrawer = ({ open, onOpenChange, onSelect }: ExportCsvDrawerProps) => {
  const isMobile = useIsMobile();

  const handleSelect = (period: CsvPeriod) => {
    onSelect(period);
    onOpenChange(false);
  };

  const options = (
    <div className="px-4 pb-2 space-y-2">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => handleSelect(p.value)}
          className="w-full p-4 flex items-center gap-3 border-2 border-border shadow-brutal-sm hover:bg-muted text-left active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-transform"
        >
          <span className="material-symbols-outlined">date_range</span>
          <div>
            <p className="text-sm font-bold">{p.label}</p>
            <p className="text-[10px] text-muted-foreground">{p.hint}</p>
          </div>
        </button>
      ))}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{TITLE}</DrawerTitle>
            <DrawerDescription>{DESCRIPTION}</DrawerDescription>
          </DrawerHeader>
          {options}
          <DrawerFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
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
        {options}
        <DialogFooter className="px-4 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
