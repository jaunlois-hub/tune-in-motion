import { useState, useRef, useCallback, useEffect } from 'react';

export interface VoiceEffect {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: 'popular' | 'creative' | 'studio';
}

export const VOICE_EFFECTS: VoiceEffect[] = [
  { id: 'clean', name: 'Clean', icon: '🎤', description: 'No effects, natural voice', category: 'studio' },
  { id: 'reverb', name: 'Hall Reverb', icon: '🏛️', description: 'Concert hall ambiance', category: 'popular' },
  { id: 'echo', name: 'Echo', icon: '🔊', description: 'Repeating delay effect', category: 'popular' },
  { id: 'radio', name: 'Radio Voice', icon: '📻', description: 'AM/FM radio filter', category: 'creative' },
  { id: 'deep', name: 'Deep Voice', icon: '🎵', description: 'Lower pitch, deeper tone', category: 'creative' },
  { id: 'chipmunk', name: 'Chipmunk', icon: '🐿️', description: 'High-pitched fun voice', category: 'creative' },
  { id: 'robot', name: 'Robot', icon: '🤖', description: 'Robotic vocoder effect', category: 'creative' },
  { id: 'megaphone', name: 'Megaphone', icon: '📢', description: 'Distorted bullhorn', category: 'creative' },
  { id: 'cathedral', name: 'Cathedral', icon: '⛪', description: 'Huge ethereal reverb', category: 'popular' },
  { id: 'telephone', name: 'Telephone', icon: '📞', description: 'Vintage phone filter', category: 'creative' },
  { id: 'chorus', name: 'Chorus', icon: '👥', description: 'Doubled voice, thick sound', category: 'studio' },
  { id: 'warmth', name: 'Warm Vocal', icon: '🔥', description: 'Rich, warm tone boost', category: 'studio' },
  { id: 'airy', name: 'Airy Whisper', icon: '💨', description: 'Breathy, ethereal quality', category: 'studio' },
  { id: 'autotune', name: 'Auto-Tune', icon: '🎹', description: 'Pitch-corrected T-Pain style', category: 'popular' },
  { id: 'synthpad', name: 'Synth Pad', icon: '🎛️', description: 'Lush evolving pad texture', category: 'creative' },
  { id: 'vocoder', name: 'Vocoder', icon: '🔮', description: 'Classic synth vocoder sound', category: 'creative' },
  { id: 'bitcrush', name: 'Bitcrusher', icon: '👾', description: 'Lo-fi retro digital grit', category: 'creative' },
  { id: 'shimmer', name: 'Shimmer', icon: '✨', description: 'Bright octave-up reverb tail', category: 'studio' },
  { id: 'suboctave', name: 'Sub Octave', icon: '🌊', description: 'Deep sub-bass synth layer', category: 'studio' },
  { id: 'formant', name: 'Formant Shift', icon: '🗣️', description: 'Vowel-shifting alien voice', category: 'creative' },
  { id: 'granular', name: 'Granular', icon: '🌌', description: 'Glitchy frozen texture', category: 'creative' },
  { id: 'talkbox', name: 'Talk Box', icon: '🎸', description: 'Funky wah-synth voice', category: 'popular' },
];

export interface VocalRecording {
  id: string;
  blob: Blob;
  duration: number;
  effectId: string;
  createdAt: Date;
}

