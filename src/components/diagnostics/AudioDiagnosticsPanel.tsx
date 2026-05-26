import { useEffect, useState } from 'react';
import { Activity, X, OctagonAlert, RotateCcw, ChevronDown, BarChart3 } from 'lucide-react';
import {
  useAudioDiagnostics,
  panicStopAll,
  resetDiagnosticsCounters,
  getFrequencyHistogram,
  getTopFrequencies,
  SQUELCH_FREQ_HZ,
} from '@/lib/audioDiagnostics';
import { Button } from '@/components/ui/button';

/**
 * Floating audio diagnostics overlay.
 *
 * Collapsed pill in the bottom-right corner shows the total live source count.
 * Click to expand into a panel listing per-feature stats and live sources.
 * "Panic" button calls .stop() on every tracked source.
 */
export function AudioDiagnosticsPanel() {
  const [open, setOpen] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const { sources, features, ctxState, sampleRate } = useAudioDiagnostics();

  // Force re-render every 500ms so "age" columns tick.
  const [, setNow] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setNow((n) => n + 1), 500);
    return () => clearInterval(id);
  }, []);

  const totalActive = sources.length;
  const featureList = Object.values(features).sort((a, b) =>
    b.activeCount - a.activeCount || b.lastStartedAt - a.lastStartedAt,
  );

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
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-3 right-3 z-[60] w-[360px] max-w-[calc(100vw-1.5rem)] max-h-[80vh] flex flex-col rounded-xl border border-primary/30 bg-card/95 backdrop-blur-xl shadow-[0_0_40px_-12px_hsl(var(--primary)/0.6)] text-xs font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Activity className={`w-4 h-4 ${totalActive > 0 ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
          <span className="font-display tracking-wider text-sm">AUDIO DIAGNOSTICS</span>
        </div>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Context info */}
      <div className="px-3 py-2 border-b border-border grid grid-cols-3 gap-2 text-[10px] uppercase tracking-wider">
        <div>
          <div className="text-muted-foreground">Context</div>
          <div className={`tabular-nums ${ctxState === 'running' ? 'text-primary' : 'text-muted-foreground'}`}>{ctxState}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Sample Rate</div>
          <div className="tabular-nums">{sampleRate ? `${(sampleRate / 1000).toFixed(1)}k` : '—'}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Active</div>
          <div className={`tabular-nums ${totalActive > 0 ? 'text-primary' : ''}`}>{totalActive}</div>
        </div>
      </div>

      {/* Features table */}
      <div className="px-3 py-2 border-b border-border overflow-y-auto" style={{ maxHeight: '30vh' }}>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Features</div>
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
                    <td className="py-0.5 truncate max-w-[140px]">{f.feature}</td>
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
      </div>

      {/* Live sources collapsible */}
      <div className="border-b border-border">
        <button
          onClick={() => setShowSources((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          <span>Live sources ({sources.length})</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${showSources ? 'rotate-180' : ''}`} />
        </button>
        {showSources && (
          <div className="px-3 pb-2 overflow-y-auto" style={{ maxHeight: '25vh' }}>
            {sources.length === 0 ? (
              <div className="text-muted-foreground italic">None.</div>
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
                    return (
                      <tr key={s.id}>
                        <td className="py-0.5 text-muted-foreground tabular-nums">{s.id}</td>
                        <td className="py-0.5 truncate max-w-[100px]">{s.feature}</td>
                        <td className="py-0.5 text-muted-foreground">{s.kind}</td>
                        <td className="py-0.5 text-right tabular-nums">{s.freq ? `${Math.round(s.freq)}Hz` : '—'}</td>
                        <td className="py-0.5 text-right tabular-nums text-muted-foreground">{age}s</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-3 py-2 flex gap-2">
        <Button
          size="sm"
          variant="destructive"
          className="flex-1 h-7 text-[10px]"
          onClick={() => {
            const n = panicStopAll();
            console.info(`[Diagnostics] Panic-stopped ${n} source(s).`);
          }}
        >
          <OctagonAlert className="w-3 h-3 mr-1" />
          PANIC STOP
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[10px]"
          onClick={() => resetDiagnosticsCounters()}
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Reset
        </Button>
      </div>
    </div>
  );
}
