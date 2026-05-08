import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import type { TuningSession } from '@/hooks/useTuningHistory';

interface AccuracyChartProps {
  sessions: TuningSession[];
}

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatTime(ms: number) {
  return new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function AccuracyChart({ sessions }: AccuracyChartProps) {
  const chartData = useMemo(() => {
    return [...sessions]
      .reverse()
      .map((s, i) => ({
        index: i + 1,
        label: formatTime(s.startTime),
        date: formatDate(s.startTime),
        accuracy: Math.round((s.perfectCount / s.totalCount) * 100),
        avgCents: s.avgCents,
        tuning: s.tuningName,
        readings: s.totalCount,
      }));
  }, [sessions]);

  const noteDistribution = useMemo(() => {
    const counts: Record<string, { perfect: number; total: number }> = {};
    sessions.forEach((s) =>
      s.entries.forEach((e) => {
        if (!counts[e.note]) counts[e.note] = { perfect: 0, total: 0 };
        counts[e.note].total++;
        if (e.accuracy === 'perfect') counts[e.note].perfect++;
      })
    );
    return Object.entries(counts)
      .map(([note, { perfect, total }]) => ({
        note,
        accuracy: Math.round((perfect / total) * 100),
        total,
      }))
      .sort((a, b) => b.total - a.total);
  }, [sessions]);

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        <p>No data yet — complete a tuning session to see charts</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Accuracy over time */}
      <div>
        <h3 className="text-xs font-display font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Accuracy Over Time
        </h3>
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="accuracyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '11px',
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'accuracy') return [`${value}%`, 'Accuracy'];
                  if (name === 'avgCents') return [`±${value}¢`, 'Avg Deviation'];
                  return [value, name];
                }}
                labelFormatter={(label) => `Session: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="accuracy"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#accuracyGrad)"
                dot={{ r: 3, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: 'hsl(var(--primary))' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cents deviation over time */}
      <div>
        <h3 className="text-xs font-display font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Average Deviation (¢)
        </h3>
        <div className="h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="centsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `±${v}`}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '11px',
                }}
                formatter={(value: number) => [`±${value}¢`, 'Avg Deviation']}
              />
              <Area
                type="monotone"
                dataKey="avgCents"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                fill="url(#centsGrad)"
                dot={{ r: 3, fill: 'hsl(var(--destructive))', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Per-note accuracy */}
      {noteDistribution.length > 0 && (
        <div>
          <h3 className="text-xs font-display font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Accuracy by Note
          </h3>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={noteDistribution} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="note"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 700 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                  formatter={(value: number) => [`${value}%`, 'Accuracy']}
                />
                <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
                  {noteDistribution.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        entry.accuracy >= 80
                          ? 'hsl(var(--primary))'
                          : entry.accuracy >= 50
                          ? 'hsl(var(--accent))'
                          : 'hsl(var(--destructive))'
                      }
                      opacity={0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
