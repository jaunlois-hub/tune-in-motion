import { useRef, useState, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Line, ContactShadows, Environment } from '@react-three/drei';
import * as THREE from 'three';

// ============================================================
// Classic Stratocaster body finishes
// ============================================================
const FINISHES: { id: string; name: string; body: string; pickguard: string; metalness: number; roughness: number }[] = [
  { id: 'sunburst',     name: '3-Color Sunburst', body: '#d97706', pickguard: '#fef3c7', metalness: 0.05, roughness: 0.45 },
  { id: 'sonicBlue',    name: 'Sonic Blue',       body: '#67d6e2', pickguard: '#fef3c7', metalness: 0.10, roughness: 0.30 },
  { id: 'candyApple',   name: 'Candy Apple Red',  body: '#9d0d20', pickguard: '#f9fafb', metalness: 0.30, roughness: 0.20 },
  { id: 'olympicWhite', name: 'Olympic White',    body: '#f4f4f0', pickguard: '#0a0a0a', metalness: 0.10, roughness: 0.40 },
  { id: 'black',        name: 'Black',            body: '#0a0a0a', pickguard: '#f9fafb', metalness: 0.20, roughness: 0.40 },
  { id: 'surfGreen',    name: 'Surf Green',       body: '#9bc8a8', pickguard: '#fef3c7', metalness: 0.10, roughness: 0.35 },
  { id: 'butterscotch', name: 'Butterscotch',     body: '#d4a253', pickguard: '#000000', metalness: 0.05, roughness: 0.55 },
];
type Finish = (typeof FINISHES)[number];

// ============================================================
// STRATOCASTER SPECS — all measurements in millimetres (mm)
// Reference: Fender American Pro II Stratocaster, factory action
// ============================================================
const SPEC = {
  scaleLength: 648,           // 25.5"
  bodyLength: 406,            // 16"
  bodyWidth: 324,             // 12.75" lower bout
  bodyWidthUpper: 292,        // 11.5" upper bout
  bodyThickness: 44,          // 1.75"
  bodyWaist: 241,             // 9.5"

  numFrets: 21,
  nutWidth: 42.8,             // 1 11/16"
  neckWidthAt12Fret: 52.3,
  neckThickness: 21,          // C profile, 1st fret
  neckThicknessAt12: 22.5,
  fretboardRadius: 241,       // 9.5"

  bridgeStringSpacing: 52.4,  // 2.063"
  nutStringSpacing: 35.0,
  numStrings: 6,

  pickupBridgeFromBridge: 41,
  pickupMiddleFromBridge: 89,
  pickupNeckFromBridge: 162,
  pickupWidth: 18,
  pickupLength: 69,

  headstockLength: 165,
  headstockWidth: 73,

  knobDiameter: 24,
  knobHeight: 22,

  // String heights (action) — Fender factory spec, mm above the relevant fret
  actionNut1: 0.4,     // string 1 (high E, treble)
  actionNut6: 0.7,     // string 6 (low E, bass)
  action12_1: 1.6,     // 4/64" treble side at 12th fret
  action12_6: 2.0,     // 5/64" bass side at 12th fret
  actionLast1: 2.0,    // treble side at 21st fret
  actionLast6: 2.5,    // bass side at 21st fret
};

// 1 mm → THREE.js units. 0.04 keeps the model the same on-screen size as a 25.5″ inches-based version.
const M = 0.04;
const mm = (v: number) => v * M;

// Exaggerate visible string action so the gap is readable. Labels still show real mm.
const ACTION_VIS = 10;

// ============================================================
// Strat body silhouette (top-down)
// Origin at body center; +X toward neck/headstock; +Y is bass-side (upper horn)
// ============================================================
function makeStratBodyShape(): THREE.Shape {
  const halfL = mm(SPEC.bodyLength) / 2;
  const lower = mm(SPEC.bodyWidth) / 2;        // treble side, -Y
  const upper = mm(SPEC.bodyWidthUpper) / 2;   // bass side, +Y
  const waist = mm(SPEC.bodyWaist) / 2;
  const s = new THREE.Shape();

  // Start at butt-treble corner area, walk counterclockwise (in body local frame)
  s.moveTo(-halfL + mm(40), -lower);
  // Rounded butt → butt-bass corner
  s.bezierCurveTo(-halfL - mm(20), -lower + mm(15), -halfL - mm(20), upper - mm(15), -halfL + mm(40), upper);
  // Bass-side curve up through waist to upper bout
  s.bezierCurveTo(-halfL + mm(150), upper - mm(2), -halfL + mm(190), waist + mm(8), 0, waist + mm(2));
  s.bezierCurveTo(halfL - mm(190), waist - mm(4), halfL - mm(120), upper + mm(4), halfL - mm(60), upper + mm(8));
  // Curve down toward upper (bass) horn — the longer cutaway side
  s.bezierCurveTo(halfL - mm(20), upper + mm(2), halfL + mm(5), upper - mm(35), halfL + mm(2), mm(28));
  // Across the neck pocket area (narrow)
  s.lineTo(halfL + mm(5), mm(20));
  s.lineTo(halfL + mm(5), -mm(20));
  // Lower (treble) horn — shorter cutaway
  s.bezierCurveTo(halfL + mm(2), -mm(35), halfL - mm(20), -lower + mm(40), halfL - mm(80), -lower + mm(20));
  // Down through treble waist
  s.bezierCurveTo(halfL - mm(160), -upper - mm(5), halfL - mm(220), -waist + mm(5), 0, -waist - mm(2));
  s.bezierCurveTo(-halfL + mm(190), -waist - mm(8), -halfL + mm(150), -lower + mm(2), -halfL + mm(40), -lower);
  return s;
}

