import { useEffect, useState } from 'react';
import { Cigarette, Leaf } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EventType } from '@/types';

interface NewEventDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: EventType | null;
  onSubmit: (input: { type: EventType; location?: string; reason?: string }) => void;
}

const LABELS: Record<EventType, { title: string; icon: typeof Cigarette }> = {
  tobacco: { title: 'Tabaco', icon: Cigarette },
  cannabis: { title: 'Cannabis', icon: Leaf },
};

export const NewEventDrawer = ({ open, onOpenChange, type, onSubmit }: NewEventDrawerProps) => {
  const [location, setLocation] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      setLocation('');
      setReason('');
    }
  }, [open]);

  const handleSubmit = () => {
    if (!type) return;
    onSubmit({
      type,
      location: location.trim() || undefined,
      reason: reason.trim() || undefined,
    });
    onOpenChange(false);
  };

  const meta = type ? LABELS[type] : null;
  const Icon = meta?.icon;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5" />}
            Registrar {meta?.title.toLowerCase()}
          </DrawerTitle>
          <DrawerDescription>Opcional: adicione contexto ao registro.</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-2 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-event-location">Onde?</Label>
            <Input
              id="new-event-location"
              placeholder="casa, trabalho, bar…"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-event-reason">Por quê?</Label>
            <Input
              id="new-event-reason"
              placeholder="primeiro do dia, pós almoço…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
            />
          </div>
        </div>
        <DrawerFooter>
          <Button onClick={handleSubmit}>Registrar</Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
