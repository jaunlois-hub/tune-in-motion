import { motion } from 'framer-motion';
import { CHORD_DIAGRAMS } from '@/hooks/useChordDetection';

interface ChordDiagramProps {
  chord: string;
  size?: 'sm' | 'md' | 'lg';
}

const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'e'];

export function ChordDiagram({ chord, size = 'md' }: ChordDiagramProps) {
  const diagram = CHORD_DIAGRAMS[chord];

  const dims = size === 'sm' ? { w: 90, h: 110, fretH: 20, strGap: 14 } :
               size === 'lg' ? { w: 160, h: 200, fretH: 36, strGap: 24 } :
                               { w: 120, h: 150, fretH: 26, strGap: 18 };

  const numFrets = 5;
  const startFret = diagram?.startFret || 1;
  const leftPad = 20;
  const topPad = size === 'sm' ? 16 : 24;

  if (!diagram) {
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="text-lg font-bold text-primary">{chord}</span>
        <div
          className="rounded-lg border border-border bg-secondary/30 flex items-center justify-center"
          style={{ width: dims.w, height: dims.h }}
        >
          <span className="text-xs text-muted-foreground">No diagram</span>
        </div>
      </div>
    );
  }

  const { frets, barFret } = diagram;

  return (
    <motion.div
      className="flex flex-col items-center gap-1"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      key={chord}
    >
      <span className="text-lg font-display font-bold text-primary">{chord}</span>
      <svg width={dims.w} height={dims.h} viewBox={`0 0 ${dims.w} ${dims.h}`}>
        {/* Nut or fret indicator */}
        {startFret === 1 ? (
          <rect x={leftPad - 1} y={topPad - 3} width={dims.strGap * 5 + 2} height={4} rx={1} fill="hsl(var(--foreground))" />
        ) : (
          <text x={leftPad - 14} y={topPad + dims.fretH / 2 + 4} fontSize={10} fill="hsl(var(--muted-foreground))" textAnchor="middle">
            {startFret}
          </text>
        )}

        {/* Frets */}
        {Array.from({ length: numFrets + 1 }).map((_, i) => (
          <line
            key={`fret-${i}`}
            x1={leftPad}
            y1={topPad + i * dims.fretH}
            x2={leftPad + dims.strGap * 5}
            y2={topPad + i * dims.fretH}
            stroke="hsl(var(--border))"
            strokeWidth={1}
          />
        ))}

        {/* Strings */}
        {Array.from({ length: 6 }).map((_, i) => (
          <line
            key={`str-${i}`}
            x1={leftPad + i * dims.strGap}
            y1={topPad}
            x2={leftPad + i * dims.strGap}
            y2={topPad + numFrets * dims.fretH}
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={i < 3 ? 2 : 1}
            opacity={0.5}
          />
        ))}

        {/* Bar */}
        {barFret && (
          <rect
            x={leftPad - 4}
            y={topPad + (barFret - startFret) * dims.fretH + dims.fretH * 0.25}
            width={dims.strGap * 5 + 8}
            height={dims.fretH * 0.5}
            rx={dims.fretH * 0.25}
            fill="hsl(var(--primary))"
            opacity={0.6}
          />
        )}

        {/* Finger dots + muted/open markers */}
        {frets.map((fret, strIdx) => {
          const x = leftPad + strIdx * dims.strGap;

          if (fret === -1) {
            // Muted
            return (
              <text key={`m-${strIdx}`} x={x} y={topPad - 6} fontSize={10} textAnchor="middle" fill="hsl(var(--muted-foreground))">
                ×
              </text>
            );
          }
          if (fret === 0) {
            // Open
            return (
              <circle key={`o-${strIdx}`} cx={x} cy={topPad - 8} r={4} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} />
            );
          }

          // Fretted note
          const displayFret = fret - startFret + 1;
          const y = topPad + (displayFret - 0.5) * dims.fretH;
          return (
            <motion.circle
              key={`f-${strIdx}`}
              cx={x}
              cy={y}
              r={size === 'sm' ? 5 : size === 'lg' ? 9 : 7}
              fill="hsl(var(--primary))"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: strIdx * 0.03 }}
            />
          );
        })}

        {/* String labels */}
        {STRING_NAMES.map((name, i) => (
          <text
            key={`lbl-${i}`}
            x={leftPad + i * dims.strGap}
            y={topPad + numFrets * dims.fretH + 14}
            fontSize={8}
            textAnchor="middle"
            fill="hsl(var(--muted-foreground))"
          >
            {name}
          </text>
        ))}
      </svg>
    </motion.div>
  );
}
