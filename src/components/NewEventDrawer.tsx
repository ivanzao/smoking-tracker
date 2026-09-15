import { useEffect, useState } from 'react';
import { Cigarette, Leaf } from 'lucide-react';
import { format } from 'date-fns';
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
import { DateTimeFields } from '@/components/DateTimeFields';
import { useIsMobile } from '@/hooks/use-mobile';
import { buildLocalIso, isFutureIso } from '@/lib/events';
import { EventType } from '@/types';

export interface NewEventInput {
  type: EventType;
  timestamp: string;
  location?: string;
  reason?: string;
}

interface NewEventDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: EventType | null;
  onSubmit: (input: NewEventInput) => void;
}

const LABELS: Record<EventType, { title: string; icon: typeof Cigarette }> = {
  tobacco: { title: 'Tabaco', icon: Cigarette },
  cannabis: { title: 'Cannabis', icon: Leaf },
};

export const NewEventDrawer = ({ open, onOpenChange, type, onSubmit }: NewEventDrawerProps) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [reason, setReason] = useState('');
  const isMobile = useIsMobile();

  // Defaults are captured when the drawer opens, not when it is submitted
  useEffect(() => {
    if (open) {
      const now = new Date();
      setDate(format(now, 'yyyy-MM-dd'));
      setTime(format(now, 'HH:mm'));
      setLocation('');
      setReason('');
    }
  }, [open]);

  const timestamp = buildLocalIso(date, time);
  const canSubmit = timestamp !== null && !isFutureIso(timestamp);

  const handleSubmit = () => {
    if (!type || !timestamp || !canSubmit) return;
    onSubmit({
      type,
      timestamp,
      location: location.trim() || undefined,
      reason: reason.trim() || undefined,
    });
    onOpenChange(false);
  };

  const meta = type ? LABELS[type] : null;
  const Icon = meta?.icon;

  const formContent = (
    <div className="px-4 pb-2 space-y-3">
      <DateTimeFields
        idPrefix="new-event"
        date={date}
        time={time}
        onDateChange={setDate}
        onTimeChange={setTime}
      />
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
  );

  if (isMobile) {
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
          {formContent}
          <DrawerFooter>
            <Button onClick={handleSubmit} disabled={!canSubmit}>Registrar</Button>
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
          <DialogTitle className="flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5" />}
            Registrar {meta?.title.toLowerCase()}
          </DialogTitle>
          <DialogDescription>Opcional: adicione contexto ao registro.</DialogDescription>
        </DialogHeader>
        {formContent}
        <DialogFooter className="px-4 pt-2 flex-col gap-2">
          <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full">Registrar</Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
