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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EventType, TrackerEvent } from '@/types';

interface EditEventDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: TrackerEvent | null;
  onSave: (id: string, patch: Partial<Omit<TrackerEvent, 'id'>>) => void;
}

export const EditEventDrawer = ({ open, onOpenChange, event, onSave }: EditEventDrawerProps) => {
  const [type, setType] = useState<EventType>('tobacco');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open && event) {
      setType(event.type);
      setTime(format(parseISO(event.timestamp), 'HH:mm'));
      setLocation(event.location ?? '');
      setReason(event.reason ?? '');
    }
  }, [open, event]);

  const handleSave = () => {
    if (!event) return;

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

    if (time) {
      const [hours, minutes] = time.split(':').map(Number);
      const newTimestamp = event.timestamp.replace(
        /\d{2}:\d{2}:\d{2}/,
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`
      );
      if (newTimestamp !== event.timestamp) {
        patch.timestamp = newTimestamp;
      }
    }

    if (Object.keys(patch).length > 0) {
      onSave(event.id, patch);
    }
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Editar evento</DrawerTitle>
          <DrawerDescription>Altere os campos e salve.</DrawerDescription>
        </DrawerHeader>
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
          <div className="space-y-1.5">
            <Label htmlFor="edit-event-time">Horário</Label>
            <Input
              id="edit-event-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
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
        <DrawerFooter>
          <Button onClick={handleSave}>Salvar</Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
