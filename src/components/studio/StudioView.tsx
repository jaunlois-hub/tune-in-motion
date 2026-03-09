import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Power, RotateCcw, Mic, Mic2, Square, Play, Pause, Trash2, Repeat, Volume2, ChevronDown, ChevronUp, Minus, Plus, Scissors, Download, Search, Music, Disc3, Youtube, Save, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useGuitarEffects, type EffectSettings } from '@/hooks/useGuitarEffects';
import { useDrumMachine, DRUM_PATTERNS } from '@/hooks/useDrumMachine';
import { useLoopRecorder } from '@/hooks/useLoopRecorder';
import { useMasterVolume } from '@/hooks/useMasterVolume';
import { useBpmSync } from '@/hooks/useBpmSync';
import { TONE_PRESETS, type TonePreset } from '@/lib/tonePresets';
import { useCustomPresets, type CustomPreset } from '@/hooks/useCustomPresets';
import { YouTubeToneMatcher } from '@/components/studio/YouTubeToneMatcher';

function EffectKnob({ label, value, onChange, min = 0, max = 1, step = 0.01, unit = '%' }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; unit?: string;
}) {
  const display = unit === '%' ? Math.round(value * 100) : value.toFixed(2);
  const rotation = ((value - min) / (max - min)) * 270 - 135;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-14 h-14">
        <motion.div className="absolute inset-0 rounded-full" style={{ rotate: rotation }}>
          <div className="absolute w-1 h-4 bg-primary rounded-full top-2 left-1/2 -translate-x-1/2" />
        </motion.div>
        <svg className="absolute inset-0 w-full h-full -rotate-[135deg]" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--border))" strokeWidth="3" strokeDasharray="132" strokeDashoffset="44" strokeLinecap="round" />
          <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeDasharray="132" strokeDashoffset={132 - ((value - min) / (max - min)) * 88} strokeLinecap="round" className="drop-shadow-[0_0_8px_hsl(var(--primary))]" />
        </svg>
      </div>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={step} className="w-16" />
      <div className="text-center">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-xs font-mono text-primary">{display}{unit === '%' ? '%' : unit}</p>
      </div>
    </div>
  );
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 10);
  return `${m}:${sec.toString().padStart(2, '0')}.${ms}`;
}

type EffectCategory = 'core' | 'dynamics' | 'eq' | 'modulation' | 'time' | 'pitch';

const EFFECT_CATEGORIES: { id: EffectCategory; label: string; icon: string }[] = [
  { id: 'core', label: 'Core', icon: '🎸' },
  { id: 'dynamics', label: 'Dynamics', icon: '📊' },
  { id: 'eq', label: 'EQ', icon: '🎚️' },
  { id: 'modulation', label: 'Modulation', icon: '🌊' },
  { id: 'time', label: 'Time', icon: '⏱️' },
  { id: 'pitch', label: 'Pitch', icon: '🎵' },
];

const EFFECTS_BY_CATEGORY: Record<EffectCategory, { key: keyof EffectSettings; label: string; min?: number; max?: number; unit?: string; step?: number }[]> = {
  core: [
    { key: 'distortion', label: 'Distortion' },
    { key: 'gain', label: 'Gain' },
  ],
  dynamics: [
    { key: 'compressor', label: 'Compress' },
    { key: 'noiseGate', label: 'Gate' },
  ],
  eq: [
    { key: 'eqBass', label: 'Bass' },
    { key: 'eqMid', label: 'Mid' },
    { key: 'eqTreble', label: 'Treble' },
  ],
  modulation: [
    { key: 'chorus', label: 'Chorus' },
    { key: 'chorusRate', label: 'Ch Rate', min: 0.1, max: 5, unit: 'Hz', step: 0.1 },
    { key: 'flanger', label: 'Flanger' },
    { key: 'flangerRate', label: 'Fl Rate', min: 0.1, max: 5, unit: 'Hz', step: 0.1 },
    { key: 'phaser', label: 'Phaser' },
    { key: 'phaserRate', label: 'Ph Rate', min: 0.1, max: 5, unit: 'Hz', step: 0.1 },
    { key: 'wah', label: 'Wah' },
    { key: 'wahFreq', label: 'Wah Freq' },
    { key: 'tremolo', label: 'Tremolo' },
    { key: 'tremoloRate', label: 'Trem Rate', min: 1, max: 15, unit: 'Hz', step: 0.5 },
  ],
  time: [
    { key: 'delay', label: 'Delay' },
    { key: 'delayTime', label: 'Time', min: 0.05, max: 1, unit: 's' },
    { key: 'reverb', label: 'Reverb' },
  ],
  pitch: [
    { key: 'octaver', label: 'Octaver' },
    { key: 'octaverMix', label: 'Oct Mix' },
  ],
};

