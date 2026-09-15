import { useEffect, useState } from 'react';
import { Cigarette, Leaf } from 'lucide-react';
import { format, parseISO } from 'date-fns';
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
import { buildLocalIso, getDayKey, isFutureIso } from '@/lib/events';
import { EventType, TrackerEvent } from '@/types';

interface EditEventDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: TrackerEvent | null;
  onSave: (id: string, patch: Partial<Omit<TrackerEvent, 'id'>>) => void;
}

export const EditEventDrawer = ({ open, onOpenChange, event, onSave }: EditEventDrawerProps) => {
  const [type, setType] = useState<EventType>('tobacco');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [reason, setReason] = useState('');
  const isMobile = useIsMobile();

  useEffect(() => {
    if (open && event) {
      setType(event.type);
      setDate(getDayKey(event.timestamp));
      setTime(format(parseISO(event.timestamp), 'HH:mm'));
      setLocation(event.location ?? '');
      setReason(event.reason ?? '');
    }
  }, [open, event]);

  const timestamp = buildLocalIso(date, time);
  const canSave = timestamp !== null && !isFutureIso(timestamp);

  const handleSave = () => {
    if (!event || !timestamp || !canSave) return;

    const patch: Partial<Omit<TrackerEvent, 'id'>> = {};

    if (type !== event.type) {
      patch.type = type;
    }

    const trimmedLocation = location.trim() || undefined;
    if (trimmedLocation !== (event.location ?? undefined)) {
      patch.location = trimmedLocation;
    }

    const trimmedReason = reason.trim() || undefined;
    if (trimmedReason !== (event.reason ?? undefined)) {
      patch.reason = trimmedReason;
    }

    // Inputs only carry minute precision; ignore the seconds of the stored timestamp
    if (timestamp.slice(0, 16) !== event.timestamp.slice(0, 16)) {
      patch.timestamp = timestamp;
    }

    if (Object.keys(patch).length > 0) {
      onSave(event.id, patch);
    }
    onOpenChange(false);
  };

  const formContent = (
    <div className="px-4 pb-2 space-y-3">
      <div className="space-y-1.5">
        <Label>Tipo</Label>
        <div className="flex gap-2">
          <Button
            variant={type === 'tobacco' ? 'default' : 'outline'}
            onClick={() => setType('tobacco')}
            className="flex-1"
          >
            <Cigarette className="w-4 h-4 mr-2" />
            Tabaco
          </Button>
          <Button
            variant={type === 'cannabis' ? 'default' : 'outline'}
            onClick={() => setType('cannabis')}
            className="flex-1"
          >
            <Leaf className="w-4 h-4 mr-2" />
            Cannabis
          </Button>
        </div>
      </div>
      <DateTimeFields
        idPrefix="edit-event"
        date={date}
        time={time}
        onDateChange={setDate}
        onTimeChange={setTime}
      />
      <div className="space-y-1.5">
        <Label htmlFor="edit-event-location">Onde?</Label>
        <Input
          id="edit-event-location"
          placeholder="casa, trabalho, bar…"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-event-reason">Por quê?</Label>
        <Input
          id="edit-event-reason"
          placeholder="primeiro do dia, pós almoço…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
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
            <DrawerTitle>Editar evento</DrawerTitle>
            <DrawerDescription>Altere os campos e salve.</DrawerDescription>
          </DrawerHeader>
          {formContent}
          <DrawerFooter>
            <Button onClick={handleSave} disabled={!canSave}>Salvar</Button>
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
          <DialogTitle>Editar evento</DialogTitle>
          <DialogDescription>Altere os campos e salve.</DialogDescription>
        </DialogHeader>
        {formContent}
        <DialogFooter className="px-4 pt-2 flex-col gap-2">
          <Button onClick={handleSave} disabled={!canSave} className="w-full">Salvar</Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
