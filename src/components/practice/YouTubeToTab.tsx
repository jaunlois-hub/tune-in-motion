import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Square, AlertCircle, Loader2, Youtube, Download, Search, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { transcribeAudioBytes, renderAsciiTab, type TranscriptionResult } from '@/lib/audioToTab';
import { fretToFrequency } from '@/lib/musicTheory';

type Phase = 'idle' | 'fetching' | 'decoding' | 'transcribing' | 'done' | 'error';

interface SearchResult {
  id: string;
  title: string;
  uploader?: string;
  duration?: number;
  viewCount?: number;
  url: string;
}

const MAX_ANALYSE_SECONDS = 180;
const DEFAULT_ANALYSE_SECONDS = 60;

function formatDuration(s?: number): string {
  if (!s || !Number.isFinite(s)) return '';
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${r}`;
}

function formatViews(n?: number): string {
  if (!n) return '';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K views`;
  return `${n} views`;
}

export function YouTubeToTab() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [url, setUrl] = useState('');
  const [startSec, setStartSec] = useState(0);
  const [analyseSec, setAnalyseSec] = useState(DEFAULT_ANALYSE_SECONDS);

  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const playCtxRef = useRef<AudioContext | null>(null);
  const playTimeoutsRef = useRef<number[]>([]);
  const playOscRef = useRef<OscillatorNode[]>([]);
  const searchAbortRef = useRef<AbortController | null>(null);

  // Debounced search
  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      setSearchError(null);
      return;
    }
    setSearching(true);
    setSearchError(null);
    searchAbortRef.current?.abort();
    const ctrl = new AbortController();
    searchAbortRef.current = ctrl;

    const handle = window.setTimeout(async () => {
      try {
        const res = await fetch(`/dev/youtube-search?q=${encodeURIComponent(q)}&n=6`, { signal: ctrl.signal });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.hint ?? j.error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as { results: SearchResult[] };
        if (!ctrl.signal.aborted) {
          setResults(data.results ?? []);
          setSearching(false);
        }
      } catch (err) {
        if (ctrl.signal.aborted) return;
        setSearchError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
        setSearching(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(handle);
      ctrl.abort();
    };
  }, [search]);

  const transcribe = useCallback(async (sourceUrl: string) => {
    const trimmed = sourceUrl.trim();
    if (!trimmed) return;
    setError(null);
    setResult(null);
    setProgress(0);
    setPhase('fetching');

    try {
      const res = await fetch(`/dev/youtube-audio?url=${encodeURIComponent(trimmed)}`);
      if (!res.ok) {
        const msg = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(msg.error ?? `HTTP ${res.status}` + (msg.hint ? ` — ${msg.hint}` : ''));
      }
      const bytes = await res.arrayBuffer();
      setPhase('transcribing');
      const transcription = await transcribeAudioBytes(bytes, {
        startSeconds: startSec,
        maxSeconds: Math.max(5, Math.min(MAX_ANALYSE_SECONDS, analyseSec)),
        onProgress: (pct) => setProgress(Math.round(pct * 100)),
      });
      setResult(transcription);
      setPhase('done');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Transcription failed');
      setPhase('error');
    }
  }, [startSec, analyseSec]);

  const stopPlayback = useCallback(() => {
    playTimeoutsRef.current.forEach((t) => clearTimeout(t));
    playTimeoutsRef.current = [];
    playOscRef.current.forEach((o) => { try { o.stop(); } catch {} });
    playOscRef.current = [];
    if (playCtxRef.current && playCtxRef.current.state !== 'closed') {
      playCtxRef.current.close().catch(() => {});
    }
    playCtxRef.current = null;
    setIsPlaying(false);
  }, []);

  const playTranscription = useCallback(() => {
    if (!result) return;
    stopPlayback();
    const ctx = new AudioContext();
    playCtxRef.current = ctx;
    const start = ctx.currentTime + 0.05;
    const beatsPerSec = result.bpm / 60;

    result.notes.forEach((n) => {
      const freq = fretToFrequency(n.string, n.fret);
      const noteStart = start + n.startBeat / beatsPerSec;
      const noteEnd = noteStart + Math.max(0.08, n.durationBeats / beatsPerSec);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteStart);
      gain.gain.setValueAtTime(0, noteStart);
      gain.gain.linearRampToValueAtTime(0.2, noteStart + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
      osc.connect(gain).connect(ctx.destination);
      osc.start(noteStart);
      osc.stop(noteEnd + 0.05);
      playOscRef.current.push(osc);
    });

    setIsPlaying(true);
    const totalMs =
      (result.notes.reduce((m, n) => Math.max(m, n.startBeat + n.durationBeats), 0) / beatsPerSec) * 1000 + 400;
    const t = window.setTimeout(() => {
      setIsPlaying(false);
      playCtxRef.current?.close().catch(() => {});
      playCtxRef.current = null;
    }, totalMs);
    playTimeoutsRef.current.push(t);
  }, [result, stopPlayback]);

  const busy = phase === 'fetching' || phase === 'decoding' || phase === 'transcribing';
  const busyLabel =
    phase === 'fetching' ? 'Fetching audio (yt-dlp)…'
    : phase === 'decoding' ? 'Decoding…'
    : phase === 'transcribing' ? `Transcribing (ML) — ${progress}%`
    : '';

  const pickResult = (r: SearchResult) => {
    setUrl(r.url);
    setSearch('');
    setResults([]);
    transcribe(r.url);
  };

  return (
    <div className="bg-card/60 rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Youtube className="w-4 h-4 text-primary" />
        <h4 className="font-display text-sm font-bold">YouTube → Tab</h4>
        <span className="text-[10px] text-muted-foreground">localhost only • AI transcription</span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search YouTube (e.g. 'metallica enter sandman')"
          className="pl-9 pr-9"
          disabled={busy}
        />
        {searching && (
          <Loader2 className="w-4 h-4 text-muted-foreground animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
        )}
      </div>

      {searchError && (
        <div className="text-xs text-destructive bg-destructive/10 border border-destructive/40 rounded-md px-3 py-2">
          {searchError}
        </div>
      )}

      {results.length > 0 && (
        <ul className="divide-y divide-border max-h-72 overflow-y-auto rounded-lg border border-border bg-secondary/30">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => pickResult(r)}
                disabled={busy}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-secondary/60 transition-colors text-left disabled:opacity-50"
              >
                <Youtube className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-display font-semibold truncate">{r.title}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {r.uploader}{r.duration ? ` • ${formatDuration(r.duration)}` : ''}{r.viewCount ? ` • ${formatViews(r.viewCount)}` : ''}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Manual URL + transcribe */}
      <div className="flex items-center gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="…or paste a YouTube URL"
          disabled={busy}
        />
        <Button onClick={() => transcribe(url)} disabled={busy || !url.trim()} className="gap-1.5 shrink-0">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {busy ? 'Working' : 'Transcribe'}
        </Button>
      </div>

      {/* Timing controls */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <label className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Start</span>
          <Input
            type="number"
            min={0}
            step={1}
            value={startSec}
            onChange={(e) => setStartSec(Math.max(0, Number(e.target.value) || 0))}
            disabled={busy}
            className="h-8"
          />
          <span className="text-muted-foreground">s</span>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-muted-foreground">Analyse</span>
          <Input
            type="number"
            min={5}
            max={MAX_ANALYSE_SECONDS}
            step={5}
            value={analyseSec}
            onChange={(e) => {
              const v = Number(e.target.value) || DEFAULT_ANALYSE_SECONDS;
              setAnalyseSec(Math.max(5, Math.min(MAX_ANALYSE_SECONDS, v)));
            }}
            disabled={busy}
            className="h-8"
          />
          <span className="text-muted-foreground">s (max {MAX_ANALYSE_SECONDS})</span>
        </label>
      </div>

      {busy && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> {busyLabel}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/40 rounded-md px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="break-words">{error}</span>
        </div>
      )}

      {result && phase === 'done' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span><span className="text-foreground font-display">{result.notes.length}</span> notes</span>
            <span><span className="text-foreground font-display">{result.bpm}</span> BPM (est.)</span>
            <span><span className="text-foreground font-display">{result.durationSeconds.toFixed(1)}s</span> analysed</span>
          </div>

          <pre className="bg-secondary/50 rounded-lg p-3 text-[10px] leading-4 font-mono text-foreground overflow-x-auto whitespace-pre max-h-64">
            {renderAsciiTab(result.notes, 160)}
          </pre>

          <div className="flex justify-center">
            <Button
              onClick={isPlaying ? stopPlayback : playTranscription}
              variant={isPlaying ? 'destructive' : 'default'}
              className="gap-2"
              disabled={result.notes.length === 0}
            >
              {isPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? 'Stop' : 'Play transcription'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