function TonePresetCard({ preset, onApply }: { preset: TonePreset; onApply: () => void }) {
  return (
    <motion.button
      onClick={onApply}
      className="text-left p-3 rounded-xl bg-secondary/50 hover:bg-secondary border border-transparent hover:border-primary/20 transition-all group"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">{preset.name}</p>
          <p className="text-[10px] text-muted-foreground">{preset.artist} • {preset.genre}</p>
        </div>
        <Music className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
      </div>
      <p className="text-[10px] text-muted-foreground/70 mt-1 line-clamp-2">{preset.description}</p>
      {preset.youtubeRef && (
        <p className="text-[10px] text-primary/60 mt-1 flex items-center gap-1">
          <Disc3 className="w-2.5 h-2.5" /> {preset.youtubeRef}
        </p>
      )}
    </motion.button>
  );
}

function CustomPresetCard({ preset, onApply, onDelete }: { preset: CustomPreset; onApply: () => void; onDelete: () => void }) {
  return (
    <motion.div
      className="text-left p-3 rounded-xl bg-accent/20 hover:bg-accent/30 border border-accent/30 hover:border-primary/30 transition-all group relative"
      whileHover={{ scale: 1.02 }}
    >
      <button onClick={onApply} className="w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Star className="w-3 h-3 text-primary shrink-0" />
              <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">{preset.name}</p>
            </div>
            {(preset.artist || preset.song) && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {preset.artist}{preset.artist && preset.song ? ' • ' : ''}{preset.song}
              </p>
            )}
            {preset.genre && <p className="text-[10px] text-muted-foreground/60">{preset.genre}</p>}
          </div>
        </div>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </motion.div>
  );
}

function SavePresetDialog({ onSave, onClose, initialArtist, initialSong }: {
  onSave: (name: string, artist: string, song: string, genre: string) => void;
  onClose: () => void;
  initialArtist?: string;
  initialSong?: string;
}) {
  const [name, setName] = useState('');
  const [artist, setArtist] = useState(initialArtist || '');
  const [song, setSong] = useState(initialSong || '');
  const [genre, setGenre] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="p-4 bg-card border border-border rounded-xl shadow-lg space-y-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-1.5">
          <Save className="w-4 h-4 text-primary" /> Save Custom Preset
        </h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-secondary"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label className="text-[10px] text-muted-foreground mb-1 block">Preset Name *</label>
          <input
            value={name} onChange={e => setName(e.target.value)}
            placeholder="My Custom Tone"
            className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">Band / Artist</label>
          <input
            value={artist} onChange={e => setArtist(e.target.value)}
            placeholder="e.g. Metallica"
            className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">Song Name</label>
          <input
            value={song} onChange={e => setSong(e.target.value)}
            placeholder="e.g. Master of Puppets"
            className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="col-span-2">
          <label className="text-[10px] text-muted-foreground mb-1 block">Genre</label>
          <input
            value={genre} onChange={e => setGenre(e.target.value)}
            placeholder="e.g. Metal, Blues, Rock"
            className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" disabled={!name.trim()} onClick={() => { onSave(name.trim(), artist.trim(), song.trim(), genre.trim()); onClose(); }}>
          <Save className="w-3.5 h-3.5 mr-1" /> Save
        </Button>
      </div>
    </motion.div>
  );
}

