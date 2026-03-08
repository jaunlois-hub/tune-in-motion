import { useState } from 'react';
import { History, Trash2, ChevronDown, ChevronUp, Target, Clock, Music, BarChart3 } from 'lucide-react';
import { AccuracyChart } from './AccuracyChart';
import { Button } from '@/components/ui/button';
import type { TuningSession } from '@/hooks/useTuningHistory';

interface TuningHistoryPanelProps {
  sessions: TuningSession[];
  onClear: () => void;
}

function formatTime(ms: number) {
  const d = new Date(ms);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(start: number, end: number) {
  const s = Math.round((end - start) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

function AccuracyBadge({ accuracy }: { accuracy: number }) {
  const pct = Math.round(accuracy);
  const color =
    pct >= 80
      ? 'text-tuner-perfect bg-tuner-perfect/10 border-tuner-perfect/30'
      : pct >= 50
      ? 'text-primary bg-primary/10 border-primary/30'
      : pct >= 30
      ? 'text-tuner-sharp bg-tuner-sharp/10 border-tuner-sharp/30'
      : 'text-tuner-flat bg-tuner-flat/10 border-tuner-flat/30';

  return (
    <span className={`text-xs font-display font-bold px-2 py-0.5 rounded-full border ${color}`}>
      {pct}%
    </span>
  );
}

function SessionRow({ session }: { session: TuningSession }) {
  const [expanded, setExpanded] = useState(false);
  const accuracyPct = (session.perfectCount / session.totalCount) * 100;

  // Group entries by note for summary
  const noteGroups = session.entries.reduce((acc, e) => {
    const key = `${e.note}${e.octave}`;
    if (!acc[key]) acc[key] = { note: e.note, octave: e.octave, cents: [], count: 0 };
    acc[key].cents.push(e.cents);
    acc[key].count++;
    return acc;
  }, {} as Record<string, { note: string; octave: number; cents: number[]; count: number }>);

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-secondary/30 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Music className="w-3 h-3 text-primary shrink-0" />
            <span className="font-display text-sm font-semibold truncate">{session.tuningName}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {formatTime(session.startTime)}
            </span>
            <span>{formatDuration(session.startTime, session.endTime)}</span>
            <span>{session.totalCount} readings</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <AccuracyBadge accuracy={accuracyPct} />
          <span className="text-xs text-muted-foreground font-mono">
            ±{session.avgCents}¢
          </span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-border/50">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
            {Object.values(noteGroups).map((group) => {
              const avgCents = group.cents.reduce((s, c) => s + Math.abs(c), 0) / group.cents.length;
              const perfect = group.cents.filter((c) => Math.abs(c) < 2).length;
              return (
                <div
                  key={`${group.note}${group.octave}`}
                  className="flex items-center gap-2 bg-secondary/30 rounded-md px-2 py-1.5"
                >
                  <div className="font-display font-bold text-sm text-foreground">
                    {group.note}<span className="text-[10px] opacity-60">{group.octave}</span>
                  </div>
                  <div className="flex-1 text-[10px] text-muted-foreground">
                    <div>±{avgCents.toFixed(1)}¢ avg</div>
                    <div>{perfect}/{group.count} perfect</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function TuningHistoryPanel({ sessions, onClear }: TuningHistoryPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'list' | 'chart'>('list');

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <History className="w-3.5 h-3.5" />
        History
        {sessions.length > 0 && (
          <span className="bg-primary/20 text-primary text-[10px] font-display font-bold px-1.5 py-0.5 rounded-full">
            {sessions.length}
          </span>
        )}
      </Button>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto bg-card/80 backdrop-blur border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <h2 className="font-display text-sm font-bold tracking-wider uppercase">Tuning History</h2>
        </div>
        <div className="flex items-center gap-1">
          {sessions.length > 0 && (
            <Button variant="ghost" size="icon" onClick={onClear} className="w-7 h-7 text-muted-foreground hover:text-destructive">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="text-xs text-muted-foreground">
            Close
          </Button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground">
          <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>No sessions yet</p>
          <p className="text-[10px] mt-1">Start tuning to track your accuracy</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {sessions.map((session) => (
            <SessionRow key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}
