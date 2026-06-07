// Audio graph inspector — detects feedback loops in the live Web Audio graph.
//
// The Web Audio API offers no introspection of node connections, so we
// instrument every Delay/Gain/Filter created on the shared AudioContext and
// patch AudioNode.prototype.connect/disconnect (once, globally, guarded by a
// Symbol) to maintain an adjacency map.
//
// On each new edge, if the source or destination is a DelayNode we run a
// bounded DFS (depth ≤ 6) to see whether the delay's output can return to
// its own input through a path that includes at least one GainNode. If so,
// we report a FeedbackWarning to the diagnostics store. This is exactly the
// pattern (delay → lowpass → gain(~0.997) → delay) that caused our squelch
// bug; surfacing it makes regressions instantly visible.
//
// Limitations (intentional):
// - We do not patch OfflineAudioContext — the offline Karplus pluck render
//   is intentional and short-lived.
// - AudioParam targets are ignored; they can't form an audible signal cycle
//   on their own without a node edge.
// - disconnect() called without args drops all outgoing edges for that node
//   (matches Web Audio semantics).

import {
  currentFeature,
  reportFeedbackWarning,
  removeFeedbackWarningsForNodes,
  type FeedbackWarning,
} from '@/lib/audioDiagnostics';

type NodeKind = 'delay' | 'gain' | 'filter';

interface TrackedNode {
  id: number;
  kind: NodeKind;
  feature: string;
  ref: WeakRef<AudioNode>;
  // Read-on-demand accessors (some values change over time).
  getGain?: () => number;
  getDelayTime?: () => number;
}

const DIAG_ID = Symbol.for('lov-audio-diag-id');
const PROTO_PATCHED = Symbol.for('lov-audio-graph-patched');

const nodes = new Map<number, TrackedNode>();
// adjacency: srcId -> Set<dstId>
const edges = new Map<number, Set<number>>();
let nextId = 1;
const installedContexts = new WeakSet<AudioContext>();

interface TaggedNode extends AudioNode { [DIAG_ID]?: number }

function tag(node: AudioNode, kind: NodeKind): number {
  const tagged = node as TaggedNode;
  if (tagged[DIAG_ID]) return tagged[DIAG_ID]!;
  const id = nextId++;
  tagged[DIAG_ID] = id;
  const entry: TrackedNode = {
    id,
    kind,
    feature: currentFeature(),
    ref: new WeakRef(node),
  };
  if (kind === 'gain') entry.getGain = () => (node as GainNode).gain.value;
  if (kind === 'delay') entry.getDelayTime = () => (node as DelayNode).delayTime.value;
  nodes.set(id, entry);
  return id;
}

function addEdge(srcId: number, dstId: number) {
  let set = edges.get(srcId);
  if (!set) { set = new Set(); edges.set(srcId, set); }
  set.add(dstId);
}

function removeEdge(srcId: number, dstId?: number) {
  if (dstId === undefined) { edges.delete(srcId); return; }
  edges.get(srcId)?.delete(dstId);
}

/**
 * DFS from startId looking for a cycle back to startId. Returns the gainId
 * on the cycle (the loudest gain encountered) and the path length, or null
 * if no qualifying cycle exists.
 */
function findFeedbackCycle(startId: number): { gainId: number; pathLen: number } | null {
  const MAX_DEPTH = 6;
  const visited = new Set<number>();
  type Frame = { id: number; depth: number; gainOnPath: number | null };
  const stack: Frame[] = [{ id: startId, depth: 0, gainOnPath: null }];
  let best: { gainId: number; pathLen: number } | null = null;

  while (stack.length) {
    const { id, depth, gainOnPath } = stack.pop()!;
    if (depth > 0 && id === startId) {
      if (gainOnPath !== null) {
        if (!best || depth < best.pathLen) best = { gainId: gainOnPath, pathLen: depth };
      }
      continue;
    }
    if (depth >= MAX_DEPTH) continue;
    if (depth > 0 && visited.has(id)) continue;
    if (depth > 0) visited.add(id);
    const outs = edges.get(id);
    if (!outs) continue;
    const node = nodes.get(id);
    const nextGain = node?.kind === 'gain' ? id : gainOnPath;
    for (const dst of outs) {
      stack.push({ id: dst, depth: depth + 1, gainOnPath: nextGain });
    }
  }
  return best;
}

