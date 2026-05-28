export type SynthType =
  | 'Synth'
  | 'FMSynth'
  | 'AMSynth'
  | 'MembraneSynth'
  | 'MetalSynth'
  | 'NoiseSynth'
  | 'PluckSynth';

export interface EnvelopeParams {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface SynthParams {
  synthType: SynthType;
  note: string;
  frequency: number;
  volume: number;
  envelope: EnvelopeParams;
  // For NoiseSynth
  noiseType?: 'white' | 'brown' | 'pink';
  // For MembraneSynth
  pitchDecay?: number;
  octaves?: number;
  // For MetalSynth
  harmonicity?: number;
  modulationIndex?: number;
  resonance?: number;
  // For FMSynth / AMSynth
  modulationType?: string;
  // For PluckSynth
  attackNoise?: number;
  dampening?: number;
  resonancePluck?: number;
}

export interface ReverbParams {
  enabled: boolean;
  wet: number;
  decay: number;
  preDelay: number;
}

export interface DelayParams {
  enabled: boolean;
  wet: number;
  delayTime: number;
  feedback: number;
}

export interface DistortionParams {
  enabled: boolean;
  wet: number;
  distortion: number;
}

export interface FilterParams {
  enabled: boolean;
  frequency: number;
  type: BiquadFilterType;
  Q: number;
}

export interface BitCrusherParams {
  enabled: boolean;
  wet: number;
  bits: number;
}

export interface EffectsParams {
  reverb: ReverbParams;
  delay: DelayParams;
  distortion: DistortionParams;
  filter: FilterParams;
  bitCrusher: BitCrusherParams;
}

export interface Sound {
  id: string;
  name: string;
  synthParams: SynthParams;
  effects: EffectsParams;
  color: string;
  duration: number; // seconds
  createdAt: number;
}

export interface PadAssignment {
  padIndex: number;
  soundId: string | null;
  padName: string;
}

export interface Magazine {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  order: number;
}

export interface Page {
  id: string;
  name: string;
  magazineId: string;
  pads: PadAssignment[];
  createdAt: number;
  order: number;
}

export type PresetName =
  | 'Kick'
  | 'Snare'
  | 'Hi-Hat'
  | 'Clap'
  | 'Bass'
  | 'Lead'
  | 'Pad'
  | 'Laser'
  | 'Whoosh';

export const JELLYBEAN_COLORS = [
  '#FF3B5C', // red
  '#FF7A00', // orange
  '#FFB800', // amber
  '#FFE500', // yellow
  '#A8FF00', // lime
  '#00FF7A', // green
  '#00FFBF', // emerald
  '#00E5FF', // teal
  '#00C8FF', // cyan
  '#0095FF', // sky
  '#0055FF', // blue
  '#4400FF', // indigo
  '#7700FF', // violet
  '#AA00FF', // purple
  '#FF00CC', // pink
  '#FF0080', // rose
];

export const SYNTH_TYPES: SynthType[] = [
  'Synth',
  'FMSynth',
  'AMSynth',
  'MembraneSynth',
  'MetalSynth',
  'NoiseSynth',
  'PluckSynth',
];

export const NOTE_NAMES = [
  'C1', 'C#1', 'D1', 'D#1', 'E1', 'F1', 'F#1', 'G1', 'G#1', 'A1', 'A#1', 'B1',
  'C2', 'C#2', 'D2', 'D#2', 'E2', 'F2', 'F#2', 'G2', 'G#2', 'A2', 'A#2', 'B2',
  'C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3',
  'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4',
  'C5', 'C#5', 'D5', 'D#5', 'E5', 'F5', 'F#5', 'G5', 'G#5', 'A5', 'A#5', 'B5',
  'C6', 'C#6', 'D6', 'D#6', 'E6', 'F6', 'F#6', 'G6', 'G#6', 'A6', 'A#6', 'B6',
];

export const DEFAULT_SYNTH_PARAMS: SynthParams = {
  synthType: 'Synth',
  note: 'C4',
  frequency: 261.63,
  volume: -6,
  envelope: {
    attack: 0.01,
    decay: 0.1,
    sustain: 0.5,
    release: 0.5,
  },
};

export const DEFAULT_EFFECTS: EffectsParams = {
  reverb: { enabled: false, wet: 0.3, decay: 2, preDelay: 0.01 },
  delay: { enabled: false, wet: 0.3, delayTime: 0.25, feedback: 0.4 },
  distortion: { enabled: false, wet: 0.5, distortion: 0.4 },
  filter: { enabled: false, frequency: 2000, type: 'lowpass', Q: 1 },
  bitCrusher: { enabled: false, wet: 1.0, bits: 4 },
};