function makeHeadstockShape(): THREE.Shape {
  const len = mm(SPEC.headstockLength);
  const w = mm(SPEC.headstockWidth) / 2;
  const nutHalf = mm(SPEC.nutWidth) / 2;
  const s = new THREE.Shape();
  s.moveTo(0, -nutHalf - mm(2));
  s.lineTo(len * 0.92, -w);
  s.quadraticCurveTo(len, -w + mm(5), len, -w + mm(15));
  s.lineTo(len, w * 0.4);
  s.quadraticCurveTo(len * 0.85, w, len * 0.55, w);
  s.lineTo(mm(15), nutHalf + mm(3));
  s.lineTo(0, nutHalf + mm(2));
  s.closePath();
  return s;
}

// ============================================================
// Annotations
// ============================================================
function MeasureLine({
  from, to, label, color = '#22d3ee', side = 'top',
}: {
  from: [number, number, number];
  to: [number, number, number];
  label: string;
  color?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
}) {
  const mid: [number, number, number] = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2];
  const offsetClass = side === 'bottom' ? 'translate-y-2' : side === 'top' ? '-translate-y-2' : '';
  return (
    <>
      <Line points={[from, to]} color={color} lineWidth={1.5} dashed dashScale={4} dashSize={0.15} gapSize={0.1} />
      <mesh position={from}><sphereGeometry args={[0.06]} /><meshBasicMaterial color={color} /></mesh>
      <mesh position={to}><sphereGeometry args={[0.06]} /><meshBasicMaterial color={color} /></mesh>
      <Html position={mid} center distanceFactor={20} zIndexRange={[10, 0]}>
        <div className={`px-1.5 py-0.5 bg-cyan-500/90 text-[10px] font-mono text-black rounded whitespace-nowrap pointer-events-none border border-cyan-300 shadow-lg ${offsetClass}`}>
          {label}
        </div>
      </Html>
    </>
  );
}

function PointLabel({ position, label, color = '#fbbf24' }: { position: [number, number, number]; label: string; color?: string }) {
  return (
    <>
      <mesh position={position}><sphereGeometry args={[0.07]} /><meshBasicMaterial color={color} /></mesh>
      <Html position={position} center distanceFactor={18} zIndexRange={[10, 0]}>
        <div className="px-1.5 py-0.5 bg-amber-400/90 text-[10px] font-mono text-black rounded whitespace-nowrap pointer-events-none border border-amber-300 shadow-lg translate-x-3 translate-y-3">
          {label}
        </div>
      </Html>
    </>
  );
}

/** Vertical leader-line callout for an action measurement (string-to-fret gap). */
function ActionCallout({
  fretPos, // [X (along neck), Y (across), Z (height of fret top)] in three.js units
  stringHeightVis, // visible vertical extent (already exaggerated)
  realMm,
  label,
}: {
  fretPos: [number, number, number];
  stringHeightVis: number;
  realMm: number;
  label: string;
}) {
  const top: [number, number, number] = [fretPos[0], fretPos[1], fretPos[2] + stringHeightVis];
  const labelPos: [number, number, number] = [fretPos[0], fretPos[1] + 0.3, fretPos[2] + stringHeightVis / 2];
  return (
    <>
      <Line points={[fretPos, top]} color="#ef4444" lineWidth={2} />
      <mesh position={fretPos}><sphereGeometry args={[0.04]} /><meshBasicMaterial color="#ef4444" /></mesh>
      <mesh position={top}><sphereGeometry args={[0.04]} /><meshBasicMaterial color="#ef4444" /></mesh>
      <Html position={labelPos} center distanceFactor={16} zIndexRange={[12, 0]}>
        <div className="px-1.5 py-0.5 bg-red-500/95 text-[10px] font-mono text-white rounded whitespace-nowrap pointer-events-none border border-red-300 shadow-lg">
          {label}: <span className="font-bold">{realMm.toFixed(2)} mm</span>
        </div>
      </Html>
    </>
  );
}

