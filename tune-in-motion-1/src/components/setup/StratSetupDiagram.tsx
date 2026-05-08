import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, RotateCcw, Pencil } from 'lucide-react';
import { useSetupPrefs, MODELS, computeSaddleHeights, type SetupSpecs, type SpecKey } from '@/hooks/useSetupPrefs';
import { SetupBenchSheet } from '@/components/setup/SetupBenchSheet';

// ============================================================
// Annotations: hot-spots on the diagram. Geometry is fixed (Strat-
// silhouette); textual `spec` / `details` are computed from current
// model + overrides at render time.
// ============================================================
type AnnotationId =
  | 'tunerHeadstock'
  | 'trussRod'
  | 'nut'
  | 'nutAction'
  | 'fretboard'
  | 'relief'
  | 'action12'
  | 'pickupNeck'
  | 'pickupMiddle'
  | 'pickupBridge'
  | 'saddleHeights'
  | 'saddleIntonation'
  | 'tremolo'
  | 'scaleLength';

interface AnnotationMeta {
  id: AnnotationId;
  point: { x: number; y: number };
  label: { x: number; y: number };
  title: string;
  short: string;
  details: string[];
  group: 'neck' | 'body' | 'electronics';
}

const ANNOTATIONS: AnnotationMeta[] = [
  {
    id: 'tunerHeadstock',
    point: { x: 60, y: 108 }, label: { x: 38, y: 38 },
    title: 'Tuners / Headstock', short: 'Tuners', group: 'neck',
    details: [
      'Use these for fine pitch adjustments after bridge / spring work.',
      'Always re-tune after every truss rod or tremolo change — tension shifts everything.',
    ],
  },
  {
    id: 'trussRod',
    point: { x: 110, y: 175 }, label: { x: 70, y: 280 },
    title: 'Truss Rod', short: 'Truss rod', group: 'neck',
    details: [
      'Counter-bows the neck to correct relief.',
      'Tighten (clockwise) → less relief / flatter neck. Loosen (counter-clockwise) → more relief / more bow.',
      'Adjust in ¼-turn increments. Wait ~30 min between turns and re-tune to pitch before re-measuring.',
    ],
  },
  {
    id: 'nut',
    point: { x: 175, y: 152 }, label: { x: 145, y: 56 },
    title: 'Nut', short: 'Nut', group: 'neck',
    details: [
      'Defines string spacing at the headstock end of the scale.',
      'Slot depths control open-string action (see Action @ Nut).',
      'Lubricate slots with graphite to prevent tuning issues, especially with a tremolo.',
    ],
  },
  {
    id: 'nutAction',
    point: { x: 192, y: 142 }, label: { x: 220, y: 56 },
    title: 'Action @ Nut', short: 'Action @ nut', group: 'neck',
    details: [
      'Measure: capo NOT applied — fret each string at the 3rd fret. Gap above the 1st fret should be ≈ a sheet of paper.',
      'Too high → cowboy chords sound sharp & feel stiff at the 1st–3rd frets.',
      'Too low → open-string buzz against the 1st fret.',
      'Lower by deepening slots with nut files; raising requires a fresh nut blank.',
    ],
  },
  {
    id: 'fretboard',
    point: { x: 280, y: 158 }, label: { x: 270, y: 56 },
    title: 'Fretboard Radius', short: 'Radius', group: 'neck',
    details: [
      'The curvature of the playing surface across all six strings.',
      'Vintage 7.25″ — very curved, great for chords, frets out on big bends.',
      'Modern 9.5″ — balanced, most current Fender.',
      'Compound 9.5″→14″ — round at the nut, flatter at higher frets — best for low action with bends.',
      'See the cross-section inset below.',
    ],
  },
  {
    id: 'relief',
    point: { x: 340, y: 162 }, label: { x: 350, y: 56 },
    title: 'Neck Relief', short: 'Relief', group: 'neck',
    details: [
      'A controlled forward bow that lets the strings vibrate without buzzing.',
      'Measure: capo 1st fret, fret last fret on bass side, check gap at 7th–9th fret.',
      'Reference: business-card thickness ≈ 0.25 mm.',
      'Adjust at the truss rod — small turns, re-tune, re-measure.',
    ],
  },
  {
    id: 'action12',
    point: { x: 440, y: 162 }, label: { x: 440, y: 56 },
    title: 'Action @ 12th fret', short: 'Action @12', group: 'body',
    details: [
      'Standing height of the string above the 12th fret crown.',
      'Lower → easier playing, more buzz risk.',
      'Higher → cleaner tone, harder to play, may sound sharp due to over-fretting.',
      'Adjust at the bridge saddle screws (one per string on a Strat-style bridge).',
      'Always re-set intonation after action changes.',
    ],
  },
  {
    id: 'pickupNeck',
    point: { x: 478, y: 178 }, label: { x: 470, y: 268 },
    title: 'Neck Pickup Height', short: 'Neck PU', group: 'electronics',
    details: [
      'Distance from the bottom of the string (fretted at the LAST fret) to the top of the polepiece.',
      'Too close → magnetic pull causes warbling / wolf tones, especially on the low E.',
      'Too far → thin, weak output.',
      'On most Fenders the neck pickup is the warmest — usually set slightly LOWER than the bridge to balance perceived volume.',
    ],
  },
  {
    id: 'pickupMiddle',
    point: { x: 540, y: 178 }, label: { x: 540, y: 268 },
    title: 'Middle Pickup Height', short: 'Mid PU', group: 'electronics',
    details: [
      'Critical for the in-between (positions 2 & 4) "quack" tones — set roughly halfway between neck and bridge heights.',
      'Often the first pickup to be lowered if you’re fighting magnetic pull at high gain.',
    ],
  },
  {
    id: 'pickupBridge',
    point: { x: 600, y: 178 }, label: { x: 610, y: 268 },
    title: 'Bridge Pickup Height', short: 'Bridge PU', group: 'electronics',
    details: [
      'Bridge is naturally brighter and lower-output — usually raised slightly closer than neck/middle to compensate.',
      'Test in the loudest part of your usage (high gain, bridge position) for warble before committing.',
    ],
  },
  {
    id: 'saddleHeights',
    point: { x: 660, y: 165 }, label: { x: 740, y: 90 },
    title: 'Saddle Heights (per-string)', short: 'Saddles', group: 'body',
    details: [
      'Each saddle has its own height-adjust grub screw (Allen 1.5 mm or Phillips on vintage).',
      'The 6 saddles must follow the FRETBOARD radius — middle strings (D, G) sit highest, outer strings (low E, high e) sit lowest.',
      'A common error: setting all saddles to the same height. With a 9.5″ neck this puts the outer strings ~1.4 mm too high — chokes bends, frets out.',
      'Use the per-string table below: action @ 12th interpolates bass→treble, saddle drop follows the radius arc.',
      'Set treble + bass first, then arc the middle four to match.',
    ],
  },
  {
    id: 'saddleIntonation',
    point: { x: 660, y: 178 }, label: { x: 660, y: 268 },
    title: 'Saddle Intonation', short: 'Intonation', group: 'body',
    details: [
      'Fret each string at the 12th — must match the natural harmonic at the 12th in pitch.',
      'Sharp at fret → move saddle BACK (away from neck) by turning the long intonation screw at the back of the bridge.',
      'Flat at fret → move saddle FORWARD (toward neck).',
      'Wound strings need MORE compensation than plain — saddles step back as you go from high e → low E.',
      'Always set after final action and tuning, and re-check after every string change.',
    ],
  },
  {
    id: 'tremolo',
    point: { x: 695, y: 196 }, label: { x: 705, y: 132 },
    title: 'Bridge / Tremolo Setup', short: 'Bridge', group: 'body',
    details: [
      'Spring tension at the rear cavity must BALANCE the string tension at the bridge.',
      'Floating trem: bridge plate sits parallel to the body (rear gap ≈ 3.2 mm = a #2 pencil thickness on a Strat).',
      'Decked trem: tighten the claw screws so the plate rests flush on the body — bends pitch DOWN only, more tuning stability.',
      'Hardtail (Tele): no springs — only saddle height + intonation matter.',
      'Spring count: 5 = stiffest (best for heavy strings), 3 = softer feel (typical for 9 or 10 gauge).',
      'After ANY change, retune ALL strings, then recheck — tension shifts the bridge angle which retunes everything.',
    ],
  },
  {
    id: 'scaleLength',
    point: { x: 410, y: 222 }, label: { x: 410, y: 308 },
    title: 'Scale Length', short: 'Scale', group: 'body',
    details: [
      'The vibrating length of the string from the nut to the saddle.',
      '25.5″ Fender — brighter, tighter, higher tension at pitch.',
      '24″ short-scale (Jaguar / Mustang) — easier bends, lower tension, slightly more flubby low-end.',
      'Saddle intonation only fine-tunes — base scale length is locked by build.',
    ],
  },
];

