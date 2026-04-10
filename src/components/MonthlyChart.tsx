import {
  Bar,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { DayTotals, TrackerEvent } from '@/types';
import { getMovingAverageSeries } from '@/lib/stats';

interface MonthlyChartProps {
  dayKeys: string[];
  getDayTotals: (dayKey: string) => DayTotals;
  onDayClick: (dayKey: string) => void;
  events: TrackerEvent[];
}

export const MonthlyChart = ({ dayKeys, getDayTotals, onDayClick, events }: MonthlyChartProps) => {
  const movingAvg = getMovingAverageSeries(events, dayKeys, 7);
  const avgMap = new Map(movingAvg.map((p) => [p.dayKey, p.average]));

  const chartData = dayKeys.map((dayKey) => {
    const totals = getDayTotals(dayKey);
    return {
      dayKey,
      day: format(parseISO(dayKey + 'T00:00:00'), 'dd'),
      fullDate: format(parseISO(dayKey + 'T00:00:00'), 'dd/MM'),
      tobacco: totals.tobacco,
      cannabis: totals.cannabis,
      avg7d: avgMap.get(dayKey) ?? 0,
    };
  });

  const handleChartClick = (e: any) => {
    const payload = e?.activePayload?.[0]?.payload;
    if (payload?.dayKey) onDayClick(payload.dayKey);
  };

  return (
    <div className="h-[200px] w-full mt-4 mb-6" style={{ fontFamily: 'inherit' }}>
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
            domain={[0, (dataMax: number) => Math.max(1, dataMax)]}
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
                  avg7d: number;
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
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-sm font-bold">{p.avg7d.toFixed(1)}</span>
                      </div>
                    </div>
                  </Card>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="tobacco" fill="hsl(var(--secondary))" fillOpacity={0.8} radius={[4, 4, 0, 0]} />
          <Bar dataKey="cannabis" fill="hsl(var(--primary))" fillOpacity={0.8} radius={[4, 4, 0, 0]} />
          <Line
            dataKey="avg7d"
            type="monotone"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