// ============================================================
// The Stratocaster
// ============================================================
function Stratocaster({ showAnnotations, showAction, finish }: { showAnnotations: boolean; showAction: boolean; finish: Finish }) {
  const groupRef = useRef<THREE.Group>(null);

  const bodyShape = useMemo(() => makeStratBodyShape(), []);
  const bodyGeom = useMemo(() => new THREE.ExtrudeGeometry(bodyShape, {
    depth: mm(SPEC.bodyThickness), bevelEnabled: true, bevelSegments: 4, bevelSize: mm(4), bevelThickness: mm(2.5), curveSegments: 48,
  }), [bodyShape]);

  const headstockShape = useMemo(() => makeHeadstockShape(), []);
  const headstockGeom = useMemo(() => new THREE.ExtrudeGeometry(headstockShape, {
    depth: mm(15), bevelEnabled: true, bevelSize: mm(1.2), bevelThickness: mm(1), curveSegments: 24,
  }), [headstockShape]);

  // Body sits centered. Body's neck heel is at +X edge.
  const heelX = mm(SPEC.bodyLength) / 2;
  // Bridge sits ~80mm in from the heel (typical Strat trem position relative to body end)
  const bridgeX = heelX - mm(80);
  // Nut is 648mm forward of the bridge (scale length)
  const nutX = bridgeX + mm(SPEC.scaleLength);
  // Last (21st) fret position
  const lastFretDist = SPEC.scaleLength * (1 - Math.pow(2, -SPEC.numFrets / 12));
  const lastFretX = nutX - mm(lastFretDist);
  const fret12Dist = SPEC.scaleLength * (1 - Math.pow(2, -12 / 12));
  const fret12X = nutX - mm(fret12Dist);

  // Convenience for pickup X positions
  const px = (mmFromBridge: number) => bridgeX + mm(mmFromBridge);

  // Pickguard area covers from just past the heel to past the neck pickup (Strat-style)
  const pgCenterX = (px(SPEC.pickupNeckFromBridge) + heelX) / 2 - mm(15);
  const pgLen = px(SPEC.pickupNeckFromBridge) - heelX + mm(60);
  const pgWid = mm(160);

  // Body face Z-coordinate (top of the body)
  const bodyTopZ = mm(SPEC.bodyThickness) / 2;
  // Fretboard top Z
  const fretboardTopZ = bodyTopZ + mm(SPEC.neckThickness);

  return (
    <group ref={groupRef}>
      {/* Body — glossy lacquer with clearcoat for that Sketchfab photoreal look */}
      <mesh geometry={bodyGeom} castShadow receiveShadow position={[0, 0, -mm(SPEC.bodyThickness) / 2]}>
        <meshPhysicalMaterial
          color={finish.body}
          metalness={finish.metalness}
          roughness={finish.roughness * 0.55}
          clearcoat={1}
          clearcoatRoughness={0.08}
          reflectivity={0.6}
          envMapIntensity={1.2}
        />
      </mesh>

      {/* Pickguard — 3-ply look, slight gloss */}
      <mesh position={[pgCenterX, 0, bodyTopZ + mm(0.5)]} castShadow>
        <boxGeometry args={[pgLen, pgWid, mm(2.2)]} />
        <meshPhysicalMaterial
          color={finish.pickguard}
          metalness={0.0}
          roughness={0.25}
          clearcoat={0.6}
          clearcoatRoughness={0.2}
          envMapIntensity={1}
        />
      </mesh>

      {/* Pickup covers — creamy white plastic with subtle gloss */}
      {[
        { distFromBridge: SPEC.pickupBridgeFromBridge, name: 'Bridge' },
        { distFromBridge: SPEC.pickupMiddleFromBridge, name: 'Middle' },
        { distFromBridge: SPEC.pickupNeckFromBridge, name: 'Neck' },
      ].map((p) => (
        <group key={p.name} position={[px(p.distFromBridge), 0, bodyTopZ + mm(5)]}>
          <mesh castShadow>
            <boxGeometry args={[mm(SPEC.pickupWidth), mm(SPEC.pickupLength), mm(7)]} />
            <meshPhysicalMaterial color="#f3ead3" roughness={0.4} clearcoat={0.4} clearcoatRoughness={0.3} />
          </mesh>
          {/* Pole pieces (6 magnets across the pickup length) */}
          {Array.from({ length: 6 }, (_, k) => {
            const y = -mm(SPEC.pickupLength) / 2 + mm(6) + (k * (mm(SPEC.pickupLength) - mm(12))) / 5;
            return (
              <mesh key={k} position={[0, y, mm(4)]}>
                <cylinderGeometry args={[mm(2.4), mm(2.4), mm(2), 16]} />
                <meshStandardMaterial color="#3a3530" metalness={0.85} roughness={0.35} />
              </mesh>
            );
          })}
        </group>
      ))}

      {/* Bridge plate (chromed) */}
      <mesh position={[bridgeX, 0, bodyTopZ + mm(2.5)]} castShadow>
        <boxGeometry args={[mm(30), mm(SPEC.bridgeStringSpacing) + mm(15), mm(5)]} />
        <meshPhysicalMaterial color="#e5e7eb" metalness={1} roughness={0.18} clearcoat={0.6} clearcoatRoughness={0.1} envMapIntensity={1.4} />
      </mesh>
      {/* Saddles */}
      {Array.from({ length: SPEC.numStrings }, (_, i) => {
        const y = -mm(SPEC.bridgeStringSpacing) / 2 + (i * mm(SPEC.bridgeStringSpacing)) / (SPEC.numStrings - 1);
        return (
          <mesh key={i} position={[bridgeX, y, bodyTopZ + mm(6)]} castShadow>
            <boxGeometry args={[mm(18), mm(5), mm(3)]} />
            <meshPhysicalMaterial color="#f1f5f9" metalness={1} roughness={0.12} clearcoat={0.7} clearcoatRoughness={0.08} envMapIntensity={1.5} />
          </mesh>
        );
      })}

      {/* Volume + 2 Tone knobs (cream Strat-style) */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[heelX - mm(180) + i * mm(25), -mm(70) - i * mm(8), bodyTopZ + mm(SPEC.knobHeight) / 2]} castShadow>
          <cylinderGeometry args={[mm(SPEC.knobDiameter) / 2, mm(SPEC.knobDiameter) / 2 * 0.9, mm(SPEC.knobHeight), 32]} />
          <meshPhysicalMaterial color="#f3ead3" roughness={0.3} clearcoat={0.5} clearcoatRoughness={0.2} />
        </mesh>
      ))}

      {/* 5-way pickup selector */}
      <mesh position={[heelX - mm(220), -mm(40), bodyTopZ + mm(8)]} rotation={[0, 0, 0.5]} castShadow>
        <cylinderGeometry args={[mm(2), mm(2), mm(22), 12]} />
        <meshPhysicalMaterial color="#f3ead3" roughness={0.3} clearcoat={0.5} clearcoatRoughness={0.2} />
      </mesh>

      {/* Output jack */}
      <mesh position={[heelX - mm(150), -mm(SPEC.bodyWidth) / 2 + mm(15), bodyTopZ + mm(2)]} castShadow>
        <cylinderGeometry args={[mm(9), mm(9), mm(8), 24]} />
        <meshPhysicalMaterial color="#9ca3af" metalness={1} roughness={0.25} clearcoat={0.4} />
      </mesh>


      {/* Neck (tapered, with curved fretboard top showing radius) */}
      {(() => {
        // Build neck as a tapered box. Wider at heel, narrower at nut.
        const heelY = mm(SPEC.neckWidthAt12Fret) / 2 + mm(2);
        const nutY = mm(SPEC.nutWidth) / 2;
        const neckLen = nutX - heelX;
        const thickness = mm(SPEC.neckThickness);
        // Custom geometry — top + bottom + 4 sides (8 verts, 12 tris)
        const positions = new Float32Array([
          // bottom face (z=0)
          0, -heelY, 0,    0, heelY, 0,    neckLen, nutY, 0,
          0, -heelY, 0,    neckLen, nutY, 0,    neckLen, -nutY, 0,
          // top face (z=thickness)
          0, -heelY, thickness,    neckLen, -nutY, thickness,    neckLen, nutY, thickness,
          0, -heelY, thickness,    neckLen, nutY, thickness,    0, heelY, thickness,
          // -Y side (treble)
          0, -heelY, 0,    neckLen, -nutY, 0,    neckLen, -nutY, thickness,
          0, -heelY, 0,    neckLen, -nutY, thickness,    0, -heelY, thickness,
          // +Y side (bass)
          0, heelY, 0,    0, heelY, thickness,    neckLen, nutY, thickness,
          0, heelY, 0,    neckLen, nutY, thickness,    neckLen, nutY, 0,
          // heel end (-X)
          0, -heelY, 0,    0, -heelY, thickness,    0, heelY, thickness,
          0, -heelY, 0,    0, heelY, thickness,    0, heelY, 0,
          // nut end (+X)
          neckLen, -nutY, 0,    neckLen, nutY, 0,    neckLen, nutY, thickness,
          neckLen, -nutY, 0,    neckLen, nutY, thickness,    neckLen, -nutY, thickness,
        ]);
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geom.computeVertexNormals();
        return (
          <mesh geometry={geom} position={[heelX, 0, bodyTopZ]} castShadow>
            <meshPhysicalMaterial color="#d8b07a" roughness={0.55} clearcoat={0.35} clearcoatRoughness={0.4} />
          </mesh>
        );
      })()}

      {/* Fretboard crown (visualizes 9.5" radius as a slight curve along the fingerboard) */}
      {(() => {
        const lengthSegs = 30;
        const widthSegs = 12;
        const positions: number[] = [];
        const indices: number[] = [];
        const r = mm(SPEC.fretboardRadius);
        const startX = heelX;
        const endX = nutX;
        for (let i = 0; i <= lengthSegs; i++) {
          const t = i / lengthSegs; // 0..1, heel→nut
          const x = startX + (endX - startX) * t;
          const halfW = mm(SPEC.neckWidthAt12Fret) / 2 * (1 - t) + mm(SPEC.nutWidth) / 2 * t + mm(0.5);
          for (let j = 0; j <= widthSegs; j++) {
            const u = j / widthSegs;
            const y = -halfW + 2 * halfW * u;
            // Crown — circle of radius r centered below fretboard, the top arc curves up by ~(r - sqrt(r² - y²))
            const crown = r - Math.sqrt(r * r - y * y);
            const z = fretboardTopZ + crown;
            positions.push(x, y, z);
          }
        }
        const stride = widthSegs + 1;
        for (let i = 0; i < lengthSegs; i++) {
          for (let j = 0; j < widthSegs; j++) {
            const a = i * stride + j;
            const b = a + 1;
            const c = a + stride;
            const d = c + 1;
            indices.push(a, c, b, b, c, d);
          }
        }
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geom.setIndex(indices);
        geom.computeVertexNormals();
        return (
          <mesh geometry={geom} castShadow>
            <meshPhysicalMaterial color="#3a1d0a" roughness={0.6} clearcoat={0.5} clearcoatRoughness={0.35} envMapIntensity={0.9} />
          </mesh>
        );
      })()}

      {/* Frets — bright nickel-silver */}
      {Array.from({ length: SPEC.numFrets }, (_, i) => {
        const fretNum = i + 1;
        const distFromNut = SPEC.scaleLength * (1 - Math.pow(2, -fretNum / 12));
        const fretX = nutX - mm(distFromNut);
        const t = (fretX - heelX) / (nutX - heelX); // 0 at heel, 1 at nut
        const halfW = mm(SPEC.neckWidthAt12Fret) / 2 * (1 - t) + mm(SPEC.nutWidth) / 2 * t;
        return (
          <mesh key={i} position={[fretX, 0, fretboardTopZ + mm(0.8)]} castShadow>
            <boxGeometry args={[mm(1.3), halfW * 2, mm(1.2)]} />
            <meshPhysicalMaterial color="#e2e8f0" metalness={1} roughness={0.08} clearcoat={0.7} clearcoatRoughness={0.05} envMapIntensity={1.6} />
          </mesh>
        );
      })}

      {/* Nut — bone */}
      <mesh position={[nutX, 0, fretboardTopZ + mm(2)]} castShadow>
        <boxGeometry args={[mm(4.5), mm(SPEC.nutWidth), mm(3.5)]} />
        <meshPhysicalMaterial color="#f5f0dc" roughness={0.45} clearcoat={0.3} clearcoatRoughness={0.4} />
      </mesh>

      {/* Position dot inlays at frets 3, 5, 7, 9, 12 (double), 15, 17, 19, 21 */}
      {[3, 5, 7, 9, 15, 17, 19, 21].map((n) => {
        const dist = SPEC.scaleLength * (1 - Math.pow(2, -n / 12));
        const dist0 = SPEC.scaleLength * (1 - Math.pow(2, -(n - 1) / 12));
        const midX = nutX - mm((dist + dist0) / 2);
        return (
          <mesh key={n} position={[midX, 0, fretboardTopZ + mm(0.25)]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[mm(2.5), mm(2.5), mm(0.5), 24]} />
            <meshPhysicalMaterial color="#fafafa" roughness={0.35} clearcoat={0.5} clearcoatRoughness={0.2} />
          </mesh>
        );
      })}
      {/* 12th-fret double dots */}
      {[-mm(14), mm(14)].map((y) => {
        const dist = SPEC.scaleLength * (1 - Math.pow(2, -12 / 12));
        const dist0 = SPEC.scaleLength * (1 - Math.pow(2, -11 / 12));
        const midX = nutX - mm((dist + dist0) / 2);
        return (
          <mesh key={y} position={[midX, y, fretboardTopZ + mm(0.25)]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[mm(2.5), mm(2.5), mm(0.5), 24]} />
            <meshPhysicalMaterial color="#fafafa" roughness={0.35} clearcoat={0.5} clearcoatRoughness={0.2} />
          </mesh>
        );
      })}

      {/* Headstock — matched maple, slight back-tilt */}
      <group position={[nutX, 0, fretboardTopZ - mm(7)]} rotation={[0, -0.13, 0]}>
        <mesh geometry={headstockGeom} castShadow>
          <meshPhysicalMaterial color="#d8b07a" roughness={0.55} clearcoat={0.45} clearcoatRoughness={0.3} envMapIntensity={1} />
        </mesh>
        {/* Tuning machines — bushing on top, post + button on the back-side */}
        {Array.from({ length: 6 }, (_, i) => (
          <group key={i} position={[mm(28) + i * mm(22), 0, mm(15)]}>
            {/* Bushing on the face */}
            <mesh castShadow>
              <cylinderGeometry args={[mm(5), mm(5), mm(4), 24]} />
              <meshPhysicalMaterial color="#e5e7eb" metalness={1} roughness={0.18} clearcoat={0.6} clearcoatRoughness={0.1} envMapIntensity={1.5} />
            </mesh>
            {/* Post */}
            <mesh position={[0, 0, -mm(8)]} castShadow>
              <cylinderGeometry args={[mm(3), mm(3), mm(14), 20]} />
              <meshPhysicalMaterial color="#cbd5e1" metalness={1} roughness={0.22} clearcoat={0.5} envMapIntensity={1.4} />
            </mesh>
          </group>
        ))}
      </group>


      {/* Strings — each string traces from bridge saddle to nut, with action visible.
          String index: 0 = high E (treble, -Y), 5 = low E (bass, +Y). */}
      {Array.from({ length: SPEC.numStrings }, (_, i) => {
        // Treble side (i=0) → -Y; bass side (i=5) → +Y
        const idx = SPEC.numStrings - 1 - i; // 5..0 → reverse so i=0 is at -Y
        const tBridge = -mm(SPEC.bridgeStringSpacing) / 2 + (idx * mm(SPEC.bridgeStringSpacing)) / (SPEC.numStrings - 1);
        const tNut = -mm(SPEC.nutStringSpacing) / 2 + (idx * mm(SPEC.nutStringSpacing)) / (SPEC.numStrings - 1);

        // Action lookup — interpolate between treble (i=0, idx=5) and bass (i=5, idx=0)
        const isTreble = i === 0;
        const isBass = i === SPEC.numStrings - 1;
        const u = i / (SPEC.numStrings - 1); // 0..1 across strings
        const lerp = (a: number, b: number) => a * (1 - u) + b * u;
        const aNut = lerp(SPEC.actionNut1, SPEC.actionNut6);
        const a12 = lerp(SPEC.action12_1, SPEC.action12_6);
        const aLast = lerp(SPEC.actionLast1, SPEC.actionLast6);

        // String passes over each fret with a small gap. Visualize the gap exaggerated by ACTION_VIS.
        const stringStartZ = bodyTopZ + mm(8);                                   // bridge saddle top
        const stringNutZ = fretboardTopZ + mm(2 + aNut) * ACTION_VIS / ACTION_VIS + mm(aNut * (ACTION_VIS - 1));
        // Above is needlessly complex — simpler:
        const nutTopZ = fretboardTopZ + mm(3.5);
        const stringNutZSimple = nutTopZ + mm(aNut * ACTION_VIS / 10);
        const radius = 0.012 + idx * 0.006;

        // Curve points (bridge → 12th fret → last fret → nut). Slight upward curve toward nut due to action delta.
        const at12Z = fretboardTopZ + mm(2) + mm(a12 * ACTION_VIS / 10);
        const atLastZ = fretboardTopZ + mm(2) + mm(aLast * ACTION_VIS / 10);
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(bridgeX, tBridge, stringStartZ),
          new THREE.Vector3(lastFretX, (tBridge + tNut) * 0.18 + tBridge * 0.82, atLastZ),
          new THREE.Vector3(fret12X, (tBridge + tNut) * 0.5, at12Z),
          new THREE.Vector3(nutX, tNut, stringNutZSimple),
        ]);
        return (
          <mesh key={i}>
            <tubeGeometry args={[curve, 36, radius, 8, false]} />
            <meshStandardMaterial color={i < 3 ? '#fbbf24' : '#9ca3af'} metalness={0.95} roughness={0.15} />
          </mesh>
        );
      })}

      {/* ============================== */}
      {/* String-action callouts (always shown when toggled) */}
      {/* ============================== */}
      {showAction && (() => {
        // Treble (high E, i=0, idx=5) is at -Y end; bass (low E, idx=0) is at +Y end
        const trebleY = mm(SPEC.bridgeStringSpacing) / 2;     // bass side actually... wait
        // Re-derive: in string loop, i=0 has idx=5, tBridge = -spacing/2 + 5*spacing/5 = +spacing/2
        // So i=0 (treble in label) ends up at +Y. Let me re-check.
        // Actually I want: treble side is HIGH E, which is the THIN string, played CLOSEST to floor when guitar is held normally.
        // In standard view (looking at the front of a held guitar), high E (string 1) is at the bottom, low E (string 6) is at the top.
        // In my coord, +Y is upper horn (bass-side), -Y is lower bout (treble-side). So:
        //   string 1 (high E, treble) → -Y
        //   string 6 (low E, bass) → +Y
        // In my loop, i=0 maps to idx=5, which gives tBridge = +spacing/2 (i.e. +Y, BASS side)
        // That means i=0 in the loop is the BASS string! Let me re-label callouts accordingly.
        const trebleSideY = -mm(SPEC.bridgeStringSpacing) / 2; // -Y, where idx=0 sits, low E... hmm
        // Forget the confusion. Pick the two extreme strings by idx, label as bass/treble:
        // idx=0 → tBridge = -spacing/2  → call this "treble row (high E)"
        // idx=5 → tBridge = +spacing/2  → call this "bass row (low E)"
        const trebleStringY_bridge = -mm(SPEC.bridgeStringSpacing) / 2;
        const bassStringY_bridge   = +mm(SPEC.bridgeStringSpacing) / 2;

        // Y at fret positions linearly interpolates
        const trebleY_at12 = trebleStringY_bridge * 0.5; // closer to centerline mid-neck
        const bassY_at12   = bassStringY_bridge * 0.5;
        const trebleY_atLast = trebleStringY_bridge * 0.7;
        const bassY_atLast   = bassStringY_bridge * 0.7;
        const trebleY_atNut = -mm(SPEC.nutStringSpacing) / 2;
        const bassY_atNut   = +mm(SPEC.nutStringSpacing) / 2;

        const fretTopZ = fretboardTopZ + mm(2); // top of a fret crown (approx)
        const nutTopZ = fretboardTopZ + mm(3.5);

        return (
          <>
            {/* Bass side — at 1st fret, 12th fret, last fret */}
            <ActionCallout
              fretPos={[nutX - mm(SPEC.scaleLength * (1 - Math.pow(2, -1 / 12))) - mm(2), bassY_atNut, fretTopZ]}
              stringHeightVis={mm(SPEC.actionNut6 * ACTION_VIS)}
              realMm={SPEC.actionNut6}
              label="Action @ 1st (bass)"
            />
            <ActionCallout
              fretPos={[fret12X - mm(2), bassY_at12, fretTopZ]}
              stringHeightVis={mm(SPEC.action12_6 * ACTION_VIS)}
              realMm={SPEC.action12_6}
              label="Action @ 12th (bass)"
            />
            <ActionCallout
              fretPos={[lastFretX - mm(2), bassY_atLast, fretTopZ]}
              stringHeightVis={mm(SPEC.actionLast6 * ACTION_VIS)}
              realMm={SPEC.actionLast6}
              label="Action @ 21st (bass)"
            />
            {/* Treble side — same three positions */}
            <ActionCallout
              fretPos={[nutX - mm(SPEC.scaleLength * (1 - Math.pow(2, -1 / 12))) - mm(2), trebleY_atNut, fretTopZ]}
              stringHeightVis={mm(SPEC.actionNut1 * ACTION_VIS)}
              realMm={SPEC.actionNut1}
              label="Action @ 1st (treble)"
            />
            <ActionCallout
              fretPos={[fret12X - mm(2), trebleY_at12, fretTopZ]}
              stringHeightVis={mm(SPEC.action12_1 * ACTION_VIS)}
              realMm={SPEC.action12_1}
              label="Action @ 12th (treble)"
            />
            <ActionCallout
              fretPos={[lastFretX - mm(2), trebleY_atLast, fretTopZ]}
              stringHeightVis={mm(SPEC.actionLast1 * ACTION_VIS)}
              realMm={SPEC.actionLast1}
              label="Action @ 21st (treble)"
            />
            {/* Visual exaggeration note */}
            <Html position={[0, mm(SPEC.bodyWidth) / 2 + 2.5, fretboardTopZ + 1.5]} center distanceFactor={20}>
              <div className="px-2 py-1 bg-red-950/95 text-[10px] font-mono text-red-200 rounded border border-red-700 whitespace-nowrap pointer-events-none">
                String heights shown {ACTION_VIS}× actual size for visibility · labels are real mm
              </div>
            </Html>
          </>
        );
      })()}

      {/* ============================== */}
      {/* Dimension annotations */}
      {/* ============================== */}
      {showAnnotations && (
        <>
          <MeasureLine
            from={[bridgeX, -mm(SPEC.bodyWidth) / 2 - 1.8, bodyTopZ + 0.3]}
            to={[nutX, -mm(SPEC.bodyWidth) / 2 - 1.8, bodyTopZ + 0.3]}
            label={`Scale: ${SPEC.scaleLength} mm`}
            color="#22d3ee"
          />
          <MeasureLine
            from={[-mm(SPEC.bodyLength) / 2, mm(SPEC.bodyWidth) / 2 + 1.2, 0]}
            to={[mm(SPEC.bodyLength) / 2, mm(SPEC.bodyWidth) / 2 + 1.2, 0]}
            label={`Body L: ${SPEC.bodyLength} mm`}
            color="#22d3ee"
          />
          <MeasureLine
            from={[-mm(SPEC.bodyLength) / 2 + 1.2, -mm(SPEC.bodyWidth) / 2, 0]}
            to={[-mm(SPEC.bodyLength) / 2 + 1.2, mm(SPEC.bodyWidth) / 2, 0]}
            label={`Body W: ${SPEC.bodyWidth} mm`}
            color="#22d3ee"
          />
          <MeasureLine
            from={[nutX, -mm(SPEC.nutWidth) / 2, fretboardTopZ + 1.5]}
            to={[nutX, mm(SPEC.nutWidth) / 2, fretboardTopZ + 1.5]}
            label={`Nut: ${SPEC.nutWidth} mm`}
            color="#a78bfa"
          />
          <MeasureLine
            from={[bridgeX, -mm(SPEC.bridgeStringSpacing) / 2, bodyTopZ + 1.5]}
            to={[bridgeX, mm(SPEC.bridgeStringSpacing) / 2, bodyTopZ + 1.5]}
            label={`Bridge spacing: ${SPEC.bridgeStringSpacing} mm`}
            color="#a78bfa"
          />
          <MeasureLine
            from={[-mm(SPEC.bodyLength) / 2 + 0.5, -mm(SPEC.bodyWidth) / 2 - 1.8, -mm(SPEC.bodyThickness)]}
            to={[-mm(SPEC.bodyLength) / 2 + 0.5, -mm(SPEC.bodyWidth) / 2 - 1.8, 0]}
            label={`Thickness: ${SPEC.bodyThickness} mm`}
            color="#22d3ee"
          />
          <PointLabel position={[px(SPEC.pickupBridgeFromBridge), -mm(SPEC.bridgeStringSpacing) / 2 - 0.5, bodyTopZ + 0.5]} label={`Bridge PU @ ${SPEC.pickupBridgeFromBridge} mm`} />
          <PointLabel position={[px(SPEC.pickupMiddleFromBridge), -mm(SPEC.bridgeStringSpacing) / 2 - 0.5, bodyTopZ + 0.5]} label={`Middle PU @ ${SPEC.pickupMiddleFromBridge} mm`} />
          <PointLabel position={[px(SPEC.pickupNeckFromBridge), -mm(SPEC.bridgeStringSpacing) / 2 - 0.5, bodyTopZ + 0.5]} label={`Neck PU @ ${SPEC.pickupNeckFromBridge} mm`} />
          <PointLabel position={[nutX, mm(SPEC.nutWidth) / 2 + 0.5, fretboardTopZ + 0.5]} label={`Radius: ${SPEC.fretboardRadius} mm`} color="#34d399" />
          <PointLabel position={[heelX + 0.4, mm(SPEC.neckWidthAt12Fret) / 2 + 0.5, fretboardTopZ + 0.5]} label={`${SPEC.numFrets} Frets`} color="#34d399" />
        </>
      )}
    </group>
  );
}