function checkNewEdge(srcId: number, dstId: number) {
  const src = nodes.get(srcId);
  const dst = nodes.get(dstId);
  // Only investigate if a delay is part of the edge.
  const delayCandidates: number[] = [];
  if (src?.kind === 'delay') delayCandidates.push(srcId);
  if (dst?.kind === 'delay') delayCandidates.push(dstId);
  if (delayCandidates.length === 0) return;

  for (const delayId of delayCandidates) {
    const cycle = findFeedbackCycle(delayId);
    if (!cycle) continue;
    const delayNode = nodes.get(delayId);
    const gainNode = nodes.get(cycle.gainId);
    if (!delayNode || !gainNode) continue;
    const w: FeedbackWarning = {
      id: `fb-${delayId}-${cycle.gainId}`,
      feature: delayNode.feature || gainNode.feature || 'unknown',
      delayId,
      gainId: cycle.gainId,
      gainValue: gainNode.getGain?.() ?? NaN,
      delayTimeSec: delayNode.getDelayTime?.() ?? NaN,
      pathLength: cycle.pathLen,
      detectedAt: performance.now(),
    };
    reportFeedbackWarning(w);
  }
}

function getId(node: AudioNode | AudioParam): number | undefined {
  return (node as TaggedNode)[DIAG_ID];
}

function patchPrototype() {
  const proto = AudioNode.prototype as AudioNode & { [PROTO_PATCHED]?: boolean };
  if (proto[PROTO_PATCHED]) return;
  proto[PROTO_PATCHED] = true;

  const origConnect = AudioNode.prototype.connect;
  const origDisconnect = AudioNode.prototype.disconnect;

  // Preserve full overload surface by using rest args + apply.
  AudioNode.prototype.connect = function patchedConnect(this: AudioNode, ...args: unknown[]) {
    const result = (origConnect as (...a: unknown[]) => AudioNode | void).apply(this, args);
    try {
      const dst = args[0];
      // Only track AudioNode -> AudioNode edges; AudioParam targets can't audibly close a loop.
      if (dst && typeof dst === 'object' && 'context' in (dst as object) && !('value' in (dst as object))) {
        const srcId = getId(this);
        const dstId = getId(dst as AudioNode);
        if (srcId && dstId) {
          addEdge(srcId, dstId);
          checkNewEdge(srcId, dstId);
        }
      }
    } catch (err) { console.warn('[graph-inspector] connect tracking failed', err); }
    return result as AudioNode;
  } as typeof AudioNode.prototype.connect;

  AudioNode.prototype.disconnect = function patchedDisconnect(this: AudioNode, ...args: unknown[]) {
    const result = (origDisconnect as (...a: unknown[]) => void).apply(this, args);
    try {
      const srcId = getId(this);
      if (srcId) {
        if (args.length === 0) {
          removeEdge(srcId);
        } else {
          const dst = args[0];
          const dstId = dst && typeof dst === 'object' ? getId(dst as AudioNode) : undefined;
          if (dstId) removeEdge(srcId, dstId);
        }
      }
    } catch (err) { console.warn('[graph-inspector] disconnect tracking failed', err); }
    return result;
  } as typeof AudioNode.prototype.disconnect;
}

/** Sweep dead WeakRefs and drop their edges + related warnings. */
function sweep() {
  const dead: number[] = [];
  for (const [id, n] of nodes) {
    if (!n.ref.deref()) dead.push(id);
  }
  if (!dead.length) return;
  for (const id of dead) {
    nodes.delete(id);
    edges.delete(id);
    for (const set of edges.values()) set.delete(id);
  }
  removeFeedbackWarningsForNodes(dead);
}

/** Public: install on the shared AudioContext. Idempotent per context. */
export function installGraphInspector(ctx: AudioContext): void {
  if (installedContexts.has(ctx)) return;
  installedContexts.add(ctx);
  patchPrototype();

  const origDelay = ctx.createDelay.bind(ctx);
  const origGain = ctx.createGain.bind(ctx);
  const origFilter = ctx.createBiquadFilter.bind(ctx);

  (ctx as AudioContext).createDelay = function (maxDelayTime?: number): DelayNode {
    const n = maxDelayTime !== undefined ? origDelay(maxDelayTime) : origDelay();
    tag(n, 'delay');
    return n;
  };
  (ctx as AudioContext).createGain = function (): GainNode {
    const n = origGain();
    tag(n, 'gain');
    return n;
  };
  (ctx as AudioContext).createBiquadFilter = function (): BiquadFilterNode {
    const n = origFilter();
    tag(n, 'filter');
    return n;
  };

  setInterval(sweep, 2000);
}
