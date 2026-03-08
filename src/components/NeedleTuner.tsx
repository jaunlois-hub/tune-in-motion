import { useEffect, useRef } from 'react';

interface NeedleTunerProps {
  cents: number;
  isActive: boolean;
  clarity: number;
}

export function NeedleTuner({ cents, isActive, clarity }: NeedleTunerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const smoothedCentsRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const centerX = w / 2;
    const pivotY = h * 0.92;
    const needleLen = h * 0.75;

    const draw = () => {
      // Smooth needle movement
      const target = isActive ? Math.max(-50, Math.min(50, cents)) : 0;
      smoothedCentsRef.current += (target - smoothedCentsRef.current) * 0.12;
      const sc = smoothedCentsRef.current;

      ctx.clearRect(0, 0, w, h);

      // Get computed styles for theming
      const styles = getComputedStyle(canvas);
      const isDark = styles.getPropertyValue('color-scheme').includes('dark') ||
        document.documentElement.classList.contains('dark') ||
        !document.documentElement.classList.contains('light');

      const bgBase = isDark ? 'hsla(220, 20%, 8%, 0.9)' : 'hsla(220, 10%, 96%, 0.9)';
      const tickColor = isDark ? 'hsla(180, 20%, 60%, 0.5)' : 'hsla(220, 15%, 40%, 0.5)';
      const tickLabelColor = isDark ? 'hsla(180, 20%, 60%, 0.7)' : 'hsla(220, 15%, 30%, 0.7)';
      const arcBg = isDark ? 'hsla(220, 15%, 15%, 0.6)' : 'hsla(220, 10%, 88%, 0.6)';

      // Background arc
      ctx.beginPath();
      ctx.arc(centerX, pivotY, needleLen + 10, Math.PI * 1.15, Math.PI * 1.85);
      ctx.lineTo(centerX, pivotY);
      ctx.closePath();
      ctx.fillStyle = bgBase;
      ctx.fill();

      // Colored zones on the arc
      const arcRadius = needleLen + 5;
      // Flat zone (left) - red
      ctx.beginPath();
      ctx.arc(centerX, pivotY, arcRadius, Math.PI * 1.15, Math.PI * 1.42);
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'hsla(0, 100%, 60%, 0.3)';
      ctx.stroke();
      // Near zone left
      ctx.beginPath();
      ctx.arc(centerX, pivotY, arcRadius, Math.PI * 1.42, Math.PI * 1.48);
      ctx.strokeStyle = 'hsla(40, 100%, 55%, 0.3)';
      ctx.stroke();
      // Perfect zone (center) - green
      ctx.beginPath();
      ctx.arc(centerX, pivotY, arcRadius, Math.PI * 1.48, Math.PI * 1.52);
      ctx.strokeStyle = 'hsla(120, 100%, 50%, 0.5)';
      ctx.lineWidth = 8;
      ctx.stroke();
      // Near zone right
      ctx.beginPath();
      ctx.arc(centerX, pivotY, arcRadius, Math.PI * 1.52, Math.PI * 1.58);
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'hsla(40, 100%, 55%, 0.3)';
      ctx.stroke();
      // Sharp zone (right) - blue
      ctx.beginPath();
      ctx.arc(centerX, pivotY, arcRadius, Math.PI * 1.58, Math.PI * 1.85);
      ctx.strokeStyle = 'hsla(220, 100%, 65%, 0.3)';
      ctx.stroke();

      // Draw tick marks
      const tickLabels = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50];
      for (const val of tickLabels) {
        const angle = Math.PI * 1.5 + (val / 50) * Math.PI * 0.35;
        const isMajor = val % 10 === 0;
        const innerR = needleLen - (isMajor ? 25 : 15);
        const outerR = needleLen - 5;

        const x1 = centerX + Math.cos(angle) * innerR;
        const y1 = pivotY + Math.sin(angle) * innerR;
        const x2 = centerX + Math.cos(angle) * outerR;
        const y2 = pivotY + Math.sin(angle) * outerR;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = val === 0 ? 'hsla(120, 100%, 50%, 0.8)' : tickColor;
        ctx.lineWidth = val === 0 ? 3 : isMajor ? 2 : 1;
        ctx.stroke();

        // Labels for major ticks
        if (isMajor) {
          const labelR = needleLen - 38;
          const lx = centerX + Math.cos(angle) * labelR;
          const ly = pivotY + Math.sin(angle) * labelR;
          ctx.font = '11px "Orbitron", sans-serif';
          ctx.fillStyle = tickLabelColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(val === 0 ? '0' : `${val}`, lx, ly);
        }
      }

      // Draw minor ticks
      for (let val = -50; val <= 50; val += 5) {
        if (val % 10 === 0) continue;
        const angle = Math.PI * 1.5 + (val / 50) * Math.PI * 0.35;
        const innerR = needleLen - 12;
        const outerR = needleLen - 5;
        const x1 = centerX + Math.cos(angle) * innerR;
        const y1 = pivotY + Math.sin(angle) * innerR;
        const x2 = centerX + Math.cos(angle) * outerR;
        const y2 = pivotY + Math.sin(angle) * outerR;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = tickColor;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw needle
      const needleAngle = Math.PI * 1.5 + (sc / 50) * Math.PI * 0.35;
      const isPerfect = Math.abs(sc) < 2 && isActive;
      
      const nx = centerX + Math.cos(needleAngle) * needleLen;
      const ny = pivotY + Math.sin(needleAngle) * needleLen;

      // Needle shadow
      ctx.beginPath();
      ctx.moveTo(centerX + 1, pivotY + 1);
      ctx.lineTo(nx + 1, ny + 1);
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Needle body
      ctx.beginPath();
      ctx.moveTo(centerX, pivotY);
      ctx.lineTo(nx, ny);
      if (isActive) {
        if (isPerfect) {
          ctx.strokeStyle = 'hsla(120, 100%, 50%, 0.95)';
        } else if (sc < 0) {
          ctx.strokeStyle = 'hsla(0, 100%, 60%, 0.9)';
        } else {
          ctx.strokeStyle = 'hsla(220, 100%, 65%, 0.9)';
        }
      } else {
        ctx.strokeStyle = isDark ? 'hsla(170, 100%, 50%, 0.4)' : 'hsla(220, 30%, 50%, 0.4)';
      }
      ctx.lineWidth = 3;
      ctx.stroke();

      // Needle tip glow
      if (isActive) {
        ctx.beginPath();
        ctx.arc(nx, ny, 5, 0, Math.PI * 2);
        ctx.fillStyle = isPerfect 
          ? 'hsla(120, 100%, 50%, 0.8)' 
          : sc < 0 ? 'hsla(0, 100%, 60%, 0.6)' : 'hsla(220, 100%, 65%, 0.6)';
        ctx.fill();
      }

      // Pivot dot
      ctx.beginPath();
      ctx.arc(centerX, pivotY, 8, 0, Math.PI * 2);
      const pivotGrad = ctx.createRadialGradient(centerX, pivotY, 0, centerX, pivotY, 8);
      pivotGrad.addColorStop(0, isDark ? 'hsla(220, 20%, 30%, 1)' : 'hsla(220, 10%, 60%, 1)');
      pivotGrad.addColorStop(1, isDark ? 'hsla(220, 20%, 15%, 1)' : 'hsla(220, 10%, 80%, 1)');
      ctx.fillStyle = pivotGrad;
      ctx.fill();
      ctx.strokeStyle = isActive ? 'hsla(170, 100%, 50%, 0.5)' : (isDark ? 'hsla(170, 100%, 50%, 0.2)' : 'hsla(220, 30%, 50%, 0.3)');
      ctx.lineWidth = 2;
      ctx.stroke();

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => { cancelAnimationFrame(animationRef.current); };
  }, [cents, isActive, clarity]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={200}
      className="w-full max-w-[320px] mx-auto"
    />
  );
}
