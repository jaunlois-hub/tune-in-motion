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

const DEFAULT_VALUE = '__default__';

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

  return (
    <div className="w-full max-w-md mx-auto bg-card/40 border border-border rounded-2xl p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-display">
          Audio Devices
        </span>
        <button
          onClick={refresh}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
          title="Refresh devices"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {!hasLabels && (
        <button
          onClick={requestPermission}
          disabled={requesting}
          className="w-full text-xs text-primary hover:underline disabled:opacity-50"
        >
          {requesting ? 'Requesting…' : 'Tap to enable device names (mic permission)'}
        </button>
      )}
      {permError && (
        <div className="text-[10px] text-destructive">{permError}</div>
      )}

      {/* Input */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Mic className="w-3 h-3" /> Input
          </label>
          <button
            onClick={() => setShowMeter((v) => !v)}
            className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
              showMeter
                ? 'bg-primary/20 border-primary text-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
            title="Live signal level for selected input"
          >
            <Activity className="w-3 h-3" />
            {showMeter ? 'Stop test' : 'Test'}
          </button>
        </div>
        <Select
          value={inputDeviceId ?? DEFAULT_VALUE}
          onValueChange={(v) =>
            setInputDeviceId(v === DEFAULT_VALUE ? undefined : v)
          }
        >
          <SelectTrigger className="bg-secondary/50 border-border">
            <SelectValue placeholder="System default" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border max-h-72">
            <SelectItem value={DEFAULT_VALUE}>System default</SelectItem>
            {inputs.map((d) => (
              <SelectItem key={d.deviceId} value={d.deviceId}>
                {labelFor(d, 'Microphone')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showMeter && <InputLevelMeter />}
      </div>

      {/* Output */}
      <div className="space-y-1">
        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Speaker className="w-3 h-3" /> Output
          {!audioDeviceSupport.setSinkId && (
            <span className="text-[9px] text-amber-500/80 ml-1">
              (unsupported in this browser — uses system default)
            </span>
          )}
        </label>
        <Select
          value={outputDeviceId ?? DEFAULT_VALUE}
          onValueChange={(v) =>
            setOutputDeviceId(v === DEFAULT_VALUE ? undefined : v)
          }
          disabled={!audioDeviceSupport.setSinkId}
        >
          <SelectTrigger className="bg-secondary/50 border-border">
            <SelectValue placeholder="System default" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border max-h-72">
            <SelectItem value={DEFAULT_VALUE}>System default</SelectItem>
            {outputs.map((d) => (
              <SelectItem key={d.deviceId} value={d.deviceId}>
                {labelFor(d, 'Speaker')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
