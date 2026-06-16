import { useState } from 'react';
import { ChevronDown, ClipboardCheck, Clipboard, Printer, FileText } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { computeSaddleHeights, type SetupSpecs, type GuitarModel } from '@/hooks/useSetupPrefs';

interface Props {
  model: GuitarModel;
  factory: SetupSpecs;
  specs: SetupSpecs;
  hasAnyOverride: boolean;
}

// ============================================================
// Markdown export — user can paste into notes app, GitHub, etc.
// ============================================================
function generateMarkdown(model: GuitarModel, specs: SetupSpecs, factory: SetupSpecs): string {
  const date = new Date().toISOString().slice(0, 10);
  const rows = computeSaddleHeights(specs);
  const maxDrop = Math.max(...rows.map((r) => r.saddleDropMm));

  const diff = (cur: number, fac: number, unit = 'mm', fmt = (n: number) => n.toFixed(2)) => {
    const d = cur - fac;
    if (Math.abs(d) < 0.005) return '';
    const sign = d > 0 ? '+' : '';
    return ` _(custom ${sign}${fmt(d)}${unit})_`;
  };

  return `# ${model.name} — Setup Sheet

*Generated ${date}*

## Build

| Spec | Value |
| --- | --- |
| Scale length | ${specs.scaleLengthMm} mm (${(specs.scaleLengthMm / 25.4).toFixed(2)}″) |
| Fretboard radius | ${specs.radiusInches}″${diff(specs.radiusInches, factory.radiusInches, '″')} |
| Frets | ${specs.numFrets} |
| Pickup config | ${specs.pickupConfig} |
| Bridge | ${specs.bridgeType} |
| Bridge string spacing | ${specs.bridgeStringSpacingMm.toFixed(1)} mm${diff(specs.bridgeStringSpacingMm, factory.bridgeStringSpacingMm, 'mm', (n) => n.toFixed(1))} |

## Neck

| Measurement | Value |
| --- | --- |
| Relief @ 7th–9th | ${specs.reliefMinMm.toFixed(2)} – ${specs.reliefMaxMm.toFixed(2)} mm${diff(specs.reliefMaxMm, factory.reliefMaxMm)} |
| Nut action — Treble | ${specs.nutActionTrebleMm.toFixed(2)} mm${diff(specs.nutActionTrebleMm, factory.nutActionTrebleMm)} |
| Nut action — Bass | ${specs.nutActionBassMm.toFixed(2)} mm${diff(specs.nutActionBassMm, factory.nutActionBassMm)} |

## Action @ 12th fret

| Side | Value |
| --- | --- |
| Treble (high e) | ${specs.action12TrebleMm.toFixed(2)} mm${diff(specs.action12TrebleMm, factory.action12TrebleMm)} |
| Bass (low E) | ${specs.action12BassMm.toFixed(2)} mm${diff(specs.action12BassMm, factory.action12BassMm)} |

## Pickup heights (mm)

| Pickup | Treble | Bass |
| --- | --- | --- |
| Neck | ${specs.pickupNeckTrebleMm.toFixed(1)}${diff(specs.pickupNeckTrebleMm, factory.pickupNeckTrebleMm, 'mm', (n) => n.toFixed(1))} | ${specs.pickupNeckBassMm.toFixed(1)}${diff(specs.pickupNeckBassMm, factory.pickupNeckBassMm, 'mm', (n) => n.toFixed(1))} |
${specs.pickupConfig === 'SSS' ? `| Middle | ${specs.pickupMiddleTrebleMm.toFixed(1)}${diff(specs.pickupMiddleTrebleMm, factory.pickupMiddleTrebleMm, 'mm', (n) => n.toFixed(1))} | ${specs.pickupMiddleBassMm.toFixed(1)}${diff(specs.pickupMiddleBassMm, factory.pickupMiddleBassMm, 'mm', (n) => n.toFixed(1))} |\n` : ''}| Bridge | ${specs.pickupBridgeTrebleMm.toFixed(1)}${diff(specs.pickupBridgeTrebleMm, factory.pickupBridgeTrebleMm, 'mm', (n) => n.toFixed(1))} | ${specs.pickupBridgeBassMm.toFixed(1)}${diff(specs.pickupBridgeBassMm, factory.pickupBridgeBassMm, 'mm', (n) => n.toFixed(1))} |

## Bridge / Tremolo

| Spec | Value |
| --- | --- |
| Mode | ${specs.bridgeMode === 'hardtail' ? 'Hardtail (no springs)' : specs.bridgePlateGapMm > 0.1 ? `Floating ${specs.bridgePlateGapMm.toFixed(1)} mm gap` : 'Decked'} |
| Springs | ${specs.springCount === 0 ? 'n/a' : specs.springCount}${diff(specs.springCount, factory.springCount, '', (n) => n.toFixed(0))} |
| Saddle screw baseline | ${specs.saddleScrewHeightMm.toFixed(1)} mm${diff(specs.saddleScrewHeightMm, factory.saddleScrewHeightMm, 'mm', (n) => n.toFixed(1))} |

## Per-string saddle table

| String | Action @12 | Saddle drop | Total height |
| --- | --- | --- | --- |
${rows.map((r) => {
  const total = specs.saddleScrewHeightMm + (maxDrop - r.saddleDropMm);
  return `| ${r.string} | ${r.action12Mm.toFixed(2)} mm | ${r.saddleDropMm.toFixed(2)} mm | ${total.toFixed(2)} mm |`;
}).join('\n')}

## Setup order

\`tune → relief → nut action → 12-fret action → pickup heights → intonation → re-tune\`
`;
}

