import { useEffect, useRef, useState } from 'react';
import { Activity } from 'lucide-react';
import {
  buildAudioConstraints,
  useAudioDevicesStore,
} from '@/hooks/useAudioDevices';

/**
 * Lightweight VU bar driven by a private getUserMedia stream tied to the
 * currently selected input device. Mounted only while the user is testing —
 * the parent gates rendering with a toggle.
 */
export function InputLevelMeter() {
  const inputDeviceId = useAudioDevicesStore((s) => s.inputDeviceId);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    let analyser: AnalyserNode | null = null;
    let buf: Float32Array | null = null;

    const stop = () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      ctxRef.current?.close().catch((err) => console.warn('meter ctx close', err));
      ctxRef.current = null;
    };

    const start = async () => {
      try {
        setError(null);
        const stream = await navigator.mediaDevices.getUserMedia(buildAudioConstraints());
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const ctx = new AudioContext();
        ctxRef.current = ctx;
        // Without resume(), Chrome leaves the context suspended and the
        // analyser's getFloatTimeDomainData returns zeros — meter shows 0.
        if (ctx.state === 'suspended') {
          await ctx.resume().catch((err) => console.warn('meter ctx resume', err));
        }
        const src = ctx.createMediaStreamSource(stream);
        analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.4;
        src.connect(analyser);
        buf = new Float32Array(analyser.fftSize);

        const tick = () => {
          if (cancelled || !analyser || !buf) return;
          analyser.getFloatTimeDomainData(buf as Float32Array<ArrayBuffer>);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
          const rms = Math.sqrt(sum / buf.length);
          // Normalize: 0..0.5 RMS → 0..100% bar.
          setLevel(Math.min(1, rms / 0.5));
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch (err) {
        console.warn('Level meter failed', err);
        setError('Mic unavailable');
      }
    };

    start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [inputDeviceId]);

  if (error) return <div className="text-[10px] text-destructive">{error}</div>;

  const pct = Math.round(level * 100);
  const isHot = pct > 90;

  return (
    <div className="flex items-center gap-2">
      <Activity className="w-3 h-3 text-muted-foreground" />
      <div className="relative h-2 flex-1 bg-secondary/40 rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 transition-[width] duration-75 ease-out ${
            isHot ? 'bg-destructive' : pct > 60 ? 'bg-amber-500' : 'bg-tuner-perfect'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] tabular-nums text-muted-foreground w-8 text-right">
        {pct}%
      </span>
    </div>
  );
}
