import { useState, useEffect, useCallback, useRef } from 'react';
import { BeatzProject, BeatzTrack, BeatzStep, InstrumentType, NoteDuration, Sound, JELLYBEAN_COLORS } from '../types';
import * as db from '../lib/db';
import { createDemoProject } from '../lib/demoSong';

const DEFAULT_STEPS_PER_BAR = 16;

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function makeSteps(count: number, defaultNote = 'C4'): BeatzStep[] {
  return Array.from({ length: count }, () => ({ active: false, note: defaultNote, velocity: 1 }));
}

export function useBeatz(sounds: Sound[]) {
  void sounds; // reserved (sound tracks reference the library at render/play time)
  const [projects, setProjects] = useState<BeatzProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function init() {
      let stored = await db.getAllBeatzProjects();
      if (stored.length === 0) {
        // First load: seed the 32-bar showcase composition
        const project = createDemoProject();
        await db.saveBeatzProject(project);
        stored = [project];
      }
      setProjects(stored);
      const savedId = localStorage.getItem('jb-activeBeatzId');
      const active = stored.find(p => p.id === savedId) ?? stored[0];
      setActiveProjectId(active?.id ?? null);
      setLoading(false);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once; sounds are only used for seeding

  useEffect(() => {
    if (activeProjectId) localStorage.setItem('jb-activeBeatzId', activeProjectId);
  }, [activeProjectId]);

  const activeProject = projects.find(p => p.id === activeProjectId) ?? null;

  const mutateActive = useCallback((updater: (p: BeatzProject) => BeatzProject) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== activeProjectId) return p;
      const updated = updater(p);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => { db.saveBeatzProject(updated); }, 400);
      return updated;
    }));
  }, [activeProjectId]);

  // Project CRUD
  const addProject = useCallback(async (name: string) => {
    const project: BeatzProject = {
      id: uid('bp'), name, bpm: 120, bars: 2, stepsPerBar: DEFAULT_STEPS_PER_BAR,
      tracks: [], createdAt: Date.now(),
    };
    await db.saveBeatzProject(project);
    setProjects(prev => [...prev, project]);
    setActiveProjectId(project.id);
    return project;
  }, []);

  const renameProject = useCallback(async (id: string, name: string) => {
    setProjects(prev => {
      const next = prev.map(p => p.id === id ? { ...p, name } : p);
      const found = next.find(p => p.id === id);
      if (found) db.saveBeatzProject(found);
      return next;
    });
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    await db.deleteBeatzProject(id);
    setProjects(prev => {
      const next = prev.filter(p => p.id !== id);
      if (activeProjectId === id) setActiveProjectId(next[0]?.id ?? null);
      return next;
    });
  }, [activeProjectId]);

  // BPM and bars
  const setBpm = useCallback((bpm: number) => {
    mutateActive(p => ({ ...p, bpm: Math.max(40, Math.min(250, bpm)) }));
  }, [mutateActive]);

  const setBars = useCallback((bars: number) => {
    mutateActive(p => {
      const newTotal = bars * p.stepsPerBar;
      const tracks = p.tracks.map(t => {
        const cur = t.steps.length;
        if (newTotal === cur) return t;
        if (newTotal > cur) {
          return { ...t, steps: [...t.steps, ...makeSteps(newTotal - cur, t.defaultNote)] };
        }
        return { ...t, steps: t.steps.slice(0, newTotal) };
      });
      return { ...p, bars, tracks };
    });
  }, [mutateActive]);

  // Track CRUD
  const addSoundTrack = useCallback((soundId: string, sound: { name: string; color: string }) => {
    mutateActive(p => {
      const total = p.bars * p.stepsPerBar;
      const idx = p.tracks.length % JELLYBEAN_COLORS.length;
      const track: BeatzTrack = {
        id: uid('bt'), name: sound.name, type: 'sound', soundId,
        defaultNote: 'C4', stepDuration: '16n', steps: makeSteps(total), volume: -6,
        muted: false, color: sound.color || JELLYBEAN_COLORS[idx],
      };
      return { ...p, tracks: [...p.tracks, track] };
    });
  }, [mutateActive]);

  const addInstrumentTrack = useCallback((instrument: InstrumentType) => {
    mutateActive(p => {
      const total = p.bars * p.stepsPerBar;
      const idx = p.tracks.length % JELLYBEAN_COLORS.length;
      const track: BeatzTrack = {
        id: uid('bt'), name: instrument, type: 'instrument', instrument,
        defaultNote: 'C4', stepDuration: '16n', steps: makeSteps(total), volume: -8,
        muted: false, color: JELLYBEAN_COLORS[idx],
      };
      return { ...p, tracks: [...p.tracks, track] };
    });
  }, [mutateActive]);

  const removeTrack = useCallback((trackId: string) => {
    mutateActive(p => ({ ...p, tracks: p.tracks.filter(t => t.id !== trackId) }));
  }, [mutateActive]);

  const setTrackVolume = useCallback((trackId: string, volume: number) => {
    mutateActive(p => ({ ...p, tracks: p.tracks.map(t => t.id === trackId ? { ...t, volume } : t) }));
  }, [mutateActive]);

  const toggleMute = useCallback((trackId: string) => {
    mutateActive(p => ({ ...p, tracks: p.tracks.map(t => t.id === trackId ? { ...t, muted: !t.muted } : t) }));
  }, [mutateActive]);

  const toggleSolo = useCallback((trackId: string) => {
    mutateActive(p => ({ ...p, tracks: p.tracks.map(t => t.id === trackId ? { ...t, solo: !t.solo } : t) }));
  }, [mutateActive]);

  const setTrackPan = useCallback((trackId: string, pan: number) => {
    mutateActive(p => ({ ...p, tracks: p.tracks.map(t => t.id === trackId ? { ...t, pan: Math.max(-1, Math.min(1, pan)) } : t) }));
  }, [mutateActive]);

  const setTrackReverb = useCallback((trackId: string, reverb: number) => {
    mutateActive(p => ({ ...p, tracks: p.tracks.map(t => t.id === trackId ? { ...t, reverb: Math.max(0, Math.min(1, reverb)) } : t) }));
  }, [mutateActive]);

  const setTrackDelay = useCallback((trackId: string, delay: number) => {
    mutateActive(p => ({ ...p, tracks: p.tracks.map(t => t.id === trackId ? { ...t, delay: Math.max(0, Math.min(1, delay)) } : t) }));
  }, [mutateActive]);

  const setTrackSteps = useCallback((trackId: string, steps: BeatzStep[]) => {
    mutateActive(p => ({ ...p, tracks: p.tracks.map(t => t.id === trackId ? { ...t, steps } : t) }));
  }, [mutateActive]);

  const loadDemoSong = useCallback(async () => {
    const project = createDemoProject();
    await db.saveBeatzProject(project);
    setProjects(prev => [...prev, project]);
    setActiveProjectId(project.id);
    return project;
  }, []);

  const setTrackDefaultNote = useCallback((trackId: string, note: string) => {
    mutateActive(p => ({ ...p, tracks: p.tracks.map(t => t.id === trackId ? { ...t, defaultNote: note } : t) }));
  }, [mutateActive]);

  const renameTrack = useCallback((trackId: string, name: string) => {
    mutateActive(p => ({ ...p, tracks: p.tracks.map(t => t.id === trackId ? { ...t, name } : t) }));
  }, [mutateActive]);

  const setTrackColor = useCallback((trackId: string, color: string) => {
    mutateActive(p => ({ ...p, tracks: p.tracks.map(t => t.id === trackId ? { ...t, color } : t) }));
  }, [mutateActive]);

  // Step CRUD
  const toggleStep = useCallback((trackId: string, stepIndex: number) => {
    mutateActive(p => ({
      ...p,
      tracks: p.tracks.map(t => {
        if (t.id !== trackId) return t;
        const steps = t.steps.map((s, i) => i !== stepIndex ? s : { ...s, active: !s.active, note: s.note || t.defaultNote });
        return { ...t, steps };
      }),
    }));
  }, [mutateActive]);

  const setStepNote = useCallback((trackId: string, stepIndex: number, note: string) => {
    mutateActive(p => ({
      ...p,
      tracks: p.tracks.map(t => {
        if (t.id !== trackId) return t;
        const steps = t.steps.map((s, i) => i !== stepIndex ? s : { ...s, note, active: true });
        return { ...t, steps };
      }),
    }));
  }, [mutateActive]);

  const setTrackStepDuration = useCallback((trackId: string, stepDuration: NoteDuration) => {
    mutateActive(p => ({ ...p, tracks: p.tracks.map(t => t.id === trackId ? { ...t, stepDuration } : t) }));
  }, [mutateActive]);

  const setStepDuration = useCallback((trackId: string, stepIndex: number, duration: NoteDuration) => {
    mutateActive(p => ({
      ...p,
      tracks: p.tracks.map(t => {
        if (t.id !== trackId) return t;
        const steps = t.steps.map((s, i) => i !== stepIndex ? s : { ...s, duration, active: true });
        return { ...t, steps };
      }),
    }));
  }, [mutateActive]);

  const clearTrack = useCallback((trackId: string) => {
    mutateActive(p => ({
      ...p,
      tracks: p.tracks.map(t => t.id !== trackId ? t : { ...t, steps: makeSteps(t.steps.length, t.defaultNote) }),
    }));
  }, [mutateActive]);

  const addTrackFromSteps = useCallback((
    instrument: InstrumentType,
    steps: { note: string; active: boolean }[]
  ) => {
    mutateActive(p => {
      const total = p.bars * p.stepsPerBar;
      const idx = p.tracks.length % JELLYBEAN_COLORS.length;
      const track: BeatzTrack = {
        id: uid('bt'),
        name: `Hum ${new Date().toLocaleTimeString()}`,
        type: 'instrument',
        instrument,
        defaultNote: 'C4',
        stepDuration: '16n',
        steps: steps.slice(0, total).map(s => ({
          active: s.active,
          note: s.note,
          velocity: 1,
        })),
        volume: -8,
        muted: false,
        color: JELLYBEAN_COLORS[idx],
      };
      return { ...p, tracks: [...p.tracks, track] };
    });
  }, [mutateActive]);

  const fillTrack = useCallback((trackId: string, pattern: 'all' | 'everyOther' | 'every4') => {
    mutateActive(p => ({
      ...p,
      tracks: p.tracks.map(t => {
        if (t.id !== trackId) return t;
        const steps = t.steps.map((s, i) => {
          const active = pattern === 'all' ? true : pattern === 'everyOther' ? i % 2 === 0 : i % 4 === 0;
          return { ...s, active, note: s.note || t.defaultNote };
        });
        return { ...t, steps };
      }),
    }));
  }, [mutateActive]);

  return {
    projects, activeProject, activeProjectId, loading,
    setActiveProjectId, addProject, renameProject, deleteProject,
    setBpm, setBars,
    addSoundTrack, addInstrumentTrack, addTrackFromSteps, removeTrack,
    setTrackVolume, toggleMute, toggleSolo, setTrackPan, setTrackReverb, setTrackDelay,
    setTrackDefaultNote, renameTrack, setTrackColor,
    toggleStep, setStepNote, setStepDuration, setTrackSteps, clearTrack, fillTrack,
    setTrackStepDuration, loadDemoSong,
  };
}