export function useVocalRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [activeEffect, setActiveEffect] = useState<string>('clean');
  const [recordings, setRecordings] = useState<VocalRecording[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const audioElsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const nodesRef = useRef<AudioNode[]>([]);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  const getOrCreateContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  const createImpulseResponse = useCallback((ctx: AudioContext, duration: number, decay: number) => {
    const len = ctx.sampleRate * duration;
    const impulse = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return impulse;
  }, []);

  const buildEffectChain = useCallback((ctx: AudioContext, source: AudioNode): AudioNode => {
    let current: AudioNode = source;
    nodesRef.current = [];

    const connect = (node: AudioNode) => {
      current.connect(node);
      nodesRef.current.push(node);
      current = node;
      return node;
    };

    switch (activeEffect) {
      case 'reverb': {
        const conv = ctx.createConvolver();
        conv.buffer = createImpulseResponse(ctx, 2.5, 2);
        const dry = ctx.createGain(); dry.gain.value = 0.6;
        const wet = ctx.createGain(); wet.gain.value = 0.4;
        const merger = ctx.createGain();
        source.connect(dry); dry.connect(merger);
        source.connect(conv); conv.connect(wet); wet.connect(merger);
        nodesRef.current.push(dry, conv, wet, merger);
        current = merger;
        break;
      }
      case 'echo': {
        const delay = ctx.createDelay(1);
        delay.delayTime.value = 0.35;
        const fb = ctx.createGain(); fb.gain.value = 0.45;
        const dry = ctx.createGain(); dry.gain.value = 0.7;
        const wet = ctx.createGain(); wet.gain.value = 0.5;
        const merger = ctx.createGain();
        source.connect(dry); dry.connect(merger);
        source.connect(delay); delay.connect(fb); fb.connect(delay);
        delay.connect(wet); wet.connect(merger);
        nodesRef.current.push(delay, fb, dry, wet, merger);
        current = merger;
        break;
      }
      case 'radio': {
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 500;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3000;
        const dist = ctx.createWaveShaper();
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) { const x = (i / 128) - 1; curve[i] = (Math.PI + 10) * x / (Math.PI + 10 * Math.abs(x)); }
        dist.curve = curve;
        connect(hp); connect(lp); connect(dist);
        break;
      }
      case 'deep': {
        // Pitch shift down using playbackRate on offline context isn't real-time friendly,
        // so we simulate with low-frequency boost + subtle distortion
        const lp = ctx.createBiquadFilter(); lp.type = 'lowshelf'; lp.frequency.value = 300; lp.gain.value = 12;
        const hp = ctx.createBiquadFilter(); hp.type = 'highshelf'; hp.frequency.value = 2000; hp.gain.value = -8;
        connect(lp); connect(hp);
        break;
      }
      case 'chipmunk': {
        const hp = ctx.createBiquadFilter(); hp.type = 'highshelf'; hp.frequency.value = 1000; hp.gain.value = 15;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowshelf'; lp.frequency.value = 300; lp.gain.value = -10;
        connect(hp); connect(lp);
        break;
      }
      case 'robot': {
        const osc = ctx.createOscillator(); osc.frequency.value = 50; osc.type = 'sawtooth';
        const oscGain = ctx.createGain(); oscGain.gain.value = 0.3;
        osc.connect(oscGain);
        osc.start();
        const merger = ctx.createGain();
        source.connect(merger);
        oscGain.connect(merger);
        const dist = ctx.createWaveShaper();
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) { const x = (i / 128) - 1; curve[i] = Math.sign(x) * Math.pow(Math.abs(x), 0.5); }
        dist.curve = curve;
        merger.connect(dist);
        nodesRef.current.push(osc, oscGain, merger, dist);
        current = dist;
        break;
      }
      case 'megaphone': {
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 800;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4000;
        const peak = ctx.createBiquadFilter(); peak.type = 'peaking'; peak.frequency.value = 2000; peak.gain.value = 15; peak.Q.value = 2;
        const dist = ctx.createWaveShaper();
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) { const x = (i / 128) - 1; curve[i] = Math.tanh(x * 3); }
        dist.curve = curve;
        const g = ctx.createGain(); g.gain.value = 2;
        connect(g); connect(hp); connect(lp); connect(peak); connect(dist);
        break;
      }
      case 'cathedral': {
        const conv = ctx.createConvolver();
        conv.buffer = createImpulseResponse(ctx, 5, 1.5);
        const dry = ctx.createGain(); dry.gain.value = 0.3;
        const wet = ctx.createGain(); wet.gain.value = 0.7;
        const merger = ctx.createGain();
        source.connect(dry); dry.connect(merger);
        source.connect(conv); conv.connect(wet); wet.connect(merger);
        nodesRef.current.push(dry, conv, wet, merger);
        current = merger;
        break;
      }
      case 'telephone': {
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 700;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3500;
        const peak = ctx.createBiquadFilter(); peak.type = 'peaking'; peak.frequency.value = 1800; peak.gain.value = 10; peak.Q.value = 5;
        connect(hp); connect(lp); connect(peak);
        break;
      }
      case 'chorus': {
        const delay1 = ctx.createDelay(); delay1.delayTime.value = 0.025;
        const delay2 = ctx.createDelay(); delay2.delayTime.value = 0.035;
        const lfo1 = ctx.createOscillator(); lfo1.frequency.value = 0.5;
        const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.7;
        const lfoGain1 = ctx.createGain(); lfoGain1.gain.value = 0.003;
        const lfoGain2 = ctx.createGain(); lfoGain2.gain.value = 0.004;
        lfo1.connect(lfoGain1); lfoGain1.connect(delay1.delayTime);
        lfo2.connect(lfoGain2); lfoGain2.connect(delay2.delayTime);
        lfo1.start(); lfo2.start();
        const merger = ctx.createGain();
        const dryG = ctx.createGain(); dryG.gain.value = 0.6;
        const wetG = ctx.createGain(); wetG.gain.value = 0.4;
        source.connect(dryG); dryG.connect(merger);
        source.connect(delay1); source.connect(delay2);
        delay1.connect(wetG); delay2.connect(wetG); wetG.connect(merger);
        nodesRef.current.push(delay1, delay2, lfo1, lfo2, lfoGain1, lfoGain2, merger, dryG, wetG);
        current = merger;
        break;
      }
      case 'warmth': {
        const ls = ctx.createBiquadFilter(); ls.type = 'lowshelf'; ls.frequency.value = 200; ls.gain.value = 6;
        const pk = ctx.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 800; pk.gain.value = 3; pk.Q.value = 1;
        const hs = ctx.createBiquadFilter(); hs.type = 'highshelf'; hs.frequency.value = 8000; hs.gain.value = -3;
        connect(ls); connect(pk); connect(hs);
        break;
      }
      case 'airy': {
        const hs = ctx.createBiquadFilter(); hs.type = 'highshelf'; hs.frequency.value = 4000; hs.gain.value = 10;
        const conv = ctx.createConvolver();
        conv.buffer = createImpulseResponse(ctx, 1.5, 3);
        const dry = ctx.createGain(); dry.gain.value = 0.5;
        const wet = ctx.createGain(); wet.gain.value = 0.5;
        const merger = ctx.createGain();
        source.connect(hs); hs.connect(dry); dry.connect(merger);
        hs.connect(conv); conv.connect(wet); wet.connect(merger);
        nodesRef.current.push(hs, conv, dry, wet, merger);
        current = merger;
        break;
      }
      case 'autotune': {
        // Simulate auto-tune with tight pitch quantization-like waveshaping + reverb
        const dist = ctx.createWaveShaper();
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) { const x = (i / 128) - 1; curve[i] = Math.round(x * 8) / 8; }
        dist.curve = curve;
        dist.oversample = '4x';
        const conv = ctx.createConvolver();
        conv.buffer = createImpulseResponse(ctx, 0.8, 4);
        const dry = ctx.createGain(); dry.gain.value = 0.7;
        const wet = ctx.createGain(); wet.gain.value = 0.3;
        const merger = ctx.createGain();
        source.connect(dist); dist.connect(dry); dry.connect(merger);
        dist.connect(conv); conv.connect(wet); wet.connect(merger);
        nodesRef.current.push(dist, conv, dry, wet, merger);
        current = merger;
        break;
      }
      case 'synthpad': {
        const lfo = ctx.createOscillator(); lfo.frequency.value = 0.3; lfo.type = 'sine';
        const lfoGain = ctx.createGain(); lfoGain.gain.value = 400;
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1200; bp.Q.value = 3;
        lfo.connect(lfoGain); lfoGain.connect(bp.frequency); lfo.start();
        const conv = ctx.createConvolver();
        conv.buffer = createImpulseResponse(ctx, 4, 1.2);
        const dry = ctx.createGain(); dry.gain.value = 0.3;
        const wet = ctx.createGain(); wet.gain.value = 0.7;
        const merger = ctx.createGain();
        source.connect(bp); bp.connect(dry); dry.connect(merger);
        bp.connect(conv); conv.connect(wet); wet.connect(merger);
        nodesRef.current.push(lfo, lfoGain, bp, conv, dry, wet, merger);
        current = merger;
        break;
      }
      case 'vocoder': {
        const bands = [200, 400, 800, 1600, 3200];
        const merger = ctx.createGain(); merger.gain.value = 1.5;
        bands.forEach(freq => {
          const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 8;
          const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = freq * 0.5; osc.start();
          const oscG = ctx.createGain(); oscG.gain.value = 0.08;
          const bpOut = ctx.createGain(); bpOut.gain.value = 0.4;
          source.connect(bp); bp.connect(bpOut); bpOut.connect(merger);
          osc.connect(oscG); oscG.connect(merger);
          nodesRef.current.push(bp, osc, oscG, bpOut);
        });
        nodesRef.current.push(merger);
        current = merger;
        break;
      }
      case 'bitcrush': {
        const dist = ctx.createWaveShaper();
        const curve = new Float32Array(256);
        const bits = 4;
        for (let i = 0; i < 256; i++) { const x = (i / 128) - 1; curve[i] = Math.round(x * Math.pow(2, bits)) / Math.pow(2, bits); }
        dist.curve = curve; dist.oversample = 'none';
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4000;
        connect(dist); connect(lp);
        break;
      }
      case 'shimmer': {
        const hs = ctx.createBiquadFilter(); hs.type = 'highshelf'; hs.frequency.value = 3000; hs.gain.value = 12;
        const conv = ctx.createConvolver();
        conv.buffer = createImpulseResponse(ctx, 4, 1.5);
        const dry = ctx.createGain(); dry.gain.value = 0.4;
        const wet = ctx.createGain(); wet.gain.value = 0.6;
        const merger = ctx.createGain();
        source.connect(dry); dry.connect(merger);
        source.connect(hs); hs.connect(conv); conv.connect(wet); wet.connect(merger);
        nodesRef.current.push(hs, conv, dry, wet, merger);
        current = merger;
        break;
      }
      case 'suboctave': {
        const ls = ctx.createBiquadFilter(); ls.type = 'lowshelf'; ls.frequency.value = 150; ls.gain.value = 18;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 250;
        const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = 60; osc.start();
        const oscG = ctx.createGain(); oscG.gain.value = 0.15;
        const merger = ctx.createGain();
        source.connect(ls); ls.connect(merger);
        source.connect(lp); lp.connect(merger);
        osc.connect(oscG); oscG.connect(merger);
        nodesRef.current.push(ls, lp, osc, oscG, merger);
        current = merger;
        break;
      }
      case 'formant': {
        const f1 = ctx.createBiquadFilter(); f1.type = 'peaking'; f1.frequency.value = 700; f1.gain.value = 15; f1.Q.value = 8;
        const f2 = ctx.createBiquadFilter(); f2.type = 'peaking'; f2.frequency.value = 1200; f2.gain.value = 12; f2.Q.value = 10;
        const f3 = ctx.createBiquadFilter(); f3.type = 'peaking'; f3.frequency.value = 2800; f3.gain.value = 8; f3.Q.value = 12;
        const lfo = ctx.createOscillator(); lfo.frequency.value = 0.8; lfo.start();
        const lfoG = ctx.createGain(); lfoG.gain.value = 300;
        lfo.connect(lfoG); lfoG.connect(f1.frequency); lfoG.connect(f2.frequency);
        connect(f1); connect(f2); connect(f3);
        nodesRef.current.push(lfo, lfoG);
        break;
      }
      case 'granular': {
        const delays: AudioNode[] = [];
        for (let i = 0; i < 4; i++) {
          const d = ctx.createDelay(0.1); d.delayTime.value = 0.01 + i * 0.015;
          const g = ctx.createGain(); g.gain.value = 0.3 - i * 0.05;
          const lfo = ctx.createOscillator(); lfo.frequency.value = 2 + i * 3; lfo.start();
          const lfoG = ctx.createGain(); lfoG.gain.value = 0.005;
          lfo.connect(lfoG); lfoG.connect(d.delayTime);
          delays.push(d, g, lfo, lfoG);
        }
        const merger = ctx.createGain();
        const dryG = ctx.createGain(); dryG.gain.value = 0.4;
        source.connect(dryG); dryG.connect(merger);
        for (let i = 0; i < 4; i++) {
          source.connect(delays[i * 4] as DelayNode);
          (delays[i * 4] as DelayNode).connect(delays[i * 4 + 1] as GainNode);
          (delays[i * 4 + 1] as GainNode).connect(merger);
        }
        nodesRef.current.push(...delays, merger, dryG);
        current = merger;
        break;
      }
      case 'talkbox': {
        const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 2; lfo.start();
        const lfoG = ctx.createGain(); lfoG.gain.value = 800;
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 5;
        lfo.connect(lfoG); lfoG.connect(bp.frequency);
        const pk = ctx.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 2500; pk.gain.value = 10; pk.Q.value = 3;
        const g = ctx.createGain(); g.gain.value = 1.5;
        connect(g); connect(bp); connect(pk);
        nodesRef.current.push(lfo, lfoG);
        break;
      }
      default:
        break;
    }

    return current;
  }, [activeEffect, createImpulseResponse]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, autoGainControl: false, noiseSuppression: false }
      });
      mediaStreamRef.current = stream;
      const ctx = getOrCreateContext();
      if (ctx.state === 'suspended') await ctx.resume();

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;
      const dest = ctx.createMediaStreamDestination();
      destRef.current = dest;

      const lastNode = buildEffectChain(ctx, source);
      lastNode.connect(dest);

      if (isMonitoring) {
        lastNode.connect(ctx.destination);
      }

      chunksRef.current = [];
      const mr = new MediaRecorder(dest.stream);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const dur = (Date.now() - startTimeRef.current) / 1000;
        setRecordings(prev => [...prev, {
          id: Date.now().toString(),
          blob,
          duration: dur,
          effectId: activeEffect,
          createdAt: new Date(),
        }]);
        // Cleanup
        stream.getTracks().forEach(t => t.stop());
        nodesRef.current.forEach(n => { try { n.disconnect(); } catch {} });
        sourceRef.current?.disconnect();
      };

      startTimeRef.current = Date.now();
      setRecordingDuration(0);
      timerRef.current = window.setInterval(() => {
        setRecordingDuration((Date.now() - startTimeRef.current) / 1000);
      }, 100);

      mr.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Vocal recording error:', err);
    }
  }, [activeEffect, isMonitoring, getOrCreateContext, buildEffectChain]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
  }, [isRecording]);

  const playRecording = useCallback((id: string) => {
    const rec = recordings.find(r => r.id === id);
    if (!rec) return;
    audioElsRef.current.forEach(a => { a.pause(); a.currentTime = 0; });
    let audio = audioElsRef.current.get(id);
    if (!audio) {
      audio = new Audio(URL.createObjectURL(rec.blob));
      audioElsRef.current.set(id, audio);
    }
    audio.play();
    setPlayingId(id);
    audio.onended = () => setPlayingId(null);
  }, [recordings]);

  const stopPlayback = useCallback((id: string) => {
    const a = audioElsRef.current.get(id);
    if (a) { a.pause(); a.currentTime = 0; }
    setPlayingId(null);
  }, []);

  const deleteRecording = useCallback((id: string) => {
    stopPlayback(id);
    audioElsRef.current.delete(id);
    setRecordings(prev => prev.filter(r => r.id !== id));
  }, [stopPlayback]);

  const exportRecording = useCallback((id: string) => {
    const rec = recordings.find(r => r.id === id);
    if (!rec) return;
    const url = URL.createObjectURL(rec.blob);
    const a = document.createElement('a');
    a.href = url; a.download = `vocal-${rec.effectId}-${rec.id}.webm`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [recordings]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      audioElsRef.current.forEach(a => a.pause());
    };
  }, []);

  return {
    isRecording, activeEffect, setActiveEffect, recordings, playingId,
    recordingDuration, isMonitoring, setIsMonitoring,
    startRecording, stopRecording, playRecording, stopPlayback,
    deleteRecording, exportRecording,
  };
}
