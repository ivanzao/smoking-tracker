import {
  Bar,
  ComposedChart,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { cn } from '@/lib/utils';
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
      total: totals.tobacco + totals.cannabis,
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
          <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="hsl(var(--foreground))" opacity={0.15} />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--foreground))' }}
            tick={{ fontSize: 12, fill: 'hsl(var(--foreground))', fontFamily: 'inherit', fontWeight: 600 }}
            interval={0}
          />
          <YAxis
            allowDecimals={false}
            domain={[0, (dataMax: number) => Math.max(goalLimit != null ? goalLimit + 3 : 1, dataMax)]}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--foreground))' }}
            tick={{ fontSize: 12, fill: 'hsl(var(--foreground))', fontFamily: 'inherit', fontWeight: 600 }}
            width={20}
          />
          <Tooltip
            cursor={{ fill: 'hsl(var(--primary))', opacity: 0.2 }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const p = payload[0].payload as {
                  fullDate: string;
                  tobacco: number;
                  cannabis: number;
                };
                return (
                  <div className="bg-card text-foreground border-2 border-border shadow-brutal p-2">
                    <div className="text-xs font-bold uppercase tracking-wider mb-1">{p.fullDate}</div>
                    <div className="flex gap-3 text-sm font-bold">
                      <span>T: {p.tobacco}</span>
                      <span>C: {p.cannabis}</span>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          {goalLimit != null && (
            <ReferenceLine
              y={goalLimit}
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              ifOverflow="extendDomain"
            />
          )}
          <Bar dataKey="total" name="Total" fill="hsl(var(--foreground))" />
          <Legend
            wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }}
            formatter={(value) => (
              <span style={{ color: 'hsl(var(--foreground))', fontFamily: 'inherit', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{value}</span>
            )}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
