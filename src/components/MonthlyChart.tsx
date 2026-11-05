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
    <div
      role="img"
      aria-label={summary}
      className={cn("w-full", className ?? "h-[200px] mt-4 mb-6")}
      style={{ fontFamily: 'inherit' }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} onClick={handleChartClick}>
          <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="hsl(var(--foreground))" opacity={0.15} />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--foreground))' }}
            tick={{ fontSize: 12, fill: 'hsl(var(--foreground))', fontFamily: 'inherit', fontWeight: 600 }}
            interval={4}
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
              strokeWidth={2}
              strokeDasharray="6 4"
              ifOverflow="extendDomain"
              label={{
                value: `Meta ${goalLimit}`,
                position: 'insideTopRight',
                fontSize: 11,
                fontWeight: 700,
                fill: 'hsl(var(--foreground))',
              }}
            />
          )}
          <Bar dataKey="tobacco" name="Tabaco" stackId="day" fill="hsl(var(--primary))" stroke="hsl(var(--foreground))" />
          <Bar dataKey="cannabis" name="Cannabis" stackId="day" fill="hsl(var(--foreground))" />
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