export function StudioView() {
  const [toneMatchOpen, setToneMatchOpen] = useState(true);
  const [effectsOpen, setEffectsOpen] = useState(true);
  const [drumsOpen, setDrumsOpen] = useState(true);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [trimmingLoopId, setTrimmingLoopId] = useState<string | null>(null);
  const [activeEffectCategory, setActiveEffectCategory] = useState<EffectCategory>('core');
  const [presetSearch, setPresetSearch] = useState('');
  const [presetGenre, setPresetGenre] = useState('All');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveInitialArtist, setSaveInitialArtist] = useState('');
  const [saveInitialSong, setSaveInitialSong] = useState('');
  const { masterVolume, setMasterVolume } = useMasterVolume();
  const { bpm, setBpm } = useBpmSync();
  const { isActive: effectsActive, settings, error: effectsError, start: startEffects, stop: stopEffects, updateSetting, resetSettings } = useGuitarEffects();
  const { isPlaying: drumsPlaying, currentPattern, currentStep, volume: drumsVolume, swing, setCurrentPattern, setVolume: setDrumsVolume, setSwing, start: startDrums, stop: stopDrums } = useDrumMachine();
  const { isRecording, loops, playingLoopId, recordingDuration, startRecording, stopRecording, playLoop, stopLoop, deleteLoop, updateLoopTrim, exportLoop } = useLoopRecorder();
  const { presets: customPresets, savePreset, deletePreset } = useCustomPresets();

  const filteredPresets = useMemo(() => {
    return TONE_PRESETS.filter(p => {
      const matchesSearch = presetSearch === '' ||
        p.name.toLowerCase().includes(presetSearch.toLowerCase()) ||
        p.artist.toLowerCase().includes(presetSearch.toLowerCase()) ||
        p.description.toLowerCase().includes(presetSearch.toLowerCase());
      const matchesGenre = presetGenre === 'All' || p.genre === presetGenre;
      return matchesSearch && matchesGenre;
    });
  }, [presetSearch, presetGenre]);

  const filteredCustomPresets = useMemo(() => {
    if (presetSearch === '' && presetGenre === 'All') return customPresets;
    return customPresets.filter(p => {
      const matchesSearch = presetSearch === '' ||
        p.name.toLowerCase().includes(presetSearch.toLowerCase()) ||
        p.artist.toLowerCase().includes(presetSearch.toLowerCase()) ||
        p.song.toLowerCase().includes(presetSearch.toLowerCase());
      const matchesGenre = presetGenre === 'All' || p.genre.toLowerCase().includes(presetGenre.toLowerCase());
      return matchesSearch && matchesGenre;
    });
  }, [customPresets, presetSearch, presetGenre]);

  const genres = useMemo(() => {
    const g = new Set(TONE_PRESETS.map(p => p.genre));
    return ['All', ...Array.from(g).sort()];
  }, []);

  const applyPreset = (preset: TonePreset) => {
    Object.entries(preset.settings).forEach(([k, v]) => updateSetting(k as keyof EffectSettings, v));
  };

  const applyCustomPreset = (preset: CustomPreset) => {
    Object.entries(preset.settings).forEach(([k, v]) => updateSetting(k as keyof EffectSettings, v));
  };

  const handleSavePreset = (name: string, artist: string, song: string, genre: string) => {
    savePreset({ name, artist, song, genre, settings: { ...settings } });
  };

  const openSaveDialog = (artist = '', song = '') => {
    setSaveInitialArtist(artist);
    setSaveInitialSong(song);
    setShowSaveDialog(true);
  };

  const currentEffects = EFFECTS_BY_CATEGORY[activeEffectCategory];

  return (
    <div className="space-y-4">
      {/* Master Controls */}
      <div className="bg-card/50 border border-border rounded-2xl p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Volume2 className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium">Master</span>
            <Slider value={[masterVolume * 100]} onValueChange={([v]) => setMasterVolume(v / 100)} min={0} max={100} className="w-24" />
            <span className="text-xs text-muted-foreground w-8">{Math.round(masterVolume * 100)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setBpm(Math.max(30, bpm - 5))}><Minus className="w-3 h-3" /></Button>
            <div className="text-center w-20">
              <span className="font-display text-2xl font-bold text-primary">{bpm}</span>
              <span className="text-xs text-muted-foreground ml-1">BPM</span>
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setBpm(Math.min(300, bpm + 5))}><Plus className="w-3 h-3" /></Button>
          </div>
        </div>
      </div>

      {/* YouTube Tone Matcher */}
      <Collapsible open={toneMatchOpen} onOpenChange={setToneMatchOpen}>
        <div className="bg-card/50 border border-border rounded-2xl overflow-hidden">
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors">
              <div className="flex items-center gap-3">
                <Youtube className="w-5 h-5 text-destructive" />
                <h2 className="font-display text-lg font-bold">🎯 Tone Matcher</h2>
                <span className="text-[10px] text-muted-foreground">Paste a YouTube link → auto-match effects</span>
              </div>
              {toneMatchOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 pt-0">
              <YouTubeToneMatcher
                onApplyPreset={(s) => {
                  Object.entries(s).forEach(([k, v]) => updateSetting(k as keyof EffectSettings, v));
                }}
                onSavePreset={(artist, song) => openSaveDialog(artist, song)}
              />
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Loop Recorder */}
      <div className="bg-card/50 border border-border rounded-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold">🎙️ Loop Recorder</h2>
          <span className="text-xs text-muted-foreground">{loops.length} loop{loops.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-6">
          <motion.button
            onClick={isRecording ? stopRecording : startRecording}
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shrink-0",
              isRecording ? "bg-destructive text-destructive-foreground shadow-[0_0_30px_hsl(var(--destructive)/0.5)]" : "bg-secondary hover:bg-secondary/80 text-muted-foreground"
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={isRecording ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 0.5, repeat: isRecording ? Infinity : 0 }}
          >
            {isRecording ? <Square className="w-6 h-6" /> : <Mic className="w-8 h-8" />}
          </motion.button>
          <div className="flex-1">
            {isRecording ? (
              <div className="flex items-center gap-3">
                <motion.div className="w-3 h-3 rounded-full bg-destructive" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
                <span className="font-display text-2xl font-bold text-destructive">{formatDuration(recordingDuration)}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">Ready to record</span>
            )}
          </div>
        </div>

        {loops.length > 0 && (
          <div className="mt-4 space-y-2">
            {loops.map((loop, index) => (
              <div key={loop.id}>
                <motion.div
                  className={cn("flex items-center gap-3 p-3 rounded-xl transition-all", playingLoopId === loop.id ? "bg-primary/10 border border-primary/30" : "bg-secondary/50")}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                >
                  <span className="text-xs text-muted-foreground w-6">#{index + 1}</span>
                  <div className="flex-1 h-8 rounded bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 flex items-center justify-center overflow-hidden relative">
                    {(loop.trimStart > 0 || loop.trimEnd < loop.duration) && (
                      <>
                        <div className="absolute left-0 top-0 bottom-0 bg-background/70" style={{ width: `${(loop.trimStart / loop.duration) * 100}%` }} />
                        <div className="absolute right-0 top-0 bottom-0 bg-background/70" style={{ width: `${((loop.duration - loop.trimEnd) / loop.duration) * 100}%` }} />
                      </>
                    )}
                    <div className="flex items-end gap-0.5 h-6 relative z-10">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <motion.div key={i} className="w-0.5 bg-primary rounded-full" style={{ height: `${20 + Math.random() * 80}%` }}
                          animate={playingLoopId === loop.id ? { height: ['20%', `${20 + Math.random() * 80}%`, '20%'] } : {}}
                          transition={{ duration: 0.3, repeat: Infinity, delay: i * 0.02 }}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">{formatDuration(loop.trimEnd - loop.trimStart)}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => playingLoopId === loop.id ? stopLoop(loop.id) : playLoop(loop.id, false)}>
                      {playingLoopId === loop.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => playLoop(loop.id, true)}><Repeat className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="icon" className={cn("h-8 w-8", trimmingLoopId === loop.id && "text-primary")} onClick={() => setTrimmingLoopId(trimmingLoopId === loop.id ? null : loop.id)}>
                      <Scissors className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => exportLoop(loop.id)}><Download className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteLoop(loop.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </motion.div>
                {trimmingLoopId === loop.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-2 p-3 bg-secondary/30 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium flex items-center gap-1"><Scissors className="w-3 h-3" />Trim</span>
                      <span className="text-xs text-muted-foreground">{formatDuration(loop.trimStart)} - {formatDuration(loop.trimEnd)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-muted-foreground mb-1 block">Start</label>
                        <Slider value={[loop.trimStart]} onValueChange={([v]) => updateLoopTrim(loop.id, Math.min(v, loop.trimEnd - 0.1), loop.trimEnd)} min={0} max={loop.duration} step={0.1} />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground mb-1 block">End</label>
                        <Slider value={[loop.trimEnd]} onValueChange={([v]) => updateLoopTrim(loop.id, loop.trimStart, Math.max(v, loop.trimStart + 0.1))} min={0} max={loop.duration} step={0.1} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Effects Panel */}
      <Collapsible open={effectsOpen} onOpenChange={setEffectsOpen}>
        <div className="bg-card/50 border border-border rounded-2xl overflow-hidden">
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className={cn("w-3 h-3 rounded-full", effectsActive ? "bg-tuner-perfect shadow-[0_0_8px_hsl(var(--tuner-perfect))]" : "bg-muted")} />
                <h2 className="font-display text-lg font-bold">🎸 Guitar Effects</h2>
                <span className="text-[10px] text-muted-foreground">{EFFECT_CATEGORIES.length} categories • {Object.values(EFFECTS_BY_CATEGORY).flat().length} params</span>
              </div>
              {effectsOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 pt-0 space-y-4">
              {effectsError ? (
                <div className="text-center py-4">
                  <p className="text-destructive text-sm mb-2">{effectsError}</p>
                  <Button size="sm" onClick={startEffects}>Try Again</Button>
                </div>
              ) : (
                <>
                  {/* Effect Category Tabs */}
                  <div className="flex gap-1 overflow-x-auto pb-1">
                    {EFFECT_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setActiveEffectCategory(cat.id)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                          activeEffectCategory === cat.id
                            ? "bg-primary/20 text-primary border border-primary/30"
                            : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                        )}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Effect Knobs */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeEffectCategory}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-wrap justify-center gap-4"
                    >
                      {currentEffects.map((e) => (
                        <EffectKnob key={e.key} label={e.label} value={settings[e.key]} onChange={(v) => updateSetting(e.key, v)} min={e.min} max={e.max} unit={e.unit} step={e.step} />
                      ))}
                    </motion.div>
                  </AnimatePresence>

                  {/* Power & Controls */}
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <Button variant="ghost" size="sm" onClick={resetSettings}><RotateCcw className="w-4 h-4 mr-1" />Reset</Button>
                    <Button variant="ghost" size="sm" onClick={() => openSaveDialog()}>
                      <Save className="w-4 h-4 mr-1" />Save Preset
                    </Button>
                    <motion.button
                      onClick={effectsActive ? stopEffects : startEffects}
                      className={cn("w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300",
                        effectsActive ? "bg-tuner-perfect text-primary-foreground shadow-[0_0_30px_hsl(var(--tuner-perfect)/0.5)]" : "bg-secondary hover:bg-secondary/80 text-muted-foreground"
                      )}
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    >
                      <Power className="w-7 h-7" />
                    </motion.button>
                    <Button variant="ghost" size="sm" onClick={() => setPresetsOpen(!presetsOpen)}>
                      <Music className="w-4 h-4 mr-1" /> Tone Library {presetsOpen ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                    </Button>
                  </div>

                  {/* Save Preset Dialog */}
                  <AnimatePresence>
                    {showSaveDialog && (
                      <SavePresetDialog
                        onSave={handleSavePreset}
                        onClose={() => setShowSaveDialog(false)}
                        initialArtist={saveInitialArtist}
                        initialSong={saveInitialSong}
                      />
                    )}
                  </AnimatePresence>

                  {/* Tone Preset Library */}
                  <AnimatePresence>
                    {presetsOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-3 pt-2">
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <input
                                type="text"
                                placeholder="Search artists, tones, songs..."
                                value={presetSearch}
                                onChange={(e) => setPresetSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 rounded-lg bg-secondary/50 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            </div>
                          </div>
                          <div className="flex gap-1 overflow-x-auto pb-1">
                            {genres.map((g) => (
                              <button
                                key={g}
                                onClick={() => setPresetGenre(g)}
                                className={cn(
                                  "px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-all",
                                  presetGenre === g ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                                )}
                              >
                                {g}
                              </button>
                            ))}
                          </div>

                          {/* Custom Presets Section */}
                          {filteredCustomPresets.length > 0 && (
                            <div>
                              <p className="text-[10px] text-primary font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                                <Star className="w-3 h-3" /> My Presets ({filteredCustomPresets.length})
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
                                {filteredCustomPresets.map((preset) => (
                                  <CustomPresetCard
                                    key={preset.id}
                                    preset={preset}
                                    onApply={() => applyCustomPreset(preset)}
                                    onDelete={() => deletePreset(preset.id)}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Built-in Presets */}
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">
                            Built-in Presets ({filteredPresets.length})
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                            {filteredPresets.map((preset) => (
                              <TonePresetCard key={preset.name} preset={preset} onApply={() => applyPreset(preset)} />
                            ))}
                          </div>
                          {filteredPresets.length === 0 && filteredCustomPresets.length === 0 && (
                            <p className="text-center text-sm text-muted-foreground py-4">No presets match your search</p>
                          )}
                          <p className="text-[10px] text-muted-foreground/50 text-center">
                            {filteredCustomPresets.length + filteredPresets.length} of {customPresets.length + TONE_PRESETS.length} presets
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Drums Panel */}
      <Collapsible open={drumsOpen} onOpenChange={setDrumsOpen}>
        <div className="bg-card/50 border border-border rounded-2xl overflow-hidden">
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className={cn("w-3 h-3 rounded-full", drumsPlaying ? "bg-tuner-perfect shadow-[0_0_8px_hsl(var(--tuner-perfect))]" : "bg-muted")} />
                <h2 className="font-display text-lg font-bold">🥁 Drum Machine</h2>
                <span className="text-xs text-muted-foreground">{DRUM_PATTERNS[currentPattern]?.name} • {bpm} BPM</span>
              </div>
              {drumsOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 pt-0 space-y-4">
              {/* Step Sequencer Grid */}
              <div className="space-y-1.5 overflow-x-auto">
                {['Kick', 'Snare', 'HH', 'OH', 'Tom', 'Rim'].map((drum, di) => {
                  const steps = DRUM_PATTERNS[currentPattern]?.pattern[di];
                  if (!steps || steps.every(s => s === 0)) return null;
                  return (
                    <div key={drum} className="flex items-center gap-1.5">
                      <span className="w-8 text-[9px] text-muted-foreground font-medium shrink-0">{drum}</span>
                      <div className="flex gap-px flex-1">
                        {steps.map((vel, si) => (
                          <motion.div key={si}
                            className={cn(
                              "flex-1 rounded-sm transition-all duration-75",
                              si % 4 === 0 ? "ml-0.5" : "",
                              vel > 0
                                ? currentStep === si && drumsPlaying
                                  ? "bg-tuner-perfect shadow-[0_0_8px_hsl(var(--tuner-perfect)/0.6)]"
                                  : vel > 0.8 ? "bg-primary/80" : vel > 0.5 ? "bg-primary/55" : "bg-primary/30"
                                : currentStep === si && drumsPlaying
                                  ? "bg-secondary ring-1 ring-primary/40"
                                  : si % 4 === 0 ? "bg-secondary/60" : "bg-secondary/30"
                            )}
                            style={{ height: vel > 0 ? `${Math.max(12, vel * 24)}px` : '12px' }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-6">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-muted-foreground" />
                  <Slider value={[drumsVolume * 100]} onValueChange={([v]) => setDrumsVolume(v / 100)} min={0} max={100} className="w-20" />
                </div>
                <motion.button onClick={drumsPlaying ? stopDrums : startDrums}
                  className={cn("w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300",
                    drumsPlaying ? "bg-tuner-perfect text-primary-foreground shadow-[0_0_30px_hsl(var(--tuner-perfect)/0.5)]" : "bg-primary text-primary-foreground hover:shadow-[0_0_15px_hsl(var(--primary)/0.3)]"
                  )}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                >
                  {drumsPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5" />}
                </motion.button>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">Swing</span>
                  <Slider value={[swing * 100]} onValueChange={([v]) => setSwing(v / 100)} min={0} max={100} className="w-16" />
                </div>
              </div>

              {/* Pattern Selector */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
                {Object.entries(DRUM_PATTERNS).map(([key, pat]) => (
                  <button key={key} onClick={() => { setCurrentPattern(key); if (drumsPlaying) { stopDrums(); setTimeout(startDrums, 100); } }}
                    className={cn("p-2 rounded-lg text-xs font-medium transition-all",
                      currentPattern === key ? "bg-primary/20 text-primary border border-primary/30" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                    )}>{pat.name}</button>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}