// ============================================================
// Component
// ============================================================
export function SetupBenchSheet({ model, factory, specs, hasAnyOverride }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rows = computeSaddleHeights(specs);
  const maxDrop = Math.max(...rows.map((r) => r.saddleDropMm));

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateMarkdown(model, factory, specs));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const handlePrint = () => window.print();

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-xl border border-border/70 bg-card/40 overflow-hidden print:break-inside-avoid">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 hover:bg-secondary/20 transition-colors group print:hidden">
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-primary/90" />
              <h3 className="font-display text-sm font-bold tracking-wide">Bench Sheet</h3>
              <span className="text-[10px] text-muted-foreground/80 hidden sm:inline">
                {hasAnyOverride ? 'Custom — copy/print for the bench' : 'Factory — copy/print for the bench'}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent forceMount className={open ? 'block' : 'hidden print:block'}>
          <div className="p-4 space-y-3 bench-sheet print:p-0 print:text-black">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 flex-wrap pb-2 border-b border-border/40">
              <div>
                <h4 className="font-display text-base font-bold">{model.name}</h4>
                <p className="text-[10px] text-muted-foreground/85">{model.notes}</p>
              </div>
              <div className="flex items-center gap-1.5 print:hidden">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary/50 border border-border/50 text-[11px] font-display hover:bg-secondary"
                >
                  {copied ? <ClipboardCheck className="w-3.5 h-3.5 text-status-good" /> : <Clipboard className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy markdown'}
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary/50 border border-border/50 text-[11px] font-display hover:bg-secondary"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
              </div>
            </div>

            <BenchGrid specs={specs} factory={factory} />

            <SaddleSummary specs={specs} rows={rows} maxDrop={maxDrop} />

            <p className="text-[10px] text-muted-foreground/70 italic pt-1 border-t border-border/40">
              Setup order: tune → relief → nut action → 12-fret action → pickup heights → intonation → re-tune.
              Always re-tune after every change.
            </p>
          </div>
        </CollapsibleContent>
      </div>

      {/* Print-only CSS */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .bench-sheet, .bench-sheet * { visibility: visible; }
          .bench-sheet { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; background: white; color: black; }
          .bench-sheet table { color: black; }
        }
      `}</style>
    </Collapsible>
  );
}

// ============================================================
// Renderers
// ============================================================
function diffBadge(value: number, factoryValue: number, unit = 'mm', digits = 2): string | null {
  const d = value - factoryValue;
  if (Math.abs(d) < 0.005) return null;
  return `${d > 0 ? '+' : ''}${d.toFixed(digits)}${unit}`;
}

function Row({ label, value, factory, unit = 'mm', digits = 2 }: { label: string; value: number; factory: number; unit?: string; digits?: number }) {
  const diff = diffBadge(value, factory, unit, digits);
  return (
    <div className="flex items-baseline justify-between gap-2 py-0.5 text-[11px] font-mono">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2">
        <span className="font-bold text-foreground">{value.toFixed(digits)}{unit}</span>
        {diff && (
          <span className={`text-[9px] px-1 py-0.5 rounded ${diff.startsWith('-') ? 'bg-blue-500/15 text-blue-300' : 'bg-amber-400/15 text-amber-300'}`}>
            {diff}
          </span>
        )}
      </span>
    </div>
  );
}

function BenchGrid({ specs, factory }: { specs: SetupSpecs; factory: SetupSpecs }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-1">
        <h5 className="text-[10px] uppercase tracking-wider text-primary font-display font-bold">Neck</h5>
        <Row label="Relief min @ 7-9" value={specs.reliefMinMm} factory={factory.reliefMinMm} />
        <Row label="Relief max @ 7-9" value={specs.reliefMaxMm} factory={factory.reliefMaxMm} />
        <Row label="Nut action — treble" value={specs.nutActionTrebleMm} factory={factory.nutActionTrebleMm} />
        <Row label="Nut action — bass" value={specs.nutActionBassMm} factory={factory.nutActionBassMm} />
        <Row label="Radius" value={specs.radiusInches} factory={factory.radiusInches} unit="″" digits={2} />

        <h5 className="text-[10px] uppercase tracking-wider text-primary font-display font-bold pt-2">Action @ 12th fret</h5>
        <Row label="Treble (high e)" value={specs.action12TrebleMm} factory={factory.action12TrebleMm} />
        <Row label="Bass (low E)" value={specs.action12BassMm} factory={factory.action12BassMm} />
      </div>

      <div className="space-y-1">
        <h5 className="text-[10px] uppercase tracking-wider text-primary font-display font-bold">Pickup heights</h5>
        <Row label="Neck — treble" value={specs.pickupNeckTrebleMm} factory={factory.pickupNeckTrebleMm} digits={1} />
        <Row label="Neck — bass" value={specs.pickupNeckBassMm} factory={factory.pickupNeckBassMm} digits={1} />
        {specs.pickupConfig === 'SSS' && (
          <>
            <Row label="Middle — treble" value={specs.pickupMiddleTrebleMm} factory={factory.pickupMiddleTrebleMm} digits={1} />
            <Row label="Middle — bass" value={specs.pickupMiddleBassMm} factory={factory.pickupMiddleBassMm} digits={1} />
          </>
        )}
        <Row label="Bridge — treble" value={specs.pickupBridgeTrebleMm} factory={factory.pickupBridgeTrebleMm} digits={1} />
        <Row label="Bridge — bass" value={specs.pickupBridgeBassMm} factory={factory.pickupBridgeBassMm} digits={1} />

        <h5 className="text-[10px] uppercase tracking-wider text-orange-400 font-display font-bold pt-2">Bridge / tremolo</h5>
        <div className="flex items-baseline justify-between gap-2 py-0.5 text-[11px] font-mono">
          <span className="text-muted-foreground">Type</span>
          <span className="text-foreground">{specs.bridgeType}</span>
        </div>
        <Row label="Plate gap" value={specs.bridgePlateGapMm} factory={factory.bridgePlateGapMm} digits={1} />
        <Row label="Springs" value={specs.springCount} factory={factory.springCount} unit="" digits={0} />
        <Row label="Bridge spacing" value={specs.bridgeStringSpacingMm} factory={factory.bridgeStringSpacingMm} digits={1} />
        <Row label="Saddle screw base" value={specs.saddleScrewHeightMm} factory={factory.saddleScrewHeightMm} digits={1} />
      </div>
    </div>
  );
}

function SaddleSummary({
  specs,
  rows,
  maxDrop,
}: {
  specs: SetupSpecs;
  rows: ReturnType<typeof computeSaddleHeights>;
  maxDrop: number;
}) {
  return (
    <div>
      <h5 className="text-[10px] uppercase tracking-wider text-orange-400 font-display font-bold mb-1">
        Per-string saddle table · {specs.radiusInches}″ radius
      </h5>
      <div className="rounded-lg border border-border/50 overflow-hidden">
        <table className="w-full text-[11px] font-mono">
          <thead className="bg-secondary/40 text-muted-foreground">
            <tr>
              <th className="px-2 py-1 text-left">String</th>
              <th className="px-2 py-1 text-right">Action @12</th>
              <th className="px-2 py-1 text-right">Saddle drop</th>
              <th className="px-2 py-1 text-right">Total height</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const total = specs.saddleScrewHeightMm + (maxDrop - r.saddleDropMm);
              return (
                <tr key={r.string} className="border-t border-border/30">
                  <td className="px-2 py-0.5 font-bold text-primary">{r.string}</td>
                  <td className="px-2 py-0.5 text-right">{r.action12Mm.toFixed(2)} mm</td>
                  <td className="px-2 py-0.5 text-right text-amber-300">{r.saddleDropMm.toFixed(2)} mm</td>
                  <td className="px-2 py-0.5 text-right text-muted-foreground">{total.toFixed(2)} mm</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
