import { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface AudioVisualizerProps {
  analyserNode: AnalyserNode | null;
  isActive: boolean;
  mode?: 'waveform' | 'spectrum' | 'bars';
  className?: string;
}

export function AudioVisualizer({ analyserNode, isActive, mode = 'bars', className }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [visualMode, setVisualMode] = useState(mode);

  useEffect(() => {
    if (!canvasRef.current || !analyserNode || !isActive) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const waveformArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      const w = canvas.width, h = canvas.height;
      const isDark = document.documentElement.classList.contains('dark');
      ctx.fillStyle = isDark ? 'hsl(220, 20%, 8%)' : 'hsl(220, 10%, 96%)';
      ctx.fillRect(0, 0, w, h);

      if (visualMode === 'waveform') {
        analyserNode.getByteTimeDomainData(waveformArray);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'hsl(280, 100%, 70%)';
        ctx.beginPath();
        const slice = w / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const y = (waveformArray[i] / 128.0) * h / 2;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          x += slice;
        }
        ctx.stroke();
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'hsl(280, 100%, 70%)';
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (visualMode === 'spectrum') {
        analyserNode.getByteFrequencyData(dataArray);
        const grad = ctx.createLinearGradient(0, h, 0, 0);
        grad.addColorStop(0, 'hsl(145, 85%, 50%)');
        grad.addColorStop(0.5, 'hsl(280, 100%, 70%)');
        grad.addColorStop(1, 'hsl(350, 90%, 60%)');
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let i = 0; i < bufferLength; i++) ctx.lineTo((i / bufferLength) * w, h - (dataArray[i] / 255) * h);
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = grad;
        ctx.beginPath();
        for (let i = 0; i < bufferLength; i++) {
          const x = (i / bufferLength) * w, y = h - (dataArray[i] / 255) * h;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else {
        analyserNode.getByteFrequencyData(dataArray);
        const barCount = 32;
        const barWidth = w / barCount - 2;
        const step = Math.floor(bufferLength / barCount);
        for (let i = 0; i < barCount; i++) {
          const val = dataArray[i * step];
          const barH = (val / 255) * h * 0.9;
          const x = i * (barWidth + 2), y = h - barH;
          const hue = 145 + (i / barCount) * 135;
          const g = ctx.createLinearGradient(x, h, x, y);
          g.addColorStop(0, `hsla(${hue}, 85%, 50%, 0.8)`);
          g.addColorStop(1, `hsla(${hue}, 85%, 70%, 1)`);
          ctx.fillStyle = g;
          const r = Math.min(barWidth / 2, 4);
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barH, [r, r, 0, 0]);
          ctx.fill();
          ctx.shadowBlur = 8;
          ctx.shadowColor = `hsla(${hue}, 85%, 60%, 0.5)`;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    };
    draw();
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [analyserNode, isActive, visualMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      const r = canvas.getBoundingClientRect();
      canvas.width = r.width * window.devicePixelRatio;
      canvas.height = r.height * window.devicePixelRatio;
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  return (
    <div className={cn("relative", className)}>
      <canvas ref={canvasRef} className="w-full h-32 rounded-lg bg-card/50" />
      <div className="absolute top-2 right-2 flex gap-1">
        {(['bars', 'waveform', 'spectrum'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setVisualMode(m)}
            className={cn(
              "px-2 py-1 text-xs rounded capitalize transition-colors",
              visualMode === m ? "bg-primary/30 text-primary" : "bg-secondary/50 text-muted-foreground hover:text-foreground"
            )}
          >
            {m}
          </button>
        ))}
      </div>
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/80 rounded-lg">
          <p className="text-sm text-muted-foreground">Start tuning to see visualizer</p>
        </div>
      )}
    </div>
  );
}
