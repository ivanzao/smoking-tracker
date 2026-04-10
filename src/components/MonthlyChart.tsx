import {
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { DayTotals, TrackerEvent } from '@/types';

interface MonthlyChartProps {
  dayKeys: string[];
  getDayTotals: (dayKey: string) => DayTotals;
  onDayClick: (dayKey: string) => void;
  events: TrackerEvent[];
  goalLimit: number | null;
  className?: string;
}

export const MonthlyChart = ({ dayKeys, getDayTotals, onDayClick, goalLimit, className }: MonthlyChartProps) => {
  const chartData = dayKeys.map((dayKey) => {
    const totals = getDayTotals(dayKey);
    return {
      dayKey,
      day: format(parseISO(dayKey + 'T00:00:00'), 'dd'),
      fullDate: format(parseISO(dayKey + 'T00:00:00'), 'dd/MM'),
      tobacco: totals.tobacco,
      cannabis: totals.cannabis,
    };
  });

  const handleChartClick = (e: any) => {
    const payload = e?.activePayload?.[0]?.payload;
    if (payload?.dayKey) onDayClick(payload.dayKey);
  };

  return (
    <div className={cn("w-full", className ?? "h-[200px] mt-4 mb-6")} style={{ fontFamily: 'inherit' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} onClick={handleChartClick}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" opacity={0.1} />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={true}
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))', fontFamily: 'sans-serif' }}
            interval={0}
          />
          <YAxis
            allowDecimals={false}
            domain={[0, (dataMax: number) => Math.max(goalLimit != null ? goalLimit + 3 : 1, dataMax)]}
            tickLine={false}
            axisLine={true}
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))', fontFamily: 'sans-serif' }}
            width={20}
          />
          <Tooltip
            cursor={{ fill: 'var(--accent)', opacity: 0.2 }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const p = payload[0].payload as {
                  fullDate: string;
                  tobacco: number;
                  cannabis: number;
                };
                return (
                  <Card className="p-2 border-none shadow-lg bg-popover/95 backdrop-blur-sm">
                    <div className="text-xs font-medium text-muted-foreground mb-1">{p.fullDate}</div>
                    <div className="flex gap-3">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-secondary" />
                        <span className="text-sm font-bold">{p.tobacco}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="text-sm font-bold">{p.cannabis}</span>
                      </div>
                    </div>
                  </Card>
                );
              }
              return null;
            }}
          />
          <Line
            dataKey="tobacco"
            name="Tabaco"
            type="monotone"
            stroke="hsl(var(--secondary))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
          />
          <Line
            dataKey="cannabis"
            name="Cannabis"
            type="monotone"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }}
            formatter={(value) => (
              <span style={{ color: 'hsl(var(--muted-foreground))', fontFamily: 'sans-serif' }}>{value}</span>
            )}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
