import { useEffect, useRef } from 'react';

interface StrobeWheelProps {
  cents: number;
  isActive: boolean;
  clarity: number;
}

export function StrobeWheel({ cents, isActive, clarity }: StrobeWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const rotationRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const numSegments = 24;
    const innerRadius = size * 0.25;
    const outerRadius = size * 0.45;

    const draw = () => {
      ctx.clearRect(0, 0, size, size);

      // Draw outer ring glow
      const glowGradient = ctx.createRadialGradient(center, center, outerRadius - 10, center, center, outerRadius + 20);
      glowGradient.addColorStop(0, `hsla(170, 100%, 50%, ${isActive ? clarity * 0.3 : 0.1})`);
      glowGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGradient;
      ctx.fillRect(0, 0, size, size);

      // Draw background ring
      ctx.beginPath();
      ctx.arc(center, center, outerRadius, 0, Math.PI * 2);
      ctx.arc(center, center, innerRadius, 0, Math.PI * 2, true);
      ctx.fillStyle = 'hsla(220, 20%, 12%, 0.8)';
      ctx.fill();

      // Draw strobe segments
      const rotationSpeed = isActive ? cents * 0.002 : 0;
      rotationRef.current += rotationSpeed;

      for (let i = 0; i < numSegments; i++) {
        const startAngle = (i / numSegments) * Math.PI * 2 + rotationRef.current;
        const endAngle = ((i + 0.5) / numSegments) * Math.PI * 2 + rotationRef.current;

        ctx.beginPath();
        ctx.arc(center, center, outerRadius - 2, startAngle, endAngle);
        ctx.arc(center, center, innerRadius + 2, endAngle, startAngle, true);
        ctx.closePath();

        if (isActive) {
          const isPerfect = Math.abs(cents) < 2;
          if (isPerfect) {
            ctx.fillStyle = `hsla(120, 100%, 50%, ${0.7 + clarity * 0.3})`;
          } else if (cents < 0) {
            ctx.fillStyle = `hsla(0, 100%, 60%, ${0.6 + clarity * 0.4})`;
          } else {
            ctx.fillStyle = `hsla(220, 100%, 65%, ${0.6 + clarity * 0.4})`;
          }
        } else {
          ctx.fillStyle = 'hsla(170, 100%, 50%, 0.2)';
        }
        ctx.fill();
      }

      // Draw center circle
      const centerGradient = ctx.createRadialGradient(center, center, 0, center, center, innerRadius - 10);
      centerGradient.addColorStop(0, 'hsla(220, 20%, 15%, 1)');
      centerGradient.addColorStop(1, 'hsla(220, 20%, 10%, 1)');
      ctx.beginPath();
      ctx.arc(center, center, innerRadius - 10, 0, Math.PI * 2);
      ctx.fillStyle = centerGradient;
      ctx.fill();

      // Draw inner ring
      ctx.beginPath();
      ctx.arc(center, center, innerRadius - 10, 0, Math.PI * 2);
      ctx.strokeStyle = isActive 
        ? `hsla(170, 100%, 50%, ${0.3 + clarity * 0.3})` 
        : 'hsla(170, 100%, 50%, 0.2)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw outer ring
      ctx.beginPath();
      ctx.arc(center, center, outerRadius, 0, Math.PI * 2);
      ctx.strokeStyle = isActive 
        ? `hsla(170, 100%, 50%, ${0.4 + clarity * 0.4})` 
        : 'hsla(170, 100%, 50%, 0.2)';
      ctx.lineWidth = 3;
      ctx.stroke();

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [cents, isActive, clarity]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={320}
        height={320}
        className="w-full max-w-[320px] mx-auto"
      />
      {/* Center indicator line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-full pointer-events-none">
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-0.5 h-[15%] bg-gradient-to-b from-primary/80 to-transparent" />
        <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 w-0.5 h-[15%] bg-gradient-to-t from-primary/80 to-transparent" />
      </div>
    </div>
  );
}