// ============================================================
// Editable field map: which annotations expose which spec keys.
// ============================================================
interface FieldDef {
  key: SpecKey;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

const EDITABLE_FIELDS: Partial<Record<AnnotationId, FieldDef[]>> = {
  nutAction: [
    { key: 'nutActionTrebleMm', label: 'Treble', min: 0,    max: 2,   step: 0.05, unit: 'mm' },
    { key: 'nutActionBassMm',   label: 'Bass',   min: 0,    max: 2,   step: 0.05, unit: 'mm' },
  ],
  action12: [
    { key: 'action12TrebleMm',  label: 'Treble', min: 0.5,  max: 4,   step: 0.05, unit: 'mm' },
    { key: 'action12BassMm',    label: 'Bass',   min: 0.5,  max: 4,   step: 0.05, unit: 'mm' },
  ],
  relief: [
    { key: 'reliefMinMm',       label: 'Min',    min: 0,    max: 1,   step: 0.05, unit: 'mm' },
    { key: 'reliefMaxMm',       label: 'Max',    min: 0,    max: 1,   step: 0.05, unit: 'mm' },
  ],
  pickupNeck: [
    { key: 'pickupNeckTrebleMm', label: 'Treble', min: 0.5, max: 6, step: 0.1, unit: 'mm' },
    { key: 'pickupNeckBassMm',   label: 'Bass',   min: 0.5, max: 6, step: 0.1, unit: 'mm' },
  ],
  pickupMiddle: [
    { key: 'pickupMiddleTrebleMm', label: 'Treble', min: 0.5, max: 6, step: 0.1, unit: 'mm' },
    { key: 'pickupMiddleBassMm',   label: 'Bass',   min: 0.5, max: 6, step: 0.1, unit: 'mm' },
  ],
  pickupBridge: [
    { key: 'pickupBridgeTrebleMm', label: 'Treble', min: 0.5, max: 6, step: 0.1, unit: 'mm' },
    { key: 'pickupBridgeBassMm',   label: 'Bass',   min: 0.5, max: 6, step: 0.1, unit: 'mm' },
  ],
  fretboard: [
    { key: 'radiusInches', label: 'Radius', min: 7.25, max: 20, step: 0.25, unit: '″' },
  ],
  saddleHeights: [
    { key: 'bridgeStringSpacingMm', label: 'Bridge spacing', min: 48, max: 58, step: 0.1, unit: 'mm' },
    { key: 'saddleScrewHeightMm',  label: 'Saddle screw',   min: 0.5, max: 5, step: 0.1, unit: 'mm' },
  ],
  tremolo: [
    { key: 'bridgePlateGapMm', label: 'Plate gap',  min: 0, max: 6, step: 0.1, unit: 'mm' },
    { key: 'springCount',      label: 'Springs',    min: 0, max: 5, step: 1,   unit: '' },
  ],
};

// ============================================================
// Compute the spec line shown on each annotation
// ============================================================
function specStringFor(id: AnnotationId, specs: SetupSpecs, bridgeType: string): string {
  switch (id) {
    case 'nutAction':       return `Treble ${specs.nutActionTrebleMm.toFixed(2)} · Bass ${specs.nutActionBassMm.toFixed(2)} mm`;
    case 'action12':        return `Treble ${specs.action12TrebleMm.toFixed(2)} · Bass ${specs.action12BassMm.toFixed(2)} mm`;
    case 'relief':          return `${specs.reliefMinMm.toFixed(2)} – ${specs.reliefMaxMm.toFixed(2)} mm @ 7th–9th`;
    case 'pickupNeck':      return `Treble ${specs.pickupNeckTrebleMm.toFixed(1)} · Bass ${specs.pickupNeckBassMm.toFixed(1)} mm`;
    case 'pickupMiddle':    return specs.pickupConfig === 'SSS'
                              ? `Treble ${specs.pickupMiddleTrebleMm.toFixed(1)} · Bass ${specs.pickupMiddleBassMm.toFixed(1)} mm`
                              : 'n/a — model has no middle pickup';
    case 'pickupBridge':    return `Treble ${specs.pickupBridgeTrebleMm.toFixed(1)} · Bass ${specs.pickupBridgeBassMm.toFixed(1)} mm`;
    case 'scaleLength':     return `${specs.scaleLengthMm} mm (${(specs.scaleLengthMm / 25.4).toFixed(2)}″)`;
    case 'fretboard':       return `${specs.radiusInches}″ (${(specs.radiusInches * 25.4).toFixed(0)} mm)`;
    case 'nut':             return `Width 42.8 mm · Spacing 35 mm`;
    case 'tunerHeadstock':  return '6 in-line, 1:18 ratio';
    case 'trussRod':        return 'Heel adjust • 4 mm hex';
    case 'saddleHeights':   return `Spacing ${specs.bridgeStringSpacingMm.toFixed(1)} mm · 6-saddle radiused`;
    case 'tremolo':         {
      if (specs.bridgeMode === 'hardtail') return `${bridgeType} — no springs`;
      if (specs.bridgeMode === 'offset-trem' || specs.bridgeMode === 'dynamic-vibrato') return bridgeType;
      const float = specs.bridgePlateGapMm > 0.1 ? `floating ${specs.bridgePlateGapMm.toFixed(1)} mm` : 'decked';
      return `${specs.springCount} springs · ${float}`;
    }
    case 'saddleIntonation':return '12th-fret harmonic == fretted';
  }
}

// Filter annotations the current model can show
function annotationApplies(id: AnnotationId, specs: SetupSpecs): boolean {
  if (id === 'pickupMiddle' && specs.pickupConfig !== 'SSS') return false;
  return true;
}

const GROUP_COLOR: Record<AnnotationMeta['group'], string> = {
  neck:        'hsl(var(--primary))',
  body:        'hsl(25 95% 55%)',
  electronics: 'hsl(190 80% 55%)',
};

// ============================================================
// Side-view illustration of a Stratocaster (geometry stays fixed)
// ============================================================
function StratIllustration({
  activeId,
  onPick,
  hideMiddle,
}: {
  activeId: AnnotationId | null;
  onPick: (id: AnnotationId | null) => void;
  hideMiddle: boolean;
}) {
  return (
    <svg viewBox="0 0 800 360" className="w-full h-auto select-none" role="img" aria-label="Annotated guitar setup diagram">
      <defs>
        <pattern id="setupGrid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(var(--border))" strokeWidth="0.4" opacity="0.3" />
        </pattern>
        <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="hsl(25 70% 25%)" />
          <stop offset="1" stopColor="hsl(25 60% 15%)" />
        </linearGradient>
        <linearGradient id="neckGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="hsl(35 30% 70%)" />
          <stop offset="1" stopColor="hsl(35 25% 50%)" />
        </linearGradient>
        <linearGradient id="fretboardGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="hsl(20 40% 22%)" />
          <stop offset="1" stopColor="hsl(20 35% 12%)" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="800" height="360" fill="url(#setupGrid)" />

      {/* Headstock */}
      <path d="M 30 95 Q 26 110 50 130 L 130 142 L 168 152 L 168 166 L 130 156 L 50 144 Q 26 145 30 130 Z" fill="url(#neckGrad)" stroke="hsl(var(--border))" strokeWidth="1" />
      {[40, 56, 72, 88, 104, 120].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="106" r="5" fill="hsl(var(--muted-foreground))" stroke="hsl(var(--border))" />
          <line x1={cx} y1="111" x2={cx} y2="138" stroke="hsl(var(--muted-foreground))" strokeWidth="0.6" />
        </g>
      ))}

