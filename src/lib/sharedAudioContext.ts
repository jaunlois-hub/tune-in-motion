// Centralized AudioContext.
//
// Browsers cap concurrent AudioContexts (~6 on Chrome). Beyond that, new
// contexts are silently put in 'interrupted' state, output garbage, or cause
// loud distortion across the page. Every audible feature in the app should
// share this single context.
//
// The context is intentionally never closed — closing it would break every
// other feature still holding a reference.

import { registerAudioContext } from '@/hooks/useAudioDevices';

let shared: AudioContext | null = null;

/**
 * Lazily create the shared AudioContext, resume it (so it produces sound after
 * a user gesture), and ensure it's tracked for output-device routing.
 *
 * Safe to call from anywhere; subsequent calls return the same instance.
 */
export async function getSharedAudioContext(): Promise<AudioContext> {
  if (!shared || shared.state === 'closed') {
    shared = new AudioContext();
    registerAudioContext(shared);
  }
  if (shared.state === 'suspended') {
    try { await shared.resume(); } catch (err) { console.warn('Shared AudioContext resume failed', err); }
  }
  return shared;
}

/**
 * Synchronous accessor — returns the shared context if it exists, otherwise
 * creates one immediately. Use this when you're inside a synchronous user
 * gesture and can't await. The returned context may be 'suspended'; call
 * .resume() if you need it running right away.
 */
export function getSharedAudioContextSync(): AudioContext {
  if (!shared || shared.state === 'closed') {
    shared = new AudioContext();
    registerAudioContext(shared);
  }
  return shared;
}
