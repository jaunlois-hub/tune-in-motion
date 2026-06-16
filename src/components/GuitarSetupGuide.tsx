import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const SETUP_SECTIONS = [
  {
    id: 'action',
    title: '📏 String Action Height',
    content: (
      <div className="space-y-3 text-xs text-muted-foreground">
        <p>String action is the distance between the bottom of the string and the top of the fret. Measured at the <strong className="text-foreground">12th fret</strong>.</p>
        <div className="bg-secondary/30 rounded-lg p-3 font-mono text-[11px] space-y-1">
          <div className="font-display font-bold text-foreground text-xs mb-2">Recommended Heights (12th fret)</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <div>Low E (6th): <span className="text-primary">2.0mm</span> electric</div>
            <div>Low E (6th): <span className="text-primary">2.5mm</span> acoustic</div>
            <div>A (5th): <span className="text-primary">1.8mm</span> electric</div>
            <div>A (5th): <span className="text-primary">2.3mm</span> acoustic</div>
            <div>D (4th): <span className="text-primary">1.8mm</span> electric</div>
            <div>D (4th): <span className="text-primary">2.2mm</span> acoustic</div>
            <div>G (3rd): <span className="text-primary">1.6mm</span> electric</div>
            <div>G (3rd): <span className="text-primary">2.0mm</span> acoustic</div>
            <div>B (2nd): <span className="text-primary">1.6mm</span> electric</div>
            <div>B (2nd): <span className="text-primary">2.0mm</span> acoustic</div>
            <div>High E (1st): <span className="text-primary">1.5mm</span> electric</div>
            <div>High E (1st): <span className="text-primary">1.8mm</span> acoustic</div>
          </div>
        </div>
        <p><strong className="text-foreground">How to measure:</strong> Use a ruler or string action gauge at the 12th fret. Measure from the top of the fret to the bottom of the string.</p>
        <p><strong className="text-foreground">Too high?</strong> Hard to play, hand fatigue. Lower the bridge saddles.</p>
        <p><strong className="text-foreground">Too low?</strong> Fret buzz, dead notes. Raise the bridge saddles.</p>
      </div>
    ),
  },
  {
    id: 'relief',
    title: '🔧 Neck Relief',
    content: (
      <div className="space-y-3 text-xs text-muted-foreground">
        <p>Neck relief is the slight bow in the neck that allows strings to vibrate without buzzing. Controlled by the <strong className="text-foreground">truss rod</strong>.</p>
        <div className="bg-secondary/30 rounded-lg p-3 font-mono text-[11px]">
          <div className="font-display font-bold text-foreground text-xs mb-2">Recommended Relief</div>
          <p>Gap at 7th-9th fret: <span className="text-primary">0.2 – 0.3mm</span> (~0.008" – 0.012")</p>
          <p className="mt-1 text-muted-foreground">About the thickness of a business card</p>
        </div>
        <p><strong className="text-foreground">How to check:</strong></p>
        <ol className="list-decimal list-inside space-y-1 ml-2">
          <li>Capo at the 1st fret</li>
          <li>Hold the string down at the last fret</li>
          <li>Check the gap at the 7th-9th fret</li>
          <li>Use a feeler gauge or business card for reference</li>
        </ol>
        <p><strong className="text-foreground">Too much relief (bow)?</strong> Tighten truss rod (clockwise). High action in middle of neck.</p>
        <p><strong className="text-foreground">Back bow (reverse)?</strong> Loosen truss rod (counter-clockwise). Buzz on lower frets.</p>
        <p className="text-status-warn/80">⚠️ Adjust in 1/4 turn increments. Wait 30 minutes between adjustments. If in doubt, see a luthier.</p>
      </div>
    ),
  },
  {
    id: 'radius',
    title: '🎯 Fretboard Radius',
    content: (
      <div className="space-y-3 text-xs text-muted-foreground">
        <p>The fretboard radius is the curvature of the playing surface. Affects playability and string action consistency.</p>
        <div className="bg-secondary/30 rounded-lg p-3 font-mono text-[11px] space-y-1">
          <div className="font-display font-bold text-foreground text-xs mb-2">Common Radii</div>
          <div className="space-y-1">
            <div><span className="text-primary">7.25"</span> — Vintage Fender. Very curved. Great for chords, harder for bends.</div>
            <div><span className="text-primary">9.5"</span> — Modern Fender. Good all-around balance.</div>
            <div><span className="text-primary">12"</span> — Gibson, PRS. Flatter. Great for bending and lead work.</div>
            <div><span className="text-primary">16"</span> — Ibanez, Jackson. Very flat. Fast shredding.</div>
            <div><span className="text-primary">Compound (9.5"→14")</span> — Rounder at nut, flatter up high. Best of both worlds.</div>
          </div>
        </div>
        <p><strong className="text-foreground">Why it matters:</strong> A more curved radius needs higher action to prevent fretting out during bends. Flatter = lower action possible.</p>
      </div>
    ),
  },
  {
    id: 'pickups',
    title: '🎛️ Pickup Height',
    content: (
      <div className="space-y-3 text-xs text-muted-foreground">
        <p>Pickup height affects output level, tone, and sustain. Too close = magnetic pull on strings causes warble.</p>
        <div className="bg-secondary/30 rounded-lg p-3 font-mono text-[11px] space-y-1">
          <div className="font-display font-bold text-foreground text-xs mb-2">Recommended Heights (from string bottom, last fret held)</div>
          <div className="space-y-1">
            <div><strong>Single Coil (Strat):</strong> Bass <span className="text-primary">2.4mm</span> / Treble <span className="text-primary">2.0mm</span></div>
            <div><strong>Humbucker:</strong> Bass <span className="text-primary">2.0mm</span> / Treble <span className="text-primary">1.6mm</span></div>
            <div><strong>P90:</strong> Bass <span className="text-primary">2.4mm</span> / Treble <span className="text-primary">2.0mm</span></div>
            <div><strong>Tele Bridge:</strong> Bass <span className="text-primary">2.0mm</span> / Treble <span className="text-primary">1.6mm</span></div>
          </div>
        </div>
        <p><strong className="text-foreground">Too close?</strong> Warbling intonation, wolf tones, string pull. Back off the pickup.</p>
        <p><strong className="text-foreground">Too far?</strong> Weak output, thin tone. Raise the pickup closer.</p>
      </div>
    ),
  },
  {
    id: 'nut',
    title: '🔩 Nut Slot Depth',
    content: (
      <div className="space-y-3 text-xs text-muted-foreground">
        <p>The nut slots control open string height and affect tuning stability, intonation, and playability at the first few frets.</p>
        <div className="bg-secondary/30 rounded-lg p-3 font-mono text-[11px]">
          <div className="font-display font-bold text-foreground text-xs mb-2">How to Check</div>
          <p>Press the string at the 3rd fret. The gap between the string and the 1st fret should be about <span className="text-primary">0.1 – 0.2mm</span> (barely visible clearance).</p>
        </div>
        <p><strong className="text-foreground">Slots too high?</strong> Hard to play at first position. Open chords feel stiff. Sharps at 1st fret.</p>
        <p><strong className="text-foreground">Slots too low?</strong> Open string buzz. Sitar-like sound on open strings.</p>
        <p><strong className="text-foreground">Slot width:</strong> Should match string gauge exactly. Too tight = binding/tuning issues. Too loose = buzz.</p>
      </div>
    ),
  },
  {
    id: 'tremolo',
    title: '🌊 Tremolo & Bridge Setup',
    content: (
      <div className="space-y-3 text-xs text-muted-foreground">
        <p>Bridge type significantly affects setup approach, tuning stability, and maintenance.</p>
        <div className="bg-secondary/30 rounded-lg p-3 font-mono text-[11px] space-y-2">
          <div>
            <div className="font-display font-bold text-foreground text-xs mb-1">Floating Tremolo (Strat-style)</div>
            <ul className="list-disc list-inside space-y-0.5 ml-1">
              <li>Back plate gap: 1.5–3mm depending on preference</li>
              <li>2–3 springs for standard gauge strings</li>
              <li>Balance spring tension against string pull</li>
              <li>Changing string gauge requires rebalancing</li>
            </ul>
          </div>
          <div>
            <div className="font-display font-bold text-foreground text-xs mb-1">Decked (flush) Tremolo</div>
            <ul className="list-disc list-inside space-y-0.5 ml-1">
              <li>Baseplate sits flat against body</li>
              <li>Dive-only operation</li>
              <li>Better tuning stability</li>
              <li>Add springs or tighten claw to deck</li>
            </ul>
          </div>
          <div>
            <div className="font-display font-bold text-foreground text-xs mb-1">Floyd Rose / Locking</div>
            <ul className="list-disc list-inside space-y-0.5 ml-1">
              <li>Must be perfectly level (parallel to body)</li>
              <li>Lock nut after tuning; fine-tune at bridge</li>
              <li>String changes require block/tool</li>
            </ul>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'troubleshooting',
    title: '🩺 Common Issues',
    content: (
      <div className="space-y-3 text-xs text-muted-foreground">
        <div className="space-y-2">
          <div>
            <strong className="text-foreground">Fret buzz on specific frets:</strong>
            <p className="ml-3">Likely a high fret. Check with a fret rocker. May need fret leveling.</p>
          </div>
          <div>
            <strong className="text-foreground">Buzz everywhere (low frets):</strong>
            <p className="ml-3">Neck may be too straight or back-bowed. Loosen truss rod slightly.</p>
          </div>
          <div>
            <strong className="text-foreground">Buzz everywhere (high frets):</strong>
            <p className="ml-3">Action too low. Raise bridge saddles.</p>
          </div>
          <div>
            <strong className="text-foreground">Guitar won't stay in tune:</strong>
            <p className="ml-3">Check nut slots (binding), tuning machine tightness, string winding, and bridge saddle condition.</p>
          </div>
          <div>
            <strong className="text-foreground">Dead notes / wolf tones:</strong>
            <p className="ml-3">Could be pickup too close, bad fret, or structural resonance. Isolate by testing unplugged.</p>
          </div>
          <div>
            <strong className="text-foreground">Intonation drifts after setup:</strong>
            <p className="ml-3">Temperature/humidity change. Let guitar acclimate, then re-check. Store at 45-55% humidity.</p>
          </div>
        </div>
      </div>
    ),
  },
];

export function GuitarSetupGuide() {
  return (
    <Accordion type="multiple" className="space-y-1">
      {SETUP_SECTIONS.map(section => (
        <AccordionItem key={section.id} value={section.id} className="border-border/50 bg-card/30 rounded-lg px-3 border">
          <AccordionTrigger className="text-sm font-display py-3 hover:no-underline">
            {section.title}
          </AccordionTrigger>
          <AccordionContent>{section.content}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
