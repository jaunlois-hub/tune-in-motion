import { useState, useRef, useCallback, useEffect } from 'react';
import { buildAudioConstraints } from './useAudioDevices';

export interface Loop {
  id: string;
  audioBlob: Blob;
  duration: number;
  createdAt: Date;
  trimStart: number;
  trimEnd: number;
}

export function useLoopRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [loops, setLoops] = useState<Loop[]>([]);
  const [playingLoopId, setPlayingLoopId] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const recordingStartRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(buildAudioConstraints());
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const dur = (Date.now() - recordingStartRef.current) / 1000;
        setLoops((prev) => [...prev, { id: Date.now().toString(), audioBlob: blob, duration: dur, createdAt: new Date(), trimStart: 0, trimEnd: dur }]);
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      };
      recordingStartRef.current = Date.now();
      setRecordingDuration(0);
      timerRef.current = window.setInterval(() => { setRecordingDuration((Date.now() - recordingStartRef.current) / 1000); }, 100);
      mr.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start loop recording', err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
  }, [isRecording]);

  const playLoop = useCallback((loopId: string, loopPlayback = false) => {
    const loop = loops.find((l) => l.id === loopId);
    if (!loop) return;
    audioElementsRef.current.forEach((a) => { a.pause(); a.currentTime = 0; });
    let audio = audioElementsRef.current.get(loopId);
    if (!audio) { audio = new Audio(URL.createObjectURL(loop.audioBlob)); audioElementsRef.current.set(loopId, audio); }
    audio.currentTime = loop.trimStart;
    audio.loop = false;
    audio.ontimeupdate = () => {
      if (audio && audio.currentTime >= loop.trimEnd) {
        if (loopPlayback) { audio.currentTime = loop.trimStart; }
        else { audio.pause(); audio.currentTime = loop.trimStart; setPlayingLoopId(null); }
      }
    };
    audio.play();
    setPlayingLoopId(loopId);
    audio.onended = () => setPlayingLoopId(null);
  }, [loops]);

  const updateLoopTrim = useCallback((loopId: string, trimStart: number, trimEnd: number) => {
    setLoops((prev) => prev.map((l) => l.id === loopId ? { ...l, trimStart, trimEnd } : l));
  }, []);

  const stopLoop = useCallback((loopId: string) => {
    const a = audioElementsRef.current.get(loopId);
    if (a) { a.pause(); a.currentTime = 0; }
    setPlayingLoopId(null);
  }, []);

  const deleteLoop = useCallback((loopId: string) => {
    stopLoop(loopId);
    audioElementsRef.current.delete(loopId);
    setLoops((prev) => prev.filter((l) => l.id !== loopId));
  }, [stopLoop]);

  const exportLoop = useCallback((loopId: string) => {
    const loop = loops.find((l) => l.id === loopId);
    if (!loop) return;
    const url = URL.createObjectURL(loop.audioBlob);
    const a = document.createElement('a');
    a.href = url; a.download = `loop-${loop.id}.webm`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [loops]);

  // Snapshot audio elements at effect creation so the cleanup doesn't read a
  // stale ref (React Hooks lint rule). Also stop the mic stream + recorder if
  // the component unmounts while recording, otherwise the mic LED stays on.
  useEffect(() => {
    const audios = audioElementsRef.current;
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      audios.forEach((a) => a.pause());
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch { /* recorder already stopped */ }
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    };
  }, []);

  return { isRecording, loops, playingLoopId, recordingDuration, startRecording, stopRecording, playLoop, stopLoop, deleteLoop, updateLoopTrim, exportLoop };
}
