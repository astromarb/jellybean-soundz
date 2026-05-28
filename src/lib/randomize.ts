import { SynthParams, EffectsParams, SynthType, NOTE_NAMES } from '../types';

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function r(value: number, decimals = 2): number {
  return parseFloat(value.toFixed(decimals));
}

export function randomizeSynthParams(): SynthParams {
  const synthTypes: SynthType[] = ['Synth', 'FMSynth', 'AMSynth', 'MembraneSynth', 'MetalSynth', 'NoiseSynth', 'PluckSynth'];
  const synthType = pick(synthTypes);

  // Keep notes in the usable middle range
  const noteIndex = Math.floor(rand(12, NOTE_NAMES.length - 12));
  const note = NOTE_NAMES[noteIndex];
  const semitones = noteIndex - NOTE_NAMES.indexOf('A4');
  const frequency = r(440 * Math.pow(2, semitones / 12), 2);

  return {
    synthType,
    note,
    frequency,
    volume: r(rand(-22, -2), 1),
    envelope: {
      attack: r(rand(0.001, 0.5), 3),
      decay: r(rand(0.01, 0.8), 3),
      sustain: r(rand(0, 1), 2),
      release: r(rand(0.05, 2), 3),
    },
    noiseType: pick(['white', 'brown', 'pink']),
    pitchDecay: r(rand(0.01, 0.4), 3),
    octaves: r(rand(1, 15), 1),
    harmonicity: r(rand(0.5, 10), 1),
    modulationIndex: r(rand(0, 50), 1),
    resonance: r(rand(200, 8000), 0),
    attackNoise: r(rand(0, 10), 1),
    dampening: r(rand(300, 7000), 0),
    resonancePluck: r(rand(0.1, 0.95), 2),
  };
}

export function randomizeEffects(): EffectsParams {
  const maybe = (p = 0.4) => Math.random() < p;
  return {
    reverb: {
      enabled: maybe(),
      wet: r(rand(0.1, 0.8)),
      decay: r(rand(0.5, 6), 1),
      preDelay: r(rand(0.001, 0.1), 3),
    },
    delay: {
      enabled: maybe(),
      wet: r(rand(0.1, 0.6)),
      delayTime: r(rand(0.05, 0.8)),
      feedback: r(rand(0.1, 0.7)),
    },
    distortion: {
      enabled: maybe(0.3),
      wet: r(rand(0.2, 0.9)),
      distortion: r(rand(0.1, 0.9)),
    },
    filter: {
      enabled: maybe(),
      frequency: r(rand(200, 8000), 0),
      type: pick(['lowpass', 'highpass', 'bandpass']) as BiquadFilterType,
      Q: r(rand(0.5, 5), 1),
    },
    bitCrusher: {
      enabled: maybe(0.2),
      wet: r(rand(0.3, 1)),
      bits: Math.floor(rand(2, 8)),
    },
  };
}
