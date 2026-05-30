import { useState, useEffect, useCallback } from 'react';
import { Sound, SynthParams, EffectsParams, JELLYBEAN_COLORS, DEFAULT_SYNTH_PARAMS, DEFAULT_EFFECTS } from '../types';
import * as db from '../lib/db';
import { renderSoundToWav } from '../lib/audio';
import { downloadBlob } from '../lib/wavEncoder';
import JSZip from 'jszip';

async function importSingleAudioFile(file: File, colorIndex: number): Promise<Sound | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const ctx = new AudioContext();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    await ctx.close();

    const { audioBufferToWav } = await import('../lib/wavEncoder');
    const wavBlob = audioBufferToWav(audioBuffer);

    const id = `import-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const name = file.name.replace(/\.[^.]+$/, '');
    const color = JELLYBEAN_COLORS[colorIndex % JELLYBEAN_COLORS.length];

    const sound: Sound = {
      id,
      name,
      synthParams: { ...DEFAULT_SYNTH_PARAMS },
      effects: { ...DEFAULT_EFFECTS },
      color,
      duration: audioBuffer.duration,
      createdAt: Date.now(),
    };

    await db.saveAudioBlob(id, wavBlob);
    await db.saveSound(sound);
    return sound;
  } catch (err) {
    console.warn('importSingleAudioFile failed:', err);
    return null;
  }
}

// Default seed sounds for first load
const SEED_SOUNDS: Array<{ name: string; synthParams: SynthParams; effects: EffectsParams; color: string; duration: number }> = [
  {
    name: 'Kick',
    color: '#FF3B5C',
    duration: 1.5,
    synthParams: {
      synthType: 'MembraneSynth',
      note: 'C1',
      frequency: 32.7,
      volume: -2,
      envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.1 },
      pitchDecay: 0.08,
      octaves: 10,
    },
    effects: { ...DEFAULT_EFFECTS },
  },
  {
    name: 'Snare',
    color: '#FF7A00',
    duration: 1.5,
    synthParams: {
      synthType: 'NoiseSynth',
      note: 'A3',
      frequency: 220,
      volume: -6,
      envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 },
      noiseType: 'white',
    },
    effects: {
      ...DEFAULT_EFFECTS,
      distortion: { enabled: true, wet: 0.4, distortion: 0.3 },
    },
  },
  {
    name: 'Hi-Hat',
    color: '#FFB800',
    duration: 1,
    synthParams: {
      synthType: 'MetalSynth',
      note: 'A5',
      frequency: 880,
      volume: -10,
      envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.05 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
    },
    effects: { ...DEFAULT_EFFECTS },
  },
  {
    name: 'Bass',
    color: '#4400FF',
    duration: 2,
    synthParams: {
      synthType: 'Synth',
      note: 'E2',
      frequency: 82.41,
      volume: -4,
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.3 },
    },
    effects: {
      ...DEFAULT_EFFECTS,
      filter: { enabled: true, frequency: 800, type: 'lowpass', Q: 2 },
    },
  },
];

export function useSounds() {
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const stored = await db.getAllSounds();
      if (stored.length === 0) {
        // Seed default sounds — save metadata only; blobs are rendered lazily on first play
        const seeded: Sound[] = [];
        for (const seed of SEED_SOUNDS) {
          const id = `seed-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          const sound: Sound = {
            id,
            name: seed.name,
            synthParams: seed.synthParams,
            effects: seed.effects,
            color: seed.color,
            duration: seed.duration,
            createdAt: Date.now(),
          };
          await db.saveSound(sound);
          seeded.push(sound);
        }
        setSounds(seeded);
      } else {
        setSounds(stored);
      }
      setLoading(false);
    }
    init();
  }, []);

  const addSound = useCallback(
    async (name: string, synthParams: SynthParams, effects: EffectsParams, duration: number = 2): Promise<Sound> => {
      const id = `sound-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const colorIndex = sounds.length % JELLYBEAN_COLORS.length;
      const color = JELLYBEAN_COLORS[colorIndex];

      const sound: Sound = {
        id,
        name,
        synthParams,
        effects,
        color,
        duration,
        createdAt: Date.now(),
      };

      const blob = await renderSoundToWav(synthParams, effects, duration);
      await db.saveAudioBlob(id, blob);
      await db.saveSound(sound);

      setSounds((prev) => [...prev, sound]);
      return sound;
    },
    [sounds.length]
  );

  const updateSound = useCallback(
    async (id: string, updates: Partial<Sound>, rerender = false): Promise<void> => {
      setSounds((prev) => {
        const updated = prev.map((s) => (s.id === id ? { ...s, ...updates } : s));
        const sound = updated.find((s) => s.id === id);
        if (sound) {
          db.saveSound(sound);
          if (rerender) {
            renderSoundToWav(sound.synthParams, sound.effects, sound.duration)
              .then((blob) => db.saveAudioBlob(id, blob))
              .catch(console.error);
          }
        }
        return updated;
      });
    },
    []
  );

  const deleteSound = useCallback(async (id: string): Promise<void> => {
    await db.deleteSound(id);
    setSounds((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const downloadSound = useCallback(async (sound: Sound): Promise<void> => {
    let blob = await db.getAudioBlob(sound.id);
    if (!blob) {
      blob = await renderSoundToWav(sound.synthParams, sound.effects, sound.duration);
    }
    downloadBlob(blob, `${sound.name.replace(/\s+/g, '_')}.wav`);
  }, []);

  const importSounds = useCallback(async (files: File[]): Promise<Sound[]> => {
    const newSounds: Sound[] = [];

    for (const file of files) {
      try {
        if (file.name.toLowerCase().endsWith('.zip')) {
          const zip = await JSZip.loadAsync(file);
          for (const [name, entry] of Object.entries(zip.files)) {
            if (entry.dir) continue;
            const ext = name.split('.').pop()?.toLowerCase() ?? '';
            if (!['wav', 'mp3', 'ogg', 'flac', 'aac', 'm4a', 'webm'].includes(ext)) continue;
            const blob = await entry.async('blob');
            const audioFile = new File([blob], name, { type: `audio/${ext}` });
            const sound = await importSingleAudioFile(audioFile, sounds.length + newSounds.length);
            if (sound) newSounds.push(sound);
          }
        } else {
          const sound = await importSingleAudioFile(file, sounds.length + newSounds.length);
          if (sound) newSounds.push(sound);
        }
      } catch (err) {
        console.warn('Failed to import:', file.name, err);
      }
    }

    if (newSounds.length > 0) {
      setSounds(prev => [...prev, ...newSounds]);
    }
    return newSounds;
  }, [sounds.length]);

  const exportAllSounds = useCallback(async (): Promise<void> => {
    if (sounds.length === 0) return;
    const zip = new JSZip();
    for (const sound of sounds) {
      let blob = await db.getAudioBlob(sound.id);
      if (!blob) {
        blob = await renderSoundToWav(sound.synthParams, sound.effects, sound.duration);
      }
      zip.file(`${sound.name.replace(/\s+/g, '_')}.wav`, blob);
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(zipBlob, 'jellybean-soundz.zip');
  }, [sounds]);

  return {
    sounds,
    loading,
    addSound,
    updateSound,
    deleteSound,
    downloadSound,
    exportAllSounds,
    importSounds,
  };
}
