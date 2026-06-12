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

// Default seed sounds for first load — 16 diverse, high-quality presets
const SEED_SOUNDS: Array<{ name: string; synthParams: SynthParams; effects: EffectsParams; color: string; duration: number }> = [
  // ── Drums / Percussion ───────────────────────────────────────────────────
  {
    name: 'Kick',
    color: '#FF3B5C',
    duration: 1.5,
    synthParams: {
      synthType: 'MembraneSynth', note: 'C1', frequency: 32.7, volume: -2,
      envelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.1 },
      pitchDecay: 0.1, octaves: 10,
    },
    effects: {
      ...DEFAULT_EFFECTS,
      filter: { enabled: true, frequency: 200, type: 'lowpass', Q: 1 },
    },
  },
  {
    name: 'Snare',
    color: '#FF7A00',
    duration: 1.0,
    synthParams: {
      synthType: 'NoiseSynth', note: 'A3', frequency: 220, volume: -6,
      envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.05 },
      noiseType: 'white',
    },
    effects: {
      ...DEFAULT_EFFECTS,
      filter: { enabled: true, frequency: 3500, type: 'highpass', Q: 0.7 },
      distortion: { enabled: true, wet: 0.35, distortion: 0.25 },
    },
  },
  {
    name: 'Clap',
    color: '#FF9F00',
    duration: 0.8,
    synthParams: {
      synthType: 'NoiseSynth', note: 'C4', frequency: 440, volume: -8,
      envelope: { attack: 0.002, decay: 0.1, sustain: 0, release: 0.08 },
      noiseType: 'pink',
    },
    effects: {
      ...DEFAULT_EFFECTS,
      filter: { enabled: true, frequency: 5000, type: 'highpass', Q: 1 },
      reverb: { enabled: true, decay: 0.8, preDelay: 0.01, wet: 0.3 },
    },
  },
  {
    name: 'Closed Hat',
    color: '#FFB800',
    duration: 0.5,
    synthParams: {
      synthType: 'MetalSynth', note: 'G5', frequency: 880, volume: -14,
      envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.02 },
      harmonicity: 5.1, modulationIndex: 32, resonance: 4200, octaves: 1.5,
    },
    effects: { ...DEFAULT_EFFECTS },
  },
  {
    name: 'Open Hat',
    color: '#FFC94D',
    duration: 1.2,
    synthParams: {
      synthType: 'MetalSynth', note: 'G5', frequency: 880, volume: -16,
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.1, release: 0.3 },
      harmonicity: 5.1, modulationIndex: 28, resonance: 3800, octaves: 2,
    },
    effects: {
      ...DEFAULT_EFFECTS,
      reverb: { enabled: true, decay: 1.2, preDelay: 0.01, wet: 0.2 },
    },
  },
  {
    name: 'Low Tom',
    color: '#FF5F1F',
    duration: 1.5,
    synthParams: {
      synthType: 'MembraneSynth', note: 'F2', frequency: 87, volume: -6,
      envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.1 },
      pitchDecay: 0.06, octaves: 6,
    },
    effects: {
      ...DEFAULT_EFFECTS,
      reverb: { enabled: true, decay: 0.6, preDelay: 0.01, wet: 0.15 },
    },
  },
  {
    name: 'High Tom',
    color: '#FF3B5C',
    duration: 1.0,
    synthParams: {
      synthType: 'MembraneSynth', note: 'A3', frequency: 220, volume: -7,
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.08 },
      pitchDecay: 0.04, octaves: 5,
    },
    effects: { ...DEFAULT_EFFECTS },
  },
  {
    name: 'Crash',
    color: '#FFD700',
    duration: 3.0,
    synthParams: {
      synthType: 'MetalSynth', note: 'C6', frequency: 1200, volume: -18,
      envelope: { attack: 0.001, decay: 2.5, sustain: 0, release: 0.5 },
      harmonicity: 3.1, modulationIndex: 16, resonance: 6000, octaves: 3,
    },
    effects: {
      ...DEFAULT_EFFECTS,
      reverb: { enabled: true, decay: 2.5, preDelay: 0.02, wet: 0.4 },
    },
  },
  // ── Bass ─────────────────────────────────────────────────────────────────
  {
    name: '808 Bass',
    color: '#4400FF',
    duration: 2.5,
    synthParams: {
      synthType: 'MembraneSynth', note: 'A1', frequency: 55, volume: -3,
      envelope: { attack: 0.001, decay: 1.5, sustain: 0, release: 0.3 },
      pitchDecay: 0.5, octaves: 4,
    },
    effects: {
      ...DEFAULT_EFFECTS,
      filter: { enabled: true, frequency: 300, type: 'lowpass', Q: 1 },
    },
  },
  {
    name: 'Pluck Bass',
    color: '#0095FF',
    duration: 2.0,
    synthParams: {
      synthType: 'PluckSynth', note: 'E2', frequency: 82.41, volume: -4,
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.3, release: 0.3 },
      attackNoise: 0.5, dampening: 4000, resonancePluck: 0.9,
    },
    effects: {
      ...DEFAULT_EFFECTS,
      filter: { enabled: true, frequency: 600, type: 'lowpass', Q: 1.5 },
    },
  },
  {
    name: 'Sub Bass',
    color: '#2200AA',
    duration: 2.0,
    synthParams: {
      synthType: 'Synth', note: 'A1', frequency: 55, volume: -4,
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.7, release: 0.4 },
    },
    effects: {
      ...DEFAULT_EFFECTS,
      filter: { enabled: true, frequency: 200, type: 'lowpass', Q: 2 },
    },
  },
  // ── Synth / Melodic ──────────────────────────────────────────────────────
  {
    name: 'Bell',
    color: '#00E5FF',
    duration: 3.0,
    synthParams: {
      synthType: 'FMSynth', note: 'C5', frequency: 523.25, volume: -10,
      envelope: { attack: 0.001, decay: 1.8, sustain: 0, release: 0.5 },
      harmonicity: 5, modulationIndex: 12,
    },
    effects: {
      ...DEFAULT_EFFECTS,
      reverb: { enabled: true, decay: 2.0, preDelay: 0.01, wet: 0.35 },
    },
  },
  {
    name: 'Marimba',
    color: '#00FF7A',
    duration: 2.0,
    synthParams: {
      synthType: 'FMSynth', note: 'C4', frequency: 261.63, volume: -8,
      envelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.15 },
      harmonicity: 2, modulationIndex: 4,
    },
    effects: {
      ...DEFAULT_EFFECTS,
      reverb: { enabled: true, decay: 1.0, preDelay: 0.01, wet: 0.2 },
    },
  },
  {
    name: 'Supersaw',
    color: '#FF00CC',
    duration: 2.0,
    synthParams: {
      synthType: 'Synth', note: 'C4', frequency: 261.63, volume: -10,
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.8, release: 0.4 },
    },
    effects: {
      ...DEFAULT_EFFECTS,
      filter: { enabled: true, frequency: 3000, type: 'lowpass', Q: 3 },
      delay: { enabled: true, delayTime: 0.25, feedback: 0.3, wet: 0.2 },
    },
  },
  // ── Pads / Atmosphere ────────────────────────────────────────────────────
  {
    name: 'Warm Pad',
    color: '#7700FF',
    duration: 4.0,
    synthParams: {
      synthType: 'AMSynth', note: 'C4', frequency: 261.63, volume: -12,
      envelope: { attack: 0.6, decay: 0.2, sustain: 0.9, release: 2.0 },
      harmonicity: 2.5,
    },
    effects: {
      ...DEFAULT_EFFECTS,
      filter: { enabled: true, frequency: 1200, type: 'lowpass', Q: 1 },
      reverb: { enabled: true, decay: 3.0, preDelay: 0.02, wet: 0.5 },
    },
  },
  {
    name: 'Glass Pad',
    color: '#88FFDD',
    duration: 4.0,
    synthParams: {
      synthType: 'FMSynth', note: 'C5', frequency: 523.25, volume: -14,
      envelope: { attack: 1.0, decay: 0.3, sustain: 0.8, release: 2.5 },
      harmonicity: 7, modulationIndex: 3,
    },
    effects: {
      ...DEFAULT_EFFECTS,
      reverb: { enabled: true, decay: 4.0, preDelay: 0.03, wet: 0.6 },
      delay: { enabled: true, delayTime: 0.375, feedback: 0.35, wet: 0.15 },
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
