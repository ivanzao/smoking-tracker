import {
  Bar,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { SeriesLegend } from '@/components/SeriesLegend';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { DayTotals } from '@/types';

interface MonthlyChartProps {
  dayKeys: string[];
  monthLabel: string;
  getDayTotals: (dayKey: string) => DayTotals;
  onDayClick: (dayKey: string) => void;
  goalLimit: number | null;
  className?: string;
}

export const MonthlyChart = ({ dayKeys, monthLabel, getDayTotals, onDayClick, goalLimit, className }: MonthlyChartProps) => {
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

  const monthTotal = chartData.reduce((sum, d) => sum + d.total, 0);
  const peak = chartData.reduce((max, d) => (d.total > max.total ? d : max), chartData[0]);
  const summary =
    monthTotal === 0
      ? `Gráfico de ${monthLabel}: nenhum registro.`
      : `Gráfico de ${monthLabel}: ${monthTotal} ${monthTotal === 1 ? 'registro' : 'registros'}, com pico de ${peak.total} em ${peak.fullDate}.`;

  const handleChartClick = (e: any) => {
    const payload = e?.activePayload?.[0]?.payload;
    if (payload?.dayKey) onDayClick(payload.dayKey);
  };

  return (
    <div className={cn("w-full flex flex-col gap-2", className ?? "h-[200px] mt-4 mb-6")}>
      <div className="flex justify-end">
        <SeriesLegend goalLimit={goalLimit} />
      </div>
      <div role="img" aria-label={summary} className="relative flex-1 min-h-0">
        <div className="absolute inset-0">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} onClick={handleChartClick}>
          <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="hsl(var(--border))" />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))', fontFamily: 'inherit' }}
            interval={4}
          />
          <YAxis
            allowDecimals={false}
            domain={[0, (dataMax: number) => Math.max(goalLimit != null ? goalLimit + 3 : 1, dataMax)]}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))', fontFamily: 'inherit' }}
            width={20}
          />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.6 }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const p = payload[0].payload as {
                  fullDate: string;
                  tobacco: number;
                  cannabis: number;
                };
                return (
                  <div className="rounded-sm bg-muted text-foreground px-3 py-2">
                    <div className="text-xs text-muted-foreground mb-1">{p.fullDate}</div>
                    <div className="flex gap-3 text-sm font-semibold">
                      <span>Tabaco {p.tobacco}</span>
                      <span>Cannabis {p.cannabis}</span>
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
              stroke="hsl(var(--foreground))"
              strokeOpacity={0.4}
              strokeWidth={1}
              ifOverflow="extendDomain"
            />
          )}
          <Bar dataKey="tobacco" name="Tabaco" stackId="day" fill="hsl(var(--tobacco))" stroke="hsl(var(--card))" strokeWidth={2} radius={3} />
          <Bar dataKey="cannabis" name="Cannabis" stackId="day" fill="hsl(var(--cannabis))" stroke="hsl(var(--card))" strokeWidth={2} radius={3} />
        </ComposedChart>
      </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
