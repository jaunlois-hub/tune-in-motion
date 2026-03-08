import { useState, useCallback, useRef, useEffect } from 'react';

export interface TuningEntry {
  id: string;
  timestamp: number;
  note: string;
  octave: number;
  cents: number;
  frequency: number;
  targetFrequency: number;
  tuningName: string;
  accuracy: 'perfect' | 'good' | 'fair' | 'poor';
}

export interface TuningSession {
  id: string;
  startTime: number;
  endTime: number;
  tuningName: string;
  entries: TuningEntry[];
  avgCents: number;
  perfectCount: number;
  totalCount: number;
}

const STORAGE_KEY = 'bleedoutzone-tuning-history';
const MAX_SESSIONS = 50;

function getAccuracy(cents: number): TuningEntry['accuracy'] {
  const abs = Math.abs(cents);
  if (abs < 2) return 'perfect';
  if (abs < 5) return 'good';
  if (abs < 15) return 'fair';
  return 'poor';
}

function loadSessions(): TuningSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: TuningSession[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
  } catch {}
}

export function useTuningHistory() {
  const [sessions, setSessions] = useState<TuningSession[]>(loadSessions);
  const currentEntriesRef = useRef<TuningEntry[]>([]);
  const sessionStartRef = useRef<number | null>(null);
  const tuningNameRef = useRef('');
  const lastLoggedRef = useRef<string | null>(null);
  const stableCountRef = useRef(0);

  // Log a stable reading (only logs when note stays consistent for a few frames)
  const logReading = useCallback((
    note: string,
    octave: number,
    cents: number,
    frequency: number,
    targetFrequency: number,
    tuningName: string,
  ) => {
    const key = `${note}${octave}`;
    if (key === lastLoggedRef.current) {
      stableCountRef.current++;
    } else {
      lastLoggedRef.current = key;
      stableCountRef.current = 0;
    }

    // Only log after note is stable for 5 frames, then every ~15 frames
    if (stableCountRef.current < 5) return;
    if ((stableCountRef.current - 5) % 15 !== 0) return;

    if (!sessionStartRef.current) {
      sessionStartRef.current = Date.now();
      tuningNameRef.current = tuningName;
    }

    const entry: TuningEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      note,
      octave,
      cents,
      frequency,
      targetFrequency,
      tuningName,
      accuracy: getAccuracy(cents),
    };

    currentEntriesRef.current.push(entry);
  }, []);

  // End the current session and persist
  const endSession = useCallback(() => {
    const entries = currentEntriesRef.current;
    if (entries.length < 3) {
      // Too few readings, discard
      currentEntriesRef.current = [];
      sessionStartRef.current = null;
      lastLoggedRef.current = null;
      stableCountRef.current = 0;
      return;
    }

    const avgCents = entries.reduce((sum, e) => sum + Math.abs(e.cents), 0) / entries.length;
    const perfectCount = entries.filter((e) => e.accuracy === 'perfect').length;

    const session: TuningSession = {
      id: crypto.randomUUID(),
      startTime: sessionStartRef.current || Date.now(),
      endTime: Date.now(),
      tuningName: tuningNameRef.current,
      entries,
      avgCents: Math.round(avgCents * 10) / 10,
      perfectCount,
      totalCount: entries.length,
    };

    const updated = [session, ...loadSessions()].slice(0, MAX_SESSIONS);
    saveSessions(updated);
    setSessions(updated);

    currentEntriesRef.current = [];
    sessionStartRef.current = null;
    lastLoggedRef.current = null;
    stableCountRef.current = 0;
  }, []);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSessions([]);
  }, []);

  return { sessions, logReading, endSession, clearHistory };
}