function AutoRotate({ enabled }: { enabled: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (enabled && ref.current) ref.current.rotation.z += dt * 0.15;
  });
  return null;
}

export function StratAnatomy3D() {
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [showAction, setShowAction] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [finish, setFinish] = useState<Finish>(FINISHES[0]);

  return (
    <div className="w-full">
      {/* Toggle row */}
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={() => setShowAnnotations((v) => !v)}
          className={`px-3 py-1.5 rounded-md text-xs font-mono border transition-all ${
            showAnnotations
              ? 'bg-cyan-500/25 border-cyan-400/60 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.25)]'
              : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400/60 hover:bg-cyan-500/20'
          }`}
        >
          {showAnnotations ? '◉' : '○'} Dimensions
        </button>
        <button
          onClick={() => setShowAction((v) => !v)}
          className={`px-3 py-1.5 rounded-md text-xs font-mono border transition-all ${
            showAction
              ? 'bg-red-500/25 border-red-400/60 text-red-200 shadow-[0_0_12px_rgba(239,68,68,0.25)]'
              : 'bg-red-500/10 border-red-500/30 text-red-400/60 hover:bg-red-500/20'
          }`}
        >
          {showAction ? '◉' : '○'} String heights (action)
        </button>
        <button
          onClick={() => setAutoRotate((v) => !v)}
          className={`px-3 py-1.5 rounded-md text-xs font-mono border transition-all ${
            autoRotate
              ? 'bg-amber-500/25 border-amber-400/60 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.25)]'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400/60 hover:bg-amber-500/20'
          }`}
        >
          {autoRotate ? '◉' : '○'} Auto-rotate
        </button>
        <span className="text-[10px] text-muted-foreground self-center ml-auto font-mono hidden md:block">
          Drag · Scroll · Right-drag
        </span>
      </div>

      {/* Finish picker */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-display">Finish</span>
        {FINISHES.map((f) => (
          <button
            key={f.id}
            onClick={() => setFinish(f)}
            title={f.name}
            className={`relative w-7 h-7 rounded-full border-2 transition-all ${
              finish.id === f.id
                ? 'border-foreground scale-110 shadow-lg'
                : 'border-border/60 hover:scale-105 hover:border-foreground/60'
            }`}
            style={{ backgroundColor: f.body }}
            aria-label={f.name}
          >
            {finish.id === f.id && (
              <span className="absolute inset-0 rounded-full ring-2 ring-primary/40 ring-offset-2 ring-offset-background pointer-events-none" />
            )}
          </button>
        ))}
        <span className="text-[11px] font-mono text-foreground/80 ml-1">{finish.name}</span>
      </div>

      <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-900 border border-border shadow-inner relative">
        {/* Subtle vignette overlay */}
        <div className="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.4)_100%)]" />
        <Canvas shadows camera={{ position: [10, -25, 18], fov: 35 }} dpr={[1, 2]} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
          {/* 3-point lighting setup */}
          <ambientLight intensity={0.35} />
          {/* Key light — warm, top-front */}
          <directionalLight
            position={[12, 18, 22]}
            intensity={1.35}
            color="#fff5e0"
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-near={1}
            shadow-camera-far={80}
            shadow-camera-left={-25}
            shadow-camera-right={25}
            shadow-camera-top={25}
            shadow-camera-bottom={-25}
            shadow-bias={-0.0005}
          />
          {/* Fill — cool, opposite side */}
          <directionalLight position={[-18, -8, 10]} intensity={0.45} color="#9ec5ff" />
          {/* Rim — back-light to separate from background */}
          <directionalLight position={[0, 0, -20]} intensity={0.6} color="#c4b5fd" />
          {/* Subtle hemispheric to keep shadows from going pure black */}
          <hemisphereLight args={['#dbeafe', '#1e293b', 0.25]} />

          <Suspense fallback={null}>
            <Stratocaster showAnnotations={showAnnotations} showAction={showAction} finish={finish} />
            <AutoRotate enabled={autoRotate} />
            {/* Soft ground shadow */}
            <ContactShadows
              position={[0, 0, -mm(SPEC.bodyThickness) / 2 - 0.1]}
              opacity={0.45}
              scale={50}
              blur={2.4}
              far={4}
              resolution={512}
              rotation={[Math.PI / 2, 0, 0]}
              color="#000000"
            />
          </Suspense>

          {/* Subtle grid floor — fades toward edges with a custom material */}
          <mesh position={[0, 0, -2.5]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[30, 64]} />
            <meshBasicMaterial color="#0f172a" transparent opacity={0.6} />
          </mesh>
          <gridHelper args={[40, 20, '#475569', '#1e293b']} position={[0, 0, -2.45]} rotation={[Math.PI / 2, 0, 0]} />

          <OrbitControls makeDefault autoRotate={autoRotate} autoRotateSpeed={0.8} enableDamping dampingFactor={0.08} minDistance={10} maxDistance={50} target={[0, 0, 0]} />
        </Canvas>
      </div>

      {/* Spec table — METRIC */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono">
        {[
          ['Scale Length', `${SPEC.scaleLength} mm (25.5″)`],
          ['Body L × W × T', `${SPEC.bodyLength} × ${SPEC.bodyWidth} × ${SPEC.bodyThickness} mm`],
          ['Nut Width', `${SPEC.nutWidth} mm (1 11/16″)`],
          ['Fretboard Radius', `${SPEC.fretboardRadius} mm (9.5″)`],
          ['Frets', `${SPEC.numFrets}`],
          ['Bridge Spacing', `${SPEC.bridgeStringSpacing} mm`],
          ['Nut Spacing', `${SPEC.nutStringSpacing} mm`],
          ['Bridge PU', `${SPEC.pickupBridgeFromBridge} mm from bridge`],
          ['Middle PU', `${SPEC.pickupMiddleFromBridge} mm from bridge`],
          ['Neck PU', `${SPEC.pickupNeckFromBridge} mm from bridge`],
          ['Neck Thickness (1st)', `${SPEC.neckThickness} mm`],
          ['Neck Thickness (12th)', `${SPEC.neckThicknessAt12} mm`],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-2 px-2 py-1.5 rounded bg-card/40 border border-border/50">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-foreground font-semibold">{value}</span>
          </div>
        ))}
      </div>

      {/* String-height (action) reference table */}
      <div className="mt-3 rounded-lg border border-red-500/40 bg-red-950/20 p-3">
        <div className="text-[10px] uppercase tracking-wider text-red-300 font-display mb-2">
          String heights — Fender factory action
        </div>
        <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
          {[
            ['1st fret · treble (high E)', `${SPEC.actionNut1} mm`],
            ['1st fret · bass (low E)', `${SPEC.actionNut6} mm`],
            ['1st fret · spread', `${(SPEC.actionNut6 - SPEC.actionNut1).toFixed(2)} mm`],
            ['12th fret · treble (high E)', `${SPEC.action12_1} mm (4/64″)`],
            ['12th fret · bass (low E)', `${SPEC.action12_6} mm (5/64″)`],
            ['12th fret · spread', `${(SPEC.action12_6 - SPEC.action12_1).toFixed(2)} mm`],
            ['21st fret · treble (high E)', `${SPEC.actionLast1} mm`],
            ['21st fret · bass (low E)', `${SPEC.actionLast6} mm`],
            ['21st fret · spread', `${(SPEC.actionLast6 - SPEC.actionLast1).toFixed(2)} mm`],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-2 px-2 py-1.5 rounded bg-card/40 border border-border/40">
              <span className="text-muted-foreground">{label}</span>
              <span className="text-foreground font-semibold">{value}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 text-[10px] text-red-200/70 leading-relaxed">
          Measured at the fret crown to the bottom of the string. Treble (high-E) action is set lower than bass (low-E) because heavier strings vibrate in a wider arc and need more clearance. Heights in the 3D model are exaggerated {ACTION_VIS}× so the gap is visible — labels show real mm values.
        </div>
      </div>
    </div>
  );
}
