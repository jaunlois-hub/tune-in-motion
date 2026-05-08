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

    const dpr = window.devicePixelRatio || 1;
    const displayW = 340;
    const displayH = 220;
    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;
    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${displayH}px`;
    ctx.scale(dpr, dpr);

    const w = displayW;
    const h = displayH;
    const centerX = w / 2;
    const pivotY = h * 0.95;
    const needleLen = h * 0.82;

    const draw = () => {
      const target = isActive ? Math.max(-50, Math.min(50, cents)) : 0;
      smoothedCentsRef.current += (target - smoothedCentsRef.current) * 0.1;
      const sc = smoothedCentsRef.current;

      ctx.clearRect(0, 0, w, h);

      const isDark = document.documentElement.classList.contains('dark');

      // Background arc with gradient fill
      const arcRadius = needleLen + 12;
      ctx.beginPath();
      ctx.arc(centerX, pivotY, arcRadius, Math.PI * 1.12, Math.PI * 1.88);
      ctx.lineTo(centerX, pivotY);
      ctx.closePath();
      const bgGrad = ctx.createRadialGradient(centerX, pivotY, needleLen * 0.3, centerX, pivotY, arcRadius);
      bgGrad.addColorStop(0, isDark ? 'hsla(220, 25%, 10%, 0.6)' : 'hsla(220, 15%, 95%, 0.6)');
      bgGrad.addColorStop(1, isDark ? 'hsla(220, 25%, 6%, 0.9)' : 'hsla(220, 10%, 90%, 0.9)');
      ctx.fillStyle = bgGrad;
      ctx.fill();

      // Colored arc zones
      const zoneRadius = needleLen + 6;
      const zones = [
        { start: 1.12, end: 1.40, color: 'hsla(0, 85%, 55%, 0.25)', width: 5 },
        { start: 1.40, end: 1.46, color: 'hsla(35, 100%, 55%, 0.3)', width: 5 },
        { start: 1.46, end: 1.54, color: 'hsla(120, 90%, 48%, 0.5)', width: 7 },
        { start: 1.54, end: 1.60, color: 'hsla(35, 100%, 55%, 0.3)', width: 5 },
        { start: 1.60, end: 1.88, color: 'hsla(210, 90%, 55%, 0.25)', width: 5 },
      ];
      for (const z of zones) {
        ctx.beginPath();
        ctx.arc(centerX, pivotY, zoneRadius, Math.PI * z.start, Math.PI * z.end);
        ctx.lineWidth = z.width;
        ctx.strokeStyle = z.color;
        ctx.stroke();
      }

      // Active zone highlight
      if (isActive) {
        const isPerfect = Math.abs(sc) < 2;
        if (isPerfect) {
          ctx.beginPath();
          ctx.arc(centerX, pivotY, zoneRadius, Math.PI * 1.46, Math.PI * 1.54);
          ctx.lineWidth = 8;
          ctx.strokeStyle = `hsla(120, 100%, 50%, ${0.5 + clarity * 0.4})`;
          ctx.stroke();
        }
      }

      // Tick marks with refined styling
      const tickColor = isDark ? 'hsla(180, 15%, 50%, 0.4)' : 'hsla(220, 10%, 50%, 0.4)';
      const tickLabelColor = isDark ? 'hsla(180, 15%, 55%, 0.7)' : 'hsla(220, 10%, 35%, 0.7)';

      for (let val = -50; val <= 50; val += 5) {
        const angle = Math.PI * 1.5 + (val / 50) * Math.PI * 0.38;
        const isMajor = val % 10 === 0;
        const isCenter = val === 0;
        const innerR = needleLen - (isCenter ? 30 : isMajor ? 22 : 12);
        const outerR = needleLen - 4;

        const x1 = centerX + Math.cos(angle) * innerR;
        const y1 = pivotY + Math.sin(angle) * innerR;
        const x2 = centerX + Math.cos(angle) * outerR;
        const y2 = pivotY + Math.sin(angle) * outerR;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = isCenter ? 'hsla(120, 80%, 50%, 0.7)' : tickColor;
        ctx.lineWidth = isCenter ? 2.5 : isMajor ? 1.5 : 0.8;
        ctx.stroke();

        if (isMajor) {
          const labelR = needleLen - (isCenter ? 42 : 34);
          const lx = centerX + Math.cos(angle) * labelR;
          const ly = pivotY + Math.sin(angle) * labelR;
          ctx.font = `${isCenter ? '600 12' : '500 10'}px "Orbitron", sans-serif`;
          ctx.fillStyle = isCenter ? 'hsla(120, 80%, 50%, 0.8)' : tickLabelColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(val === 0 ? '0' : `${val}`, lx, ly);
        }
      }

      // Needle
      const needleAngle = Math.PI * 1.5 + (sc / 50) * Math.PI * 0.38;
      const isPerfect = Math.abs(sc) < 2 && isActive;

      const nx = centerX + Math.cos(needleAngle) * needleLen;
      const ny = pivotY + Math.sin(needleAngle) * needleLen;

      // Needle shadow
      ctx.beginPath();
      ctx.moveTo(centerX + 1.5, pivotY + 1.5);
      ctx.lineTo(nx + 1.5, ny + 1.5);
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Needle body — tapered
      const baseWidth = 3;
      const tipWidth = 1;
      const perpAngle = needleAngle + Math.PI / 2;
      const bx1 = centerX + Math.cos(perpAngle) * baseWidth;
      const by1 = pivotY + Math.sin(perpAngle) * baseWidth;
      const bx2 = centerX - Math.cos(perpAngle) * baseWidth;
      const by2 = pivotY - Math.sin(perpAngle) * baseWidth;
      const tx1 = nx + Math.cos(perpAngle) * tipWidth;
      const ty1 = ny + Math.sin(perpAngle) * tipWidth;
      const tx2 = nx - Math.cos(perpAngle) * tipWidth;
      const ty2 = ny - Math.sin(perpAngle) * tipWidth;

      ctx.beginPath();
      ctx.moveTo(bx1, by1);
      ctx.lineTo(tx1, ty1);
      ctx.lineTo(tx2, ty2);
      ctx.lineTo(bx2, by2);
      ctx.closePath();

      let needleColor: string;
      if (!isActive) {
        needleColor = isDark ? 'hsla(170, 60%, 45%, 0.35)' : 'hsla(220, 20%, 55%, 0.35)';
      } else if (isPerfect) {
        needleColor = 'hsla(120, 100%, 50%, 0.9)';
      } else if (sc < 0) {
        needleColor = 'hsla(0, 90%, 58%, 0.85)';
      } else {
        needleColor = 'hsla(210, 100%, 62%, 0.85)';
      }
      ctx.fillStyle = needleColor;
      ctx.fill();

      // Needle tip glow
      if (isActive) {
        ctx.beginPath();
        ctx.arc(nx, ny, 4, 0, Math.PI * 2);
        const tipGrad = ctx.createRadialGradient(nx, ny, 0, nx, ny, 6);
        tipGrad.addColorStop(0, isPerfect ? 'hsla(120, 100%, 60%, 0.9)' : sc < 0 ? 'hsla(0, 100%, 65%, 0.7)' : 'hsla(210, 100%, 70%, 0.7)');
        tipGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = tipGrad;
        ctx.fill();
      }

      // Pivot
      ctx.beginPath();
      ctx.arc(centerX, pivotY, 7, 0, Math.PI * 2);
      const pivotGrad = ctx.createRadialGradient(centerX - 2, pivotY - 2, 0, centerX, pivotY, 7);
      pivotGrad.addColorStop(0, isDark ? 'hsla(220, 20%, 28%, 1)' : 'hsla(220, 10%, 65%, 1)');
      pivotGrad.addColorStop(1, isDark ? 'hsla(220, 20%, 12%, 1)' : 'hsla(220, 10%, 82%, 1)');
      ctx.fillStyle = pivotGrad;
      ctx.fill();
      ctx.strokeStyle = isActive ? `hsla(170, 100%, 50%, ${0.3 + clarity * 0.3})` : 'hsla(170, 50%, 40%, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => { cancelAnimationFrame(animationRef.current); };
  }, [cents, isActive, clarity]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full max-w-[340px] mx-auto"
    />
  );
}
