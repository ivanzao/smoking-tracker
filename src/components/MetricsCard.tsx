import { Card } from '@/components/ui/card';

interface MetricsCardProps {
  todayTotal: number;
  goalLimit: number | null;
  streak: number;
  average7d: number;
  delta7d: number | null;
}

export const MetricsCard = ({
  todayTotal,
  goalLimit,
  streak,
  average7d,
  delta7d,
}: MetricsCardProps) => {
  const hasGoal = goalLimit !== null;
  const isOver = hasGoal && todayTotal > goalLimit;
  const progressPct = hasGoal ? Math.min(100, (todayTotal / goalLimit) * 100) : 0;

  const formatDelta = (d: number | null): { text: string; className: string } => {
    if (d === null) return { text: '—', className: 'text-muted-foreground' };
    const pct = Math.abs(d * 100).toFixed(0);
    if (d < 0) return { text: `▼ ${pct}%`, className: 'text-emerald-500' };
    if (d > 0) return { text: `▲ ${pct}%`, className: 'text-rose-500' };
    return { text: '0%', className: 'text-muted-foreground' };
  };

  const delta = formatDelta(delta7d);

  return (
    <Card className="p-4" style={{ boxShadow: 'var(--shadow-soft)' }}>
      <div className="flex text-center divide-x divide-border">
        {/* Today / Goal */}
        <div className="flex-1 px-3">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {hasGoal ? 'hoje / meta' : 'hoje'}
          </div>
          <div className="text-xl font-bold mt-1">
            {todayTotal}
            {hasGoal && (
              <span className="text-muted-foreground font-normal">/{goalLimit}</span>
            )}
          </div>
          {hasGoal && (
            <div className="h-1 bg-muted rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isOver ? 'bg-rose-500' : 'bg-emerald-500'}`}
                style={{ width: `${isOver ? 100 : progressPct}%` }}
              />
            </div>
          )}
        </div>

        {/* Streak */}
        <div className="flex-1 px-3">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            streak
          </div>
          <div className="text-xl font-bold mt-1">
            {hasGoal && streak > 0 ? `🔥 ${streak}` : '—'}
          </div>
          <div className="text-[10px] text-muted-foreground mt-2">
            dias na meta
          </div>
        </div>

        {/* 7d average */}
        <div className="flex-1 px-3">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            média 7d
          </div>
          <div className="text-xl font-bold mt-1">
            {average7d.toFixed(1)}
          </div>
          <div className={`text-[10px] mt-2 ${delta.className}`}>
            {delta.text}
          </div>
        </div>
      </div>
    </Card>
  );
};
