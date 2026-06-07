import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, X, OctagonAlert, RotateCcw, BarChart3, Download, Eraser, Timer, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  useAudioDiagnostics,
  panicStopAll,
  resetDiagnosticsCounters,
  clearRecentFrequencies,
  getFrequencyHistogram,
  getTopFrequencies,
  buildDiagnosticsSnapshot,
  dismissFeedbackWarning,
  clearFeedbackWarnings,
  SQUELCH_FREQ_HZ,
} from '@/lib/audioDiagnostics';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';


const AUTO_CLEAR_KEY = 'audio-diag.autoClear';
const AUTO_CLEAR_OPTIONS: { label: string; ms: number }[] = [
  { label: 'Off', ms: 0 },
  { label: '5s', ms: 5000 },
  { label: '15s', ms: 15000 },
  { label: '60s', ms: 60000 },
];

function downloadSnapshot() {
  const snap = buildDiagnosticsSnapshot();
  const json = JSON.stringify(snap, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = snap.capturedAt.replace(/[:.]/g, '-');
  a.href = url;
  a.download = `audio-diagnostics-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(json).catch(() => {});
  }
  try { toast.success('Diagnostics snapshot saved', { description: `${snap.liveSources.length} live · ${snap.recentFreqs.length} freq samples` }); }
  catch { console.info('[Diagnostics] Snapshot saved', snap); }
}

export function AudioDiagnosticsPanel() {
  const [open, setOpen] = useState(false);
  const { sources, features, ctxState, sampleRate, feedbackWarnings } = useAudioDiagnostics();

  // Tick for age/countdown re-renders.
  const [, setNow] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setNow((n) => n + 1), 500);
    return () => clearInterval(id);
  }, []);

  // Auto-clear timer state, persisted.
  const [autoClearMs, setAutoClearMs] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const raw = window.localStorage.getItem(AUTO_CLEAR_KEY);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  });
  const nextClearAtRef = useRef<number>(0);
  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem(AUTO_CLEAR_KEY, String(autoClearMs));
    if (!autoClearMs) {
      nextClearAtRef.current = 0;
      return;
    }
    nextClearAtRef.current = Date.now() + autoClearMs;
    const id = window.setInterval(() => {
      clearRecentFrequencies();
      nextClearAtRef.current = Date.now() + autoClearMs;
    }, autoClearMs);
    return () => clearInterval(id);
  }, [autoClearMs]);

  const totalActive = sources.length;
  const dangerLive = sources.filter((s) => s.freq && s.freq >= SQUELCH_FREQ_HZ).length;
  const featureList = useMemo(
    () =>
      Object.values(features).sort(
        (a, b) => b.activeCount - a.activeCount || b.lastStartedAt - a.lastStartedAt,
      ),
    [features],
  );

  const fbCount = feedbackWarnings.length;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-3 right-3 z-[60] flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-card/90 backdrop-blur text-xs font-mono shadow-[0_0_20px_-8px_hsl(var(--primary)/0.5)] hover:border-primary/60 transition-colors"
        aria-label="Open audio diagnostics"
      >
        <Activity className={`w-3.5 h-3.5 ${totalActive > 0 ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
        <span className="tabular-nums">
          {totalActive} <span className="text-muted-foreground">live</span>
          {dangerLive > 0 && <span className="ml-1 text-destructive">⚠{dangerLive}</span>}
          {fbCount > 0 && <span className="ml-1 text-destructive">↻{fbCount}</span>}
        </span>
      </button>
    );
  }


  const countdownS =
    autoClearMs && nextClearAtRef.current
      ? Math.max(0, Math.ceil((nextClearAtRef.current - Date.now()) / 1000))
      : null;

  return (
    <div className="fixed bottom-3 right-3 z-[60] w-[400px] max-w-[calc(100vw-1.5rem)] max-h-[85vh] flex flex-col rounded-xl border border-primary/30 bg-card/95 backdrop-blur-xl shadow-[0_0_40px_-12px_hsl(var(--primary)/0.6)] text-xs font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Activity className={`w-4 h-4 ${totalActive > 0 ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
          <span className="font-display tracking-wider text-sm">AUDIO DIAGNOSTICS</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={downloadSnapshot}
            className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            aria-label="Download snapshot"
            title="Download JSON snapshot"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status strip */}
      <div className="px-3 py-1.5 border-b border-border flex items-center gap-3 text-[10px] uppercase tracking-wider">
        <span className="flex items-center gap-1">
          <span className="text-muted-foreground">ctx</span>
          <span className={ctxState === 'running' ? 'text-primary' : 'text-muted-foreground'}>{ctxState}</span>
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="tabular-nums">{sampleRate ? `${(sampleRate / 1000).toFixed(1)}k` : '—'}</span>
        <span className="text-muted-foreground">·</span>
        <span className="tabular-nums">
          live <span className={totalActive > 0 ? 'text-primary' : ''}>{totalActive}</span>
        </span>
        {dangerLive > 0 && (
          <span className="ml-auto px-1.5 rounded bg-destructive/20 text-destructive normal-case tracking-normal">
            ⚠ {dangerLive} ≥{SQUELCH_FREQ_HZ / 1000}kHz
          </span>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="freq" className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full grid grid-cols-3 h-8 rounded-none border-b border-border bg-transparent p-0">
          <TabsTrigger value="activity" className="text-[10px] uppercase tracking-wider rounded-none data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            Activity
          </TabsTrigger>
          <TabsTrigger value="freq" className="text-[10px] uppercase tracking-wider rounded-none data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <BarChart3 className="w-3 h-3 mr-1" /> Frequencies
          </TabsTrigger>
          <TabsTrigger value="sources" className="text-[10px] uppercase tracking-wider rounded-none data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            Sources ({sources.length})
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto min-h-[180px]" style={{ maxHeight: '40vh' }}>
          <TabsContent value="activity" className="m-0 px-3 py-2">
            {featureList.length === 0 ? (
              <div className="text-muted-foreground italic">No audio activity yet.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    <th className="text-left font-normal pb-1">Feature</th>
                    <th className="text-right font-normal pb-1">Live</th>
                    <th className="text-right font-normal pb-1">Total</th>
                    <th className="text-right font-normal pb-1">Age</th>
                  </tr>
                </thead>
                <tbody>
                  {featureList.map((f) => {
                    const age = f.lastStartedAt ? Math.round((performance.now() - f.lastStartedAt) / 100) / 10 : null;
                    return (
                      <tr key={f.feature} className={f.activeCount > 0 ? 'text-primary' : ''}>
                        <td className="py-0.5 truncate max-w-[160px]">{f.feature}</td>
                        <td className="text-right tabular-nums py-0.5">
                          {f.activeCount > 0 ? (
                            <span className="inline-block px-1.5 rounded bg-primary/20">{f.activeCount}</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="text-right tabular-nums py-0.5 text-muted-foreground">{f.totalStarted}</td>
                        <td className="text-right tabular-nums py-0.5 text-muted-foreground">
                          {age !== null ? `${age}s` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </TabsContent>

          <TabsContent value="freq" className="m-0 px-3 py-2">
            <FrequencyPanel />
          </TabsContent>

          <TabsContent value="sources" className="m-0 px-3 py-2">
            {sources.length === 0 ? (
              <div className="text-muted-foreground italic">No live sources.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    <th className="text-left font-normal pb-1">#</th>
                    <th className="text-left font-normal pb-1">Feature</th>
                    <th className="text-left font-normal pb-1">Kind</th>
                    <th className="text-right font-normal pb-1">Freq</th>
                    <th className="text-right font-normal pb-1">Age</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map((s) => {
                    const age = Math.round((performance.now() - s.startedAt) / 100) / 10;
                    const danger = s.freq && s.freq >= SQUELCH_FREQ_HZ;
                    return (
                      <tr key={s.id} className={danger ? 'text-destructive' : ''}>
                        <td className="py-0.5 text-muted-foreground tabular-nums">{s.id}</td>
                        <td className="py-0.5 truncate max-w-[110px]">{s.feature}</td>
                        <td className="py-0.5 text-muted-foreground">{s.kind}</td>
                        <td className="py-0.5 text-right tabular-nums">{s.freq ? `${Math.round(s.freq)}Hz` : '—'}</td>
                        <td className="py-0.5 text-right tabular-nums text-muted-foreground">{age}s</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </TabsContent>
        </div>
      </Tabs>

      {/* Auto-clear controls */}
      <div className="px-3 py-1.5 border-t border-border flex items-center gap-2 text-[10px] uppercase tracking-wider">
        <Timer className="w-3 h-3 text-muted-foreground" />
        <span className="text-muted-foreground">Auto-clear</span>
        <div className="flex rounded border border-border overflow-hidden">
          {AUTO_CLEAR_OPTIONS.map((opt) => (
            <button
              key={opt.ms}
              onClick={() => setAutoClearMs(opt.ms)}
              className={`px-2 py-0.5 transition-colors ${
                autoClearMs === opt.ms
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {countdownS !== null && (
          <span className="ml-auto text-muted-foreground tabular-nums normal-case tracking-normal">
            next {countdownS}s
          </span>
        )}
      </div>

      {/* Footer actions */}
      <div className="px-3 py-2 border-t border-border flex gap-2">
        <Button
          size="sm"
          variant="destructive"
          className="flex-1 h-7 text-[10px]"
          onClick={() => {
            const n = panicStopAll();
            try { toast.warning(`Panic-stopped ${n} source(s)`); } catch { console.info(`[Diagnostics] Panic-stopped ${n}`); }
          }}
        >
          <OctagonAlert className="w-3 h-3 mr-1" />
          PANIC
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => resetDiagnosticsCounters()}>
          <RotateCcw className="w-3 h-3 mr-1" />
          Reset
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => clearRecentFrequencies()}>
          <Eraser className="w-3 h-3 mr-1" />
          Freqs
        </Button>
      </div>
    </div>
  );
}

function FrequencyPanel() {
  useAudioDiagnostics((s) => s.tick);
  const bins = getFrequencyHistogram();
  const top = getTopFrequencies(8);
  const max = Math.max(1, ...bins.map((b) => b.count));
  const totalSamples = bins.reduce((sum, b) => sum + b.count, 0);
  const dangerCount = bins.filter((b) => b.dangerous).reduce((s, b) => s + b.count, 0);

  if (totalSamples === 0) {
    return <div className="text-muted-foreground italic">No frequency samples yet.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{totalSamples} samples · log-spaced</span>
        {dangerCount > 0 && (
          <span className="px-1.5 rounded bg-destructive/20 text-destructive normal-case tracking-normal">
            {dangerCount} ≥{SQUELCH_FREQ_HZ / 1000}kHz
          </span>
        )}
      </div>
      <div className="flex items-end gap-[2px] h-24" aria-label="Frequency histogram">
        {bins.map((b, i) => {
          const h = (b.count / max) * 100;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end gap-0.5"
              title={`${Math.round(b.minHz)}–${Math.round(b.maxHz)} Hz · ${b.count} sample(s)`}
            >
              <div
                className={`w-full rounded-sm transition-all ${b.dangerous ? 'bg-destructive' : 'bg-primary'} ${b.count === 0 ? 'opacity-20' : ''}`}
                style={{ height: `${Math.max(b.count > 0 ? 6 : 2, h)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-[2px] text-[9px] text-muted-foreground tabular-nums">
        {bins.map((b, i) => (
          <div key={i} className="flex-1 text-center">
            {i % 2 === 0 ? b.label : ''}
          </div>
        ))}
      </div>
      {top.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Top frequencies</div>
          <div className="flex flex-wrap gap-1">
            {top.map((t) => (
              <span
                key={t.freq}
                className={`px-1.5 py-0.5 rounded text-[10px] tabular-nums ${
                  t.dangerous ? 'bg-destructive/20 text-destructive' : 'bg-secondary text-foreground'
                }`}
              >
                {t.freq >= 1000 ? `${(t.freq / 1000).toFixed(2)}k` : t.freq}Hz
                <span className="text-muted-foreground"> ×{t.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