      {/* Neck */}
      <path d="M 168 152 L 460 158 Q 470 156 472 168 L 472 178 Q 466 188 458 188 L 168 176 Z" fill="url(#neckGrad)" stroke="hsl(var(--border))" strokeWidth="1" />
      {/* Fretboard */}
      <path d="M 175 154 L 462 160 L 462 166 L 175 160 Z" fill="url(#fretboardGrad)" stroke="hsl(var(--border))" strokeWidth="0.5" />

      {/* Frets */}
      {Array.from({ length: 22 }).map((_, i) => {
        const x = 175 + (462 - 175) * (1 - Math.pow(2, -i / 12));
        return <line key={i} x1={x} y1="154" x2={x} y2="160" stroke="hsl(var(--muted-foreground))" strokeWidth={i === 0 ? 1.6 : 0.9} />;
      })}
      {[3, 5, 7, 9, 12, 15, 17, 19].map((f) => {
        const xStart = 175 + (462 - 175) * (1 - Math.pow(2, -(f - 1) / 12));
        const xEnd = 175 + (462 - 175) * (1 - Math.pow(2, -f / 12));
        return <circle key={f} cx={(xStart + xEnd) / 2} cy="157" r={f === 12 ? 1.4 : 1.1} fill="hsl(40 30% 80%)" />;
      })}

