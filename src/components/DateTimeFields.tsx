import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { todayKey } from '@/lib/events';

interface DateTimeFieldsProps {
  idPrefix: string;
  /** "YYYY-MM-DD", as produced by <input type="date"> */
  date: string;
  /** "HH:mm", as produced by <input type="time"> */
  time: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
}

/** Date + time pair for an event timestamp. Native inputs cap at "now" — no future events. */
export const DateTimeFields = ({
  idPrefix,
  date,
  time,
  onDateChange,
  onTimeChange,
}: DateTimeFieldsProps) => {
  const today = todayKey();
  const maxTime = date === today ? format(new Date(), 'HH:mm') : undefined;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-date`}>Data</Label>
        <Input
          id={`${idPrefix}-date`}
          type="date"
          value={date}
          max={today}
          onChange={(e) => onDateChange(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-time`}>Horário</Label>
        <Input
          id={`${idPrefix}-time`}
          type="time"
          value={time}
          max={maxTime}
          onChange={(e) => onTimeChange(e.target.value)}
        />
      </div>
    </div>
  );
};
