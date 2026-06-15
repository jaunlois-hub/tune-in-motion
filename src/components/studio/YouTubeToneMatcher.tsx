import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Youtube, Search, Zap, ChevronDown, ChevronUp, ExternalLink, Music, Loader2, Save, Guitar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { matchPresetsToTitle, type TonePreset } from '@/lib/tonePresets';
import { findSongChords, type SongChords } from '@/lib/songChords';
import { ChordDiagram } from '@/components/studio/ChordDiagram';
import type { EffectSettings } from '@/hooks/useGuitarEffects';

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

interface YouTubeToneMatcherProps {
  onApplyPreset: (settings: EffectSettings) => void;
  onSavePreset?: (artist: string, song: string) => void;
}

export function YouTubeToneMatcher({ onApplyPreset, onSavePreset }: YouTubeToneMatcherProps) {
  const [url, setUrl] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchedPreset, setMatchedPreset] = useState<TonePreset | null>(null);
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [showDiagrams, setShowDiagrams] = useState(true);

  const allMatches = useMemo(() => {
    if (!videoTitle) return [];
    return matchPresetsToTitle(videoTitle);
  }, [videoTitle]);

  const songChords = useMemo<SongChords | null>(() => {
    if (!videoTitle) return null;
    return findSongChords(videoTitle);
  }, [videoTitle]);

  const handleAnalyze = useCallback(async () => {
    const id = extractVideoId(url);
    if (!id) {
      setError('Invalid YouTube URL. Paste a full YouTube link.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setVideoId(id);
    setMatchedPreset(null);
    setVideoTitle(null);

    try {
      // Use YouTube oEmbed API (CORS-friendly) to get video title
      const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
      if (!res.ok) throw new Error('Could not fetch video info');
      const data = await res.json();
      const title = data.title as string;
      setVideoTitle(title);

      // Match against presets
      const matches = matchPresetsToTitle(title);
      if (matches.length > 0) {
        setMatchedPreset(matches[0].preset);
      }
    } catch {
      setError('Could not fetch video title. You can still watch and manually pick a preset.');
      setVideoTitle(null);
    } finally {
      setIsLoading(false);
    }
  }, [url]);

  const handleApply = (preset: TonePreset) => {
    setMatchedPreset(preset);
    onApplyPreset(preset.settings);
  };

  return (
    <div className="space-y-4">
      {/* URL Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
          <input
            type="text"
            placeholder="Paste YouTube URL..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-secondary/50 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <Button onClick={handleAnalyze} disabled={isLoading || !url.trim()} className="shrink-0">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          <span className="hidden sm:inline ml-1">Match Tone</span>
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* YouTube Embed */}
      <AnimatePresence>
        {videoId && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="aspect-video w-full rounded-xl overflow-hidden border border-border bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?rel=0`}
                title="YouTube video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>

            {videoTitle && (
              <div className="mt-3 flex items-start gap-2">
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-sm text-foreground font-medium line-clamp-2">{videoTitle}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Song chords (Play Along) */}
      <AnimatePresence>
        {songChords && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl border border-amber-400/30 bg-gradient-to-br from-amber-400/10 via-card/60 to-card/30 p-4 space-y-3"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Guitar className="w-4 h-4 text-amber-300" />
                <span className="text-xs font-display font-bold text-amber-200 uppercase tracking-wider">
                  Play Along · Chords
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-foreground/85">
                <span className="px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30">
                  Key: <span className="font-bold text-amber-200">{songChords.key}</span>
                </span>
                {songChords.bpm && (
                  <span className="px-2 py-0.5 rounded-full bg-secondary/40 border border-border/40">
                    {songChords.bpm} BPM
                  </span>
                )}
                {songChords.capo !== undefined && songChords.capo > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-primary">
                    Capo {songChords.capo}
                  </span>
                )}
                <button
                  onClick={() => setShowDiagrams((v) => !v)}
                  className="text-[10px] underline-offset-2 hover:underline text-muted-foreground"
                >
                  {showDiagrams ? 'Hide diagrams' : 'Show diagrams'}
                </button>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground">
              <span className="text-foreground/90">{songChords.artist}</span> · {songChords.song}
            </div>

            <div className="space-y-3">
              {songChords.sections.map((section) => (
                <div key={section.name} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[10px] font-display font-bold uppercase tracking-wider text-amber-300">
                      {section.name}
                    </span>
                    {section.description && (
                      <span className="text-[10px] text-muted-foreground/80 italic line-clamp-1">{section.description}</span>
                    )}
                  </div>

                  {/* Chord-name strip — always visible, scrollable */}
                  <div className="flex flex-wrap gap-1.5">
                    {section.chords.map((c, i) => (
                      <span
                        key={`${c}-${i}`}
                        className="px-2.5 py-1 rounded-md bg-secondary/50 border border-border/60 text-sm font-display font-bold text-primary shadow-sm"
                      >
                        {c}
                      </span>
                    ))}
                  </div>

                  {/* Diagram row — togglable */}
                  {showDiagrams && (
                    <div className="flex flex-wrap gap-3 pt-2">
                      {/* Deduplicate chords for the diagram row so we don't draw the same diagram twice */}
                      {Array.from(new Set(section.chords)).map((c) => (
                        <div key={`diag-${c}`} className="shrink-0">
                          <ChordDiagram chord={c} size="xs" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {songChords.source && (
              <div className="text-[10px] text-muted-foreground/60 italic border-t border-border/30 pt-2">
                {songChords.source}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Match Result */}
      <AnimatePresence>
        {matchedPreset && videoTitle && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {/* Best Match */}
            <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-primary uppercase tracking-wider">Best Match</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-foreground">{matchedPreset.name}</p>
                  <p className="text-xs text-muted-foreground">{matchedPreset.artist} • {matchedPreset.genre}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">{matchedPreset.description}</p>
                </div>
                <Button size="sm" onClick={() => handleApply(matchedPreset)} className="shrink-0">
                  Apply
                </Button>
                {onSavePreset && (
                  <Button size="sm" variant="outline" onClick={() => onSavePreset(matchedPreset.artist, matchedPreset.youtubeRef || '')} className="shrink-0">
                    <Save className="w-3.5 h-3.5 mr-1" /> Save
                  </Button>
                )}
              </div>
            </div>

            {/* Other Matches */}
            {allMatches.length > 1 && (
              <div>
                <button
                  onClick={() => setShowAllMatches(!showAllMatches)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showAllMatches ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {allMatches.length - 1} other match{allMatches.length - 1 !== 1 ? 'es' : ''}
                </button>

                <AnimatePresence>
                  {showAllMatches && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 space-y-1.5 overflow-hidden"
                    >
                      {allMatches.slice(1).map(({ preset, score }) => (
                        <button
                          key={preset.name}
                          onClick={() => handleApply(preset)}
                          className={cn(
                            "w-full text-left flex items-center justify-between p-2.5 rounded-lg transition-all",
                            matchedPreset.name === preset.name
                              ? "bg-primary/10 border border-primary/30"
                              : "bg-secondary/40 hover:bg-secondary"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Music className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{preset.name}</p>
                              <p className="text-[10px] text-muted-foreground">{preset.artist} • {preset.genre}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-muted-foreground/50">{Math.round((score / allMatches[0].score) * 100)}%</span>
                            <span className="text-[10px] text-primary">Apply</span>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {allMatches.length === 0 && videoTitle && !isLoading && (
              <div className="text-center py-3">
                <p className="text-sm text-muted-foreground">No automatic match found for this track.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Try browsing the Tone Library below to find a matching sound.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* No match state */}
      {videoTitle && !matchedPreset && !isLoading && allMatches.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-4 bg-secondary/30 rounded-xl border border-border"
        >
          <Search className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No automatic match found.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Browse the Tone Library below to find a similar sound.</p>
        </motion.div>
      )}
    </div>
  );
}