      {/* Nut */}
      <rect x="170" y="142" width="6" height="20" fill="hsl(40 25% 90%)" stroke="hsl(var(--border))" strokeWidth="0.6" />

      {/* Body */}
      <path d="M 460 168 Q 470 168 470 178 L 480 178 Q 478 168 488 168 L 740 168 Q 768 170 770 192 L 770 226 Q 768 246 740 248 L 482 248 Q 470 248 470 240 L 460 240 Z" fill="url(#bodyGrad)" stroke="hsl(var(--border))" strokeWidth="1" />
      {/* Pickguard plate */}
      <path d="M 470 180 Q 470 174 478 174 L 660 174 Q 670 174 670 184 L 670 234 Q 670 240 660 240 L 478 240 Q 470 240 470 234 Z" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="0.6" opacity="0.55" />

      {/* Pickups */}
      {[
        { x: 478, key: 'N' },
        { x: 540, key: 'M' },
        { x: 600, key: 'B' },
      ].filter((p) => !(hideMiddle && p.key === 'M')).map((p) => (
        <g key={p.key}>
          <rect x={p.x - 6} y="174" width="12" height="14" rx="1" fill="hsl(0 0% 5%)" stroke="hsl(var(--border))" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <circle key={i} cx={p.x - 4 + i * 1.7} cy="181" r="0.7" fill="hsl(40 30% 80%)" />
          ))}
        </g>
      ))}

      {/* Bridge plate + saddles */}
      <rect x="640" y="174" width="50" height="22" rx="1" fill="hsl(0 0% 18%)" stroke="hsl(var(--border))" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={644 + i * 7} y={172} width="5" height="9" rx="0.5" fill="hsl(40 25% 70%)" stroke="hsl(0 0% 15%)" strokeWidth="0.4" />
      ))}

      {/* Tremolo arm */}
      <path d="M 690 184 Q 706 188 712 200" stroke="hsl(40 25% 70%)" strokeWidth="2.2" fill="none" />
      <circle cx="713" cy="201" r="3" fill="hsl(40 25% 70%)" />

      {/* Strings */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const tunerX = 40 + i * 16;
        const sy = 154 - 5 + i * 0.15;
        const saddleX = 644 + i * 7 + 2.5;
        return (
          <g key={i} opacity="0.55">
            <line x1={tunerX} y1="106" x2="173" y2={sy} stroke="hsl(40 30% 80%)" strokeWidth="0.55" />
            <line x1="173" y1={sy} x2={saddleX} y2={172} stroke="hsl(40 30% 80%)" strokeWidth="0.55" />
          </g>
        );
      })}

      {/* Annotation overlays */}
      {ANNOTATIONS.map((a) => {
        if (hideMiddle && a.id === 'pickupMiddle') return null;
        const isActive = activeId === a.id;
        const dim = activeId !== null && !isActive;
        const color = GROUP_COLOR[a.group];
        return (
          <g
            key={a.id}
            onClick={(e) => {
              e.stopPropagation();
              onPick(activeId === a.id ? null : a.id);
            }}
            style={{ cursor: 'pointer', opacity: dim ? 0.32 : 1 }}
            className="transition-opacity"
          >
            <line x1={a.point.x} y1={a.point.y} x2={a.label.x} y2={a.label.y}
              stroke={color} strokeWidth={isActive ? 1.4 : 0.8}
              strokeDasharray={isActive ? undefined : '3 3'} opacity="0.7" />
            <circle cx={a.point.x} cy={a.point.y} r={isActive ? 6 : 4} fill={color}
              stroke="hsl(var(--background))" strokeWidth="1.5" />
            <g transform={`translate(${a.label.x}, ${a.label.y})`}>
              <rect x={-a.short.length * 3.4 - 6} y="-9" width={a.short.length * 6.8 + 12} height="18" rx="9"
                fill={isActive ? color : 'hsl(var(--card))'} stroke={color}
                strokeWidth={isActive ? 1.2 : 0.8} />
              <text x="0" y="3.5" textAnchor="middle" fontSize="9.5" fontWeight="600"
                fontFamily="JetBrains Mono, monospace" fill={isActive ? 'white' : 'hsl(var(--foreground))'}>
                {a.short}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}

// ============================================================
// Cross-section (radius) inset
// ============================================================
function RadiusCrossSection({ radiusInches }: { radiusInches: number }) {
  const span = 42;
  const r = radiusInches * 25.4;
  const sag = r - Math.sqrt(r * r - (span / 2) * (span / 2));
  const W = 200, H = 60, padX = 16, padY = 12;
  const innerW = W - padX * 2;
  const cx = W / 2;
  const baselineY = H - padY;
  const sagPx = (sag / 8) * 30;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      <line x1={padX} y1={baselineY} x2={W - padX} y2={baselineY} stroke="hsl(var(--border))" strokeWidth="0.6" strokeDasharray="2 2" />
      <path d={`M ${padX} ${baselineY} Q ${cx} ${baselineY - sagPx * 2} ${W - padX} ${baselineY}`}
        fill="hsl(20 35% 14%)" stroke="hsl(var(--primary))" strokeWidth="1.2" />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const t = i / 5;
        const x = padX + t * innerW;
        const u = (t - 0.5) * 2;
        const y = baselineY - sagPx * 2 * (1 - u * u);
        return <circle key={i} cx={x} cy={y - 1.6} r="1.5" fill="hsl(40 30% 80%)" />;
      })}
      <text x={cx} y="14" textAnchor="middle" fontSize="9" fontFamily="JetBrains Mono, monospace" fill="hsl(var(--muted-foreground))">
        {radiusInches}″ radius cross-section
      </text>
    </svg>
  );
}

