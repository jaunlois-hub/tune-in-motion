import { useState } from 'react';
import { Mic, Speaker, RefreshCw, Activity } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useAudioDevices,
  audioDeviceSupport,
} from '@/hooks/useAudioDevices';
import { InputLevelMeter } from './InputLevelMeter';
import { cn } from '@/lib/utils';

const DEFAULT_VALUE = '__default__';

/** Recessed patch-panel jack label, fixed width so IN / OUT rows align. */
function Jack({ icon: Icon, label }: { icon: typeof Mic; label: string }) {
  return (
    <span className="flex w-12 shrink-0 items-center justify-center gap-1 self-stretch rounded-md border border-border/70 bg-background/60 px-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground [box-shadow:inset_0_1px_2px_hsl(240_15%_3%/0.5)]">
      <Icon className="w-3 h-3 text-primary/60" />
      {label}
    </span>
  );
}

export function AudioDeviceSelector() {
  const {
    inputs,
    outputs,
    inputDeviceId,
    outputDeviceId,
    hasLabels,
    setInputDeviceId,
    setOutputDeviceId,
    refresh,
  } = useAudioDevices();

  const [requesting, setRequesting] = useState(false);
  const [permError, setPermError] = useState<string | null>(null);
  const [showMeter, setShowMeter] = useState(false);

  const requestPermission = async () => {
    setRequesting(true);
    setPermError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      await refresh();
    } catch {
      setPermError('Microphone permission needed to list devices.');
    } finally {
      setRequesting(false);
    }
  };

  const labelFor = (d: MediaDeviceInfo, fallback: string) =>
    d.label || `${fallback} (${d.deviceId.slice(0, 6) || 'default'})`;

  const triggerCls =
    'h-9 flex-1 min-w-0 bg-secondary/50 border-border/70 text-xs font-display hover:bg-secondary/70 focus:ring-primary/40 transition-colors';

  return (
    <div className="w-full max-w-md mx-auto rounded-xl border border-border bg-card/40 overflow-hidden">
      {/* Rack header */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-border/60 bg-secondary/20">
        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-display">
          <Activity className="w-3 h-3 text-primary/70" /> Audio I/O
        </span>
        <button
          onClick={refresh}
          className="text-muted-foreground hover:text-primary transition-colors p-1 -mr-1 rounded"
          title="Refresh devices"
          aria-label="Refresh device list"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      <div className="p-2.5 space-y-2">
        {!hasLabels && (
          <button
            onClick={requestPermission}
            disabled={requesting}
            className="w-full text-[11px] text-primary hover:underline disabled:opacity-50 text-left"
          >
            {requesting ? 'Requesting…' : 'Tap to enable device names (mic permission)'}
          </button>
        )}
        {permError && <div className="text-[10px] text-destructive">{permError}</div>}

        {/* IN row */}
        <div className="flex items-stretch gap-2">
          <Jack icon={Mic} label="In" />
          <Select
            value={inputDeviceId ?? DEFAULT_VALUE}
            onValueChange={(v) => setInputDeviceId(v === DEFAULT_VALUE ? undefined : v)}
          >
            <SelectTrigger className={triggerCls}>
              <SelectValue placeholder="System default" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border max-h-72">
              <SelectItem value={DEFAULT_VALUE}>System default</SelectItem>
              {inputs.filter((d) => d.deviceId).map((d) => (
                <SelectItem key={d.deviceId} value={d.deviceId}>
                  {labelFor(d, 'Microphone')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            onClick={() => setShowMeter((v) => !v)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-[10px] font-display uppercase tracking-wider transition-all',
              showMeter
                ? 'border-primary/50 bg-primary/15 text-primary shadow-glow-2'
                : 'border-border/70 text-muted-foreground hover:text-foreground hover:border-primary/30',
            )}
            title="Live signal level for selected input"
            aria-pressed={showMeter}
          >
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-colors',
                showMeter ? 'bg-primary animate-pulse-glow' : 'bg-muted-foreground/50',
              )}
            />
            {showMeter ? 'Stop' : 'Test'}
          </button>
        </div>
        {showMeter && (
          <div className="pl-[3.5rem] pr-1">
            <InputLevelMeter />
          </div>
        )}

        {/* OUT row */}
        <div className="flex items-stretch gap-2">
          <Jack icon={Speaker} label="Out" />
          <Select
            value={outputDeviceId ?? DEFAULT_VALUE}
            onValueChange={(v) => setOutputDeviceId(v === DEFAULT_VALUE ? undefined : v)}
            disabled={!audioDeviceSupport.setSinkId}
          >
            <SelectTrigger className={triggerCls}>
              <SelectValue placeholder="System default" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border max-h-72">
              <SelectItem value={DEFAULT_VALUE}>System default</SelectItem>
              {outputs.filter((d) => d.deviceId).map((d) => (
                <SelectItem key={d.deviceId} value={d.deviceId}>
                  {labelFor(d, 'Speaker')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {!audioDeviceSupport.setSinkId && (
          <p className="pl-[3.5rem] text-[9px] leading-tight text-status-warn/80">
            Output routing unsupported in this browser — uses system default.
          </p>
        )}
      </div>
    </div>
  );
}
