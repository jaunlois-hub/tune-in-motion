import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface StrobeWheelProps {
  cents: number;
  isActive: boolean;
  clarity: number;
}

export function StrobeWheel({ cents, isActive, clarity }: StrobeWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const rotationRef = useRef(0);
  const smoothedCentsRef = useRef(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displaySize = 300;
    canvas.width = displaySize * dpr;
    canvas.height = displaySize * dpr;
    canvas.style.width = `${displaySize}px`;
    canvas.style.height = `${displaySize}px`;
    ctx.scale(dpr, dpr);

    const size = displaySize;
    const center = size / 2;

    const draw = () => {
      // Smooth cents for rotation
      const target = isActive ? cents : 0;
      smoothedCentsRef.current += (target - smoothedCentsRef.current) * 0.15;

      ctx.clearRect(0, 0, size, size);

      const isDark = document.documentElement.classList.contains('dark');

      // === Outer glow ring ===
      const isPerfect = isActive && Math.abs(smoothedCentsRef.current) < 2;
      const glowColor = isPerfect
        ? 'hsla(120, 100%, 50%,'
        : smoothedCentsRef.current < 0
        ? 'hsla(0, 100%, 60%,'
        : 'hsla(200, 100%, 60%,';

      if (isActive) {
        const glowGrad = ctx.createRadialGradient(center, center, size * 0.38, center, center, size * 0.5);
        glowGrad.addColorStop(0, `${glowColor}${clarity * 0.4})`);
        glowGrad.addColorStop(1, `${glowColor}0)`);
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, 0, size, size);
      }

      // === Main ring background ===
      const ringOuter = size * 0.44;
      const ringInner = size * 0.28;
      ctx.beginPath();
      ctx.arc(center, center, ringOuter, 0, Math.PI * 2);
      ctx.arc(center, center, ringInner, 0, Math.PI * 2, true);
      ctx.fillStyle = isDark ? 'hsla(220, 25%, 8%, 0.95)' : 'hsla(220, 15%, 92%, 0.95)';
      ctx.fill();

      // === Strobe segments — 3 concentric rings for depth ===
      // Reduced-motion: freeze the spin (the rotating strobe is the photosensitivity hazard);
      // colour/clarity feedback below still updates so the tuner stays usable.
      const rotationSpeed = isActive && !reduceMotion ? smoothedCentsRef.current * 0.003 : 0;
      rotationRef.current += rotationSpeed;

      const rings = [
        { inner: ringInner + 2, outer: ringInner + (ringOuter - ringInner) * 0.33, segments: 20, offset: 0 },
        { inner: ringInner + (ringOuter - ringInner) * 0.36, outer: ringInner + (ringOuter - ringInner) * 0.66, segments: 28, offset: Math.PI / 28 },
        { inner: ringInner + (ringOuter - ringInner) * 0.69, outer: ringOuter - 2, segments: 36, offset: Math.PI / 18 },
      ];

      for (const ring of rings) {
        for (let i = 0; i < ring.segments; i++) {
          const startAngle = (i / ring.segments) * Math.PI * 2 + rotationRef.current + ring.offset;
          const endAngle = ((i + 0.45) / ring.segments) * Math.PI * 2 + rotationRef.current + ring.offset;

          ctx.beginPath();
          ctx.arc(center, center, ring.outer, startAngle, endAngle);
          ctx.arc(center, center, ring.inner, endAngle, startAngle, true);
          ctx.closePath();

          if (isActive) {
            const alpha = 0.5 + clarity * 0.5;
            if (isPerfect) {
              ctx.fillStyle = `hsla(120, 100%, 55%, ${alpha})`;
            } else if (smoothedCentsRef.current < 0) {
              ctx.fillStyle = `hsla(0, 90%, 58%, ${alpha * 0.85})`;
            } else {
              ctx.fillStyle = `hsla(210, 100%, 62%, ${alpha * 0.85})`;
            }
          } else {
            ctx.fillStyle = isDark ? 'hsla(170, 80%, 50%, 0.12)' : 'hsla(170, 60%, 40%, 0.1)';
          }
          ctx.fill();
        }
      }

      // === Outer ring border ===
      ctx.beginPath();
      ctx.arc(center, center, ringOuter, 0, Math.PI * 2);
      ctx.strokeStyle = isActive
        ? `${glowColor}${0.5 + clarity * 0.3})`
        : isDark ? 'hsla(170, 60%, 40%, 0.2)' : 'hsla(220, 20%, 60%, 0.2)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // === Inner ring border ===
      ctx.beginPath();
      ctx.arc(center, center, ringInner, 0, Math.PI * 2);
      ctx.strokeStyle = isActive
        ? `${glowColor}${0.3 + clarity * 0.2})`
        : isDark ? 'hsla(170, 60%, 40%, 0.15)' : 'hsla(220, 20%, 60%, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // === Center circle — premium gradient ===
      const innerFill = size * 0.26;
      const cGrad = ctx.createRadialGradient(center - 10, center - 10, 0, center, center, innerFill);
      if (isDark) {
        cGrad.addColorStop(0, 'hsla(220, 25%, 16%, 1)');
        cGrad.addColorStop(1, 'hsla(220, 25%, 8%, 1)');
      } else {
        cGrad.addColorStop(0, 'hsla(220, 15%, 96%, 1)');
        cGrad.addColorStop(1, 'hsla(220, 10%, 88%, 1)');
      }
      ctx.beginPath();
      ctx.arc(center, center, innerFill, 0, Math.PI * 2);
      ctx.fillStyle = cGrad;
      ctx.fill();

      // Subtle inner shadow ring
      const shadowGrad = ctx.createRadialGradient(center, center, innerFill - 8, center, center, innerFill);
      shadowGrad.addColorStop(0, 'transparent');
      shadowGrad.addColorStop(1, isDark ? 'hsla(0, 0%, 0%, 0.3)' : 'hsla(0, 0%, 0%, 0.08)');
      ctx.beginPath();
      ctx.arc(center, center, innerFill, 0, Math.PI * 2);
      ctx.fillStyle = shadowGrad;
      ctx.fill();

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [cents, isActive, clarity, reduceMotion]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="w-full max-w-[300px] mx-auto"
      />
      {/* Center indicator markers */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-full pointer-events-none">
        <div className="absolute top-[8%] left-1/2 -translate-x-[1px] w-[2px] h-[14%] bg-gradient-to-b from-primary via-primary/60 to-transparent rounded-full" />
        <div className="absolute bottom-[8%] left-1/2 -translate-x-[1px] w-[2px] h-[14%] bg-gradient-to-t from-primary via-primary/60 to-transparent rounded-full" />
      </div>
    </div>
  );
}