// ============================================================
// Saddle-height table + bridge close-up illustration
// ============================================================
function SaddleHeightTable({ specs }: { specs: SetupSpecs }) {
  const rows = computeSaddleHeights(specs);
  return (
    <div className="rounded-lg border border-border/50 bg-card/30 overflow-hidden">
      <table className="w-full text-[11px] font-mono">
        <thead className="bg-secondary/40 text-muted-foreground">
          <tr>
            <th className="px-2 py-1.5 text-left">String</th>
            <th className="px-2 py-1.5 text-right">Action @12</th>
            <th className="px-2 py-1.5 text-right">Saddle drop</th>
            <th className="px-2 py-1.5 text-right">Total height</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            // Saddle "total height" = approx baseline screw height + drop offset
            const total = specs.saddleScrewHeightMm + (Math.max(...rows.map((x) => x.saddleDropMm)) - r.saddleDropMm);
            return (
              <tr key={r.string} className="border-t border-border/30 hover:bg-card/50">
                <td className="px-2 py-1.5 font-bold text-primary">{r.string}</td>
                <td className="px-2 py-1.5 text-right text-foreground">{r.action12Mm.toFixed(2)} mm</td>
                <td className="px-2 py-1.5 text-right text-amber-300">{r.saddleDropMm.toFixed(2)} mm</td>
                <td className="px-2 py-1.5 text-right text-muted-foreground">{total.toFixed(2)} mm</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="px-2 py-2 text-[10px] text-muted-foreground/80 leading-relaxed border-t border-border/30">
        <strong>Drop</strong> = how far each saddle sits below the highest (centre) saddle to follow the {specs.radiusInches}″ radius.
        <strong> Total height</strong> ≈ baseline screw protrusion plus inverse drop — use as a starting point, then fine-tune by ear and feel.
      </p>
    </div>
  );
}

function BridgeCloseup({ specs }: { specs: SetupSpecs }) {
  const rows = computeSaddleHeights(specs);
  const W = 360, H = 150;
  const padX = 30, padTop = 16, plateY = 110;
  const innerW = W - padX * 2;
  const stringSpacing = innerW / 5;
  const maxDrop = Math.max(...rows.map((r) => r.saddleDropMm));
  const yScale = 22; // mm → px exaggeration so visualisation is readable
  const floating = specs.bridgePlateGapMm > 0.1 && (specs.bridgeMode === 'floating-trem' || specs.bridgeMode === 'decked-trem');

  return (
    <div className="rounded-lg border border-border/40 bg-gradient-to-b from-card/40 to-card/20 p-3 space-y-1">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground font-display">
        <span>Bridge close-up · radius-arc'd saddles</span>
        <span className="font-mono normal-case tracking-normal">
          {specs.bridgeMode === 'hardtail' ? 'Hardtail' : floating ? `Floating ${specs.bridgePlateGapMm.toFixed(1)} mm` : 'Decked'}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {/* Body line (under bridge) */}
        <line x1="0" y1={plateY + 28} x2={W} y2={plateY + 28} stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="3 3" />
        {/* Bridge plate */}
        <rect
          x={padX - 14}
          y={plateY}
          width={innerW + 28}
          height="14"
          rx="1"
          fill="hsl(0 0% 18%)"
          stroke="hsl(var(--border))"
          transform={floating ? `rotate(-2 ${W / 2} ${plateY + 7})` : undefined}
        />
        {/* Plate gap indicator */}
        {floating && (
          <g>
            <line x1={W - padX + 14} y1={plateY + 14} x2={W - padX + 14} y2={plateY + 28}
              stroke="hsl(var(--primary))" strokeWidth="1" />
            <text x={W - padX + 20} y={plateY + 22} fontSize="8" fontFamily="JetBrains Mono, monospace" fill="hsl(var(--primary))">
              {specs.bridgePlateGapMm.toFixed(1)}mm
            </text>
          </g>
        )}

        {/* Saddles + strings */}
        {rows.map((r, i) => {
          const x = padX + i * stringSpacing;
          // Saddle top y: higher saddle = smaller y
          const dropY = (r.saddleDropMm / Math.max(maxDrop, 0.1)) * (yScale * 0.6);
          const saddleTop = plateY - 6 - (yScale * 0.6) + dropY;
          const stringY = saddleTop - 3;
          return (
            <g key={r.string}>
              {/* String above */}
              <line x1={x} y1={padTop} x2={x} y2={stringY} stroke="hsl(40 30% 80%)" strokeWidth="0.6" />
              <line x1={x} y1={stringY} x2={W - padX + 5} y2={stringY + 1.5} stroke="hsl(40 30% 80%)" strokeWidth="0.6" opacity="0.7" />
              {/* Saddle screw column */}
              <rect x={x - 4.5} y={saddleTop} width="9" height={plateY - saddleTop} rx="1.5" fill="hsl(40 25% 70%)" stroke="hsl(0 0% 15%)" strokeWidth="0.5" />
              {/* Saddle screw (vertical line indicating the height grub) */}
              <line x1={x} y1={saddleTop + 1} x2={x} y2={plateY - 1} stroke="hsl(0 0% 30%)" strokeWidth="0.6" />
              {/* String label */}
              <text x={x} y={padTop - 4} fontSize="9" textAnchor="middle" fontFamily="JetBrains Mono, monospace"
                fontWeight="700" fill={i === 0 || i === 5 ? 'hsl(var(--primary))' : 'hsl(var(--foreground))'}>
                {r.string}
              </text>
              {/* Drop value */}
              <text x={x} y={plateY + 24} fontSize="7.5" textAnchor="middle" fontFamily="JetBrains Mono, monospace"
                fill={r.saddleDropMm < 0.05 ? 'hsl(var(--muted-foreground))' : 'hsl(25 95% 65%)'}>
                {r.saddleDropMm < 0.05 ? '—' : `${r.saddleDropMm.toFixed(2)}`}
              </text>
            </g>
          );
        })}

        {/* Radius arc overlay (dashed) above strings */}
        <path
          d={`M ${padX} ${padTop + 28 + (rows[0].saddleDropMm / Math.max(maxDrop, 0.1)) * 8}
              Q ${W / 2} ${padTop + 18}
              ${W - padX} ${padTop + 28 + (rows[5].saddleDropMm / Math.max(maxDrop, 0.1)) * 8}`}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="0.8"
          strokeDasharray="3 2"
          opacity="0.5"
        />
        <text x={W - padX} y={padTop + 12} fontSize="8" textAnchor="end" fontFamily="JetBrains Mono, monospace"
          fill="hsl(var(--primary))" opacity="0.7">
          {specs.radiusInches}″ arc
        </text>
      </svg>
    </div>
  );
}

// ============================================================
// Detail panel — shows description + editable fields when applicable
// ============================================================
function AnnotationDetail({
  annotation,
  specs,
  factory,
  bridgeType,
  isOverridden,
  setOverride,
  resetField,
}: {
  annotation: AnnotationMeta;
  specs: SetupSpecs;
  factory: SetupSpecs;
  bridgeType: string;
  isOverridden: (key: SpecKey) => boolean;
  setOverride: (key: SpecKey, value: number) => void;
  resetField: (key: SpecKey) => void;
}) {
  let fields = EDITABLE_FIELDS[annotation.id];
  // Hide tremolo spring/gap controls on bridges that don't have them
  if (annotation.id === 'tremolo' && (specs.bridgeMode === 'hardtail' || specs.bridgeMode === 'offset-trem' || specs.bridgeMode === 'dynamic-vibrato')) {
    fields = undefined;
  }
  const color = GROUP_COLOR[annotation.group];
  const specLine = specStringFor(annotation.id, specs, bridgeType);
  const hasOverride = fields?.some((f) => isOverridden(f.key)) ?? false;

  return (
    <div className="rounded-xl border bg-card/40 p-4 space-y-3" style={{ borderColor: color + '55' }}>
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-base font-bold" style={{ color }}>{annotation.title}</h3>
          {hasOverride && (
            <span className="text-[9px] font-display font-bold px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300 border border-amber-400/30 uppercase tracking-wide">
              Custom
            </span>
          )}
        </div>
        <span className="text-[11px] font-mono text-foreground/85 bg-secondary/40 border border-border/50 px-2 py-0.5 rounded">
          {specLine}
        </span>
      </div>

      <ul className="space-y-1.5 text-[12px] text-foreground/85 leading-relaxed">
        {annotation.details.map((line, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-muted-foreground/60 font-mono">•</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>

      {annotation.id === 'saddleHeights' && (
        <div className="space-y-3">
          <BridgeCloseup specs={specs} />
          <SaddleHeightTable specs={specs} />
        </div>
      )}

      {fields && (
        <div className="rounded-lg bg-secondary/30 border border-border/50 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-display">
            <Pencil className="w-3 h-3" /> Customize
          </div>
          <div className="grid grid-cols-2 gap-2">
            {fields.map((f) => {
              const value = specs[f.key] as number;
              const factoryValue = factory[f.key] as number;
              const overridden = isOverridden(f.key);
              const delta = value - factoryValue;
              return (
                <div key={f.key} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-1">
                    <label className="text-[10px] font-mono text-muted-foreground">{f.label}</label>
                    {overridden && (
                      <button
                        onClick={() => resetField(f.key)}
                        className="text-[9px] font-mono text-muted-foreground/80 hover:text-foreground flex items-center gap-0.5"
                        title="Reset to factory"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    value={value}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (!Number.isFinite(v)) return;
                      setOverride(f.key, v);
                    }}
                    className={`w-full px-2 py-1 rounded bg-background border text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary ${
                      overridden ? 'border-amber-400/60' : 'border-border'
                    }`}
                  />
                  <div className="text-[9px] font-mono text-muted-foreground/80 flex items-center justify-between">
                    <span>Factory: {factoryValue.toFixed(2)}{f.unit}</span>
                    {overridden && delta !== 0 && (
                      <span className={delta > 0 ? 'text-amber-300' : 'text-blue-300'}>
                        {delta > 0 ? '+' : ''}{delta.toFixed(2)}{f.unit}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Wrapper
// ============================================================
const GROUP_LABELS: { id: AnnotationMeta['group']; label: string; color: string }[] = [
  { id: 'neck',        label: 'Neck',        color: 'hsl(var(--primary))' },
  { id: 'body',        label: 'Bridge / Body', color: 'hsl(25 95% 55%)' },
  { id: 'electronics', label: 'Pickups',     color: 'hsl(190 80% 55%)' },
];

export function StratSetupDiagram() {
  const { model, modelId, setModelId, factory, specs, isOverridden, setOverride, resetField, resetAll, hasAnyOverride } = useSetupPrefs();
  const [active, setActive] = useState<AnnotationId | null>(null);
  const annotation = ANNOTATIONS.find((a) => a.id === active && annotationApplies(a.id, specs));
  const hideMiddle = specs.pickupConfig !== 'SSS';

  return (
    <div className="space-y-3">
      {/* Model selector */}
      <div className="rounded-xl border border-border/70 bg-card/40 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-display">Guitar Model</label>
          {hasAnyOverride && (
            <button
              onClick={resetAll}
              className="flex items-center gap-1 text-[10px] font-display text-amber-300 hover:text-amber-200 px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/30"
            >
              <RotateCcw className="w-3 h-3" /> Reset all to factory
            </button>
          )}
        </div>
        <select
          value={modelId}
          onChange={(e) => { setModelId(e.target.value); setActive(null); }}
          className="w-full px-3 py-2 rounded-md bg-secondary/50 border border-border text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <p className="text-[10px] text-muted-foreground/85 leading-relaxed">{model.notes}</p>
        {model.family !== 'Strat' && (
          <p className="text-[10px] text-muted-foreground/60 italic">
            Diagram silhouette is illustrated as a Strat — measurement values reflect the {model.family} factory spec.
          </p>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-display">Legend</span>
        {GROUP_LABELS.map((g) => (
          <span key={g.id} className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: g.color }} />
            {g.label}
          </span>
        ))}
        <span className="ml-auto text-[10px] text-muted-foreground/70 italic">
          Tap any chip to focus its measurement.
        </span>
      </div>

      {/* Diagram */}
      <div
        className="rounded-xl border border-border/70 bg-gradient-to-b from-card/40 to-card/20 p-2 sm:p-4 overflow-x-auto"
        onClick={() => setActive(null)}
      >
        <div className="min-w-[640px]">
          <StratIllustration activeId={active} onPick={setActive} hideMiddle={hideMiddle} />
        </div>
      </div>

      {/* Detail panel */}
      <AnimatePresence mode="wait">
        {annotation ? (
          <motion.div key={annotation.id + modelId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
            <AnnotationDetail
              annotation={annotation}
              specs={specs}
              factory={factory}
              bridgeType={specs.bridgeType}
              isOverridden={isOverridden}
              setOverride={setOverride}
              resetField={resetField}
            />
          </motion.div>
        ) : (
          <motion.div key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="rounded-xl border border-border/50 bg-card/20 p-3 flex items-center gap-2 text-[11px] text-muted-foreground">
            <Info className="w-3.5 h-3.5 text-muted-foreground/70" />
            Click any labelled hot-spot to see how to measure & adjust it. Numeric specs are editable and persist for this model.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cross-section */}
      <div className="rounded-xl border border-border/70 bg-card/30 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h4 className="font-display text-xs font-bold tracking-wide uppercase text-foreground/85">
            Fretboard radius cross-section · {specs.radiusInches}″
          </h4>
          <div className="flex flex-wrap gap-1">
            {[7.25, 9.5, 12, 14, 16].map((r) => (
              <button
                key={r}
                onClick={() => setOverride('radiusInches', r)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono transition-all ${
                  Math.abs(specs.radiusInches - r) < 0.01
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary/50 text-muted-foreground hover:text-foreground border border-border/60'
                }`}
              >
                {r}″
              </button>
            ))}
          </div>
        </div>
        <div className="bg-gradient-to-b from-amber-900/10 to-card/20 rounded-lg border border-border/40 p-2">
          <RadiusCrossSection radiusInches={specs.radiusInches} />
        </div>
        <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
          Visualisation exaggerates curvature for clarity — actual sagitta on a Strat-width nut is &lt; 1 mm.
          A flatter radius (12″+) lets you set lower action without bend-out; a vintage 7.25″ feels softer for chords.
        </p>
      </div>

      {/* Workflow tip */}
      <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 text-[11px] text-foreground/85 leading-relaxed">
        <strong className="font-display tracking-wide text-amber-300/90">Setup order matters: </strong>
        <span className="font-mono">tune → relief → nut action → 12-fret action → pickup heights → intonation → re-tune</span>.
        Re-tune after every change — string tension and tremolo spring balance interact, and a 0.1 mm bridge tweak can drift you sharp by several cents.
      </div>

      {/* Bench sheet — copy/print summary of every measurement */}
      <SetupBenchSheet model={model} factory={factory} specs={specs} hasAnyOverride={hasAnyOverride} />
    </div>
  );
}
