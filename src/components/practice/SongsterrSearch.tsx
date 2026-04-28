import { useEffect, useRef, useState } from 'react';
import { Search, ExternalLink, Loader2, Guitar, Music } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SongsterrTrack {
  instrument: string;
  name?: string;
  difficulty?: number;
}

interface SongsterrResult {
  songId: number;
  artistId: number;
  artist: string;
  title: string;
  hasChords?: boolean;
  hasPlayer?: boolean;
  tracks?: SongsterrTrack[];
}

const API_BASE = '/songsterr-api/songs';

async function searchSongs(pattern: string, signal: AbortSignal): Promise<SongsterrResult[]> {
  const url = `${API_BASE}?pattern=${encodeURIComponent(pattern)}&size=20`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Songsterr ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export function SongsterrSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SongsterrResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    setTouched(true);
    setLoading(true);
    setError(null);

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const handle = window.setTimeout(async () => {
      try {
        const data = await searchSongs(trimmed, ctrl.signal);
        if (!ctrl.signal.aborted) {
          setResults(data);
          setLoading(false);
        }
      } catch (err) {
        if (ctrl.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
        setLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(handle);
      ctrl.abort();
    };
  }, [query]);

  const showEmpty = touched && !loading && !error && query.trim().length >= 2 && results.length === 0;

  return (
    <div className="bg-card/60 rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-primary" />
        <h4 className="font-display text-sm font-bold">Search Songsterr</h4>
        <span className="text-[10px] text-muted-foreground">Song or artist</span>
      </div>

      <div className="relative">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Smoke on the Water, Metallica…"
          className="pr-9"
        />
        {loading && (
          <Loader2 className="w-4 h-4 text-muted-foreground animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
        )}
      </div>

      {error && (
        <div className="text-xs text-destructive bg-destructive/10 border border-destructive/40 rounded-md px-3 py-2">
          {error}. (In prod this API needs a CORS proxy — dev uses the Vite proxy.)
        </div>
      )}

      {showEmpty && (
        <div className="text-xs text-muted-foreground text-center py-3">
          No songs found for "{query.trim()}"
        </div>
      )}

      {results.length > 0 && (
        <ul className="divide-y divide-border max-h-96 overflow-y-auto rounded-lg border border-border bg-secondary/30">
          {results.map((r) => {
            const guitarTracks = (r.tracks ?? []).filter((t) =>
              /guitar|bass/i.test(t.instrument),
            ).length;
            const href = `https://www.songsterr.com/a/wa/song?id=${r.songId}`;
            return (
              <li key={r.songId}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2 hover:bg-secondary/60 transition-colors"
                >
                  <Guitar className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-display font-semibold truncate">{r.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{r.artist}</div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground shrink-0">
                    {r.hasChords && (
                      <span className="inline-flex items-center gap-0.5 text-primary/80">
                        <Music className="w-3 h-3" />
                        chords
                      </span>
                    )}
                    {guitarTracks > 0 && <span>{guitarTracks} tracks</span>}
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
