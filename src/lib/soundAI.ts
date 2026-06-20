import { SynthParams, EffectsParams, DEFAULT_EFFECTS } from '../types';

export interface SoundSuggestion {
  name: string;
  tagline: string;
  synthParams: SynthParams;
  effects: EffectsParams;
  duration: number;
}

const DE = DEFAULT_EFFECTS;

// ---------------------------------------------------------------------------
// Built-in preset archetypes — UI/SFX focused
// ---------------------------------------------------------------------------

const ARCHETYPES: Record<string, SoundSuggestion> = {
  'ui-click': {
    name: 'UI Click',
    tagline: 'Clean neutral button tap',
    duration: 0.12,
    synthParams: { synthType: 'Synth', note: 'C6', frequency: 1046.5, volume: -14,
      envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.01 } },
    effects: { ...DE },
  },
  'ui-click-soft': {
    name: 'Soft Click',
    tagline: 'Gentle muted tap',
    duration: 0.1,
    synthParams: { synthType: 'Synth', note: 'G5', frequency: 783.99, volume: -16,
      envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.01 } },
    effects: { ...DE, filter: { enabled: true, frequency: 1800, type: 'lowpass', Q: 1 } },
  },
  'ui-pop': {
    name: 'Pop',
    tagline: 'Bouncy bubble pop',
    duration: 0.2,
    synthParams: { synthType: 'MembraneSynth', note: 'C5', frequency: 523.25, volume: -10,
      envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.04 },
      pitchDecay: 0.04, octaves: 4 },
    effects: { ...DE },
  },
  'ui-tick': {
    name: 'Tick',
    tagline: 'Tiny mechanical tick',
    duration: 0.08,
    synthParams: { synthType: 'MetalSynth', note: 'A6', frequency: 1760, volume: -20,
      envelope: { attack: 0.001, decay: 0.025, sustain: 0, release: 0.01 },
      harmonicity: 5.1, modulationIndex: 16, resonance: 6000, octaves: 1 },
    effects: { ...DE },
  },

  // Success / confirm
  'ui-success': {
    name: 'Success',
    tagline: 'Bright cheerful confirmation tone',
    duration: 0.5,
    synthParams: { synthType: 'FMSynth', note: 'E5', frequency: 659.25, volume: -10,
      envelope: { attack: 0.001, decay: 0.3, sustain: 0.1, release: 0.15 },
      harmonicity: 3, modulationIndex: 8 },
    effects: { ...DE, reverb: { enabled: true, wet: 0.2, decay: 1.0, preDelay: 0.01 } },
  },
  'ui-ding': {
    name: 'Ding',
    tagline: 'Bright single chime strike',
    duration: 0.6,
    synthParams: { synthType: 'MetalSynth', note: 'C6', frequency: 1046.5, volume: -14,
      envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.1 },
      harmonicity: 5.1, modulationIndex: 16, resonance: 5000, octaves: 1.5 },
    effects: { ...DE, reverb: { enabled: true, wet: 0.25, decay: 1.2, preDelay: 0.01 } },
  },
  'ui-level-up': {
    name: 'Level Up',
    tagline: 'Ascending win fanfare',
    duration: 0.7,
    synthParams: { synthType: 'FMSynth', note: 'C5', frequency: 523.25, volume: -10,
      envelope: { attack: 0.001, decay: 0.5, sustain: 0.2, release: 0.2 },
      harmonicity: 2, modulationIndex: 5 },
    effects: { ...DE, reverb: { enabled: true, wet: 0.3, decay: 1.5, preDelay: 0.01 } },
  },
  'ui-coin': {
    name: 'Coin',
    tagline: 'Retro collect jingle',
    duration: 0.3,
    synthParams: { synthType: 'FMSynth', note: 'B5', frequency: 987.77, volume: -10,
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.05 },
      harmonicity: 6, modulationIndex: 14 },
    effects: { ...DE },
  },

  // Error / warning
  'ui-error': {
    name: 'Error',
    tagline: 'Buzzy rejection tone',
    duration: 0.35,
    synthParams: { synthType: 'NoiseSynth', note: 'C3', frequency: 130.81, volume: -12,
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 },
      noiseType: 'pink' },
    effects: { ...DE,
      filter: { enabled: true, frequency: 800, type: 'lowpass', Q: 3 },
      distortion: { enabled: true, wet: 0.5, distortion: 0.4 } },
  },
  'ui-warning': {
    name: 'Warning Blip',
    tagline: 'Attention-grabbing alert tone',
    duration: 0.4,
    synthParams: { synthType: 'AMSynth', note: 'A3', frequency: 220, volume: -10,
      envelope: { attack: 0.005, decay: 0.25, sustain: 0.2, release: 0.1 },
      harmonicity: 1 },
    effects: { ...DE, filter: { enabled: true, frequency: 1200, type: 'bandpass', Q: 2 } },
  },
  'ui-buzz': {
    name: 'Denied Buzz',
    tagline: 'Low harsh denial buzz',
    duration: 0.3,
    synthParams: { synthType: 'NoiseSynth', note: 'C2', frequency: 65.41, volume: -10,
      envelope: { attack: 0.001, decay: 0.15, sustain: 0.2, release: 0.08 },
      noiseType: 'white' },
    effects: { ...DE,
      filter: { enabled: true, frequency: 400, type: 'lowpass', Q: 4 },
      distortion: { enabled: true, wet: 0.6, distortion: 0.6 } },
  },

  // Notification
  'ui-ping': {
    name: 'Ping',
    tagline: 'Crisp notification ping',
    duration: 0.5,
    synthParams: { synthType: 'FMSynth', note: 'A5', frequency: 880, volume: -12,
      envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.12 },
      harmonicity: 4, modulationIndex: 6 },
    effects: { ...DE, reverb: { enabled: true, wet: 0.15, decay: 0.8, preDelay: 0.005 } },
  },
  'ui-chime': {
    name: 'Chime',
    tagline: 'Soft melodic notification chime',
    duration: 1.2,
    synthParams: { synthType: 'FMSynth', note: 'E5', frequency: 659.25, volume: -14,
      envelope: { attack: 0.002, decay: 0.8, sustain: 0, release: 0.3 },
      harmonicity: 5, modulationIndex: 10 },
    effects: { ...DE, reverb: { enabled: true, wet: 0.35, decay: 2.0, preDelay: 0.01 } },
  },
  'ui-message': {
    name: 'Message Tone',
    tagline: 'Friendly short notification',
    duration: 0.4,
    synthParams: { synthType: 'PluckSynth', note: 'G5', frequency: 783.99, volume: -10,
      envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 },
      attackNoise: 0.3, dampening: 3000, resonancePluck: 0.8 },
    effects: { ...DE, reverb: { enabled: true, wet: 0.2, decay: 0.8, preDelay: 0.005 } },
  },

  // Hover / transition
  'ui-hover': {
    name: 'Hover',
    tagline: 'Barely-there focus whisper',
    duration: 0.08,
    synthParams: { synthType: 'Synth', note: 'C7', frequency: 2093, volume: -22,
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 } },
    effects: { ...DE },
  },
  'ui-swoosh': {
    name: 'Swoosh',
    tagline: 'Quick airy sweep transition',
    duration: 0.25,
    synthParams: { synthType: 'NoiseSynth', note: 'C4', frequency: 261.63, volume: -14,
      envelope: { attack: 0.01, decay: 0.18, sustain: 0, release: 0.05 },
      noiseType: 'white' },
    effects: { ...DE, filter: { enabled: true, frequency: 4000, type: 'highpass', Q: 1 } },
  },
  'ui-whoosh': {
    name: 'Whoosh',
    tagline: 'Cinematic swipe / slide',
    duration: 0.4,
    synthParams: { synthType: 'NoiseSynth', note: 'C3', frequency: 130.81, volume: -12,
      envelope: { attack: 0.03, decay: 0.3, sustain: 0.05, release: 0.08 },
      noiseType: 'pink' },
    effects: { ...DE, filter: { enabled: true, frequency: 2000, type: 'bandpass', Q: 0.8 } },
  },

  // Toggle / switch
  'ui-toggle': {
    name: 'Toggle On',
    tagline: 'Satisfying mechanical switch',
    duration: 0.15,
    synthParams: { synthType: 'MetalSynth', note: 'C5', frequency: 523.25, volume: -16,
      envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.03 },
      harmonicity: 3, modulationIndex: 8, resonance: 3000, octaves: 1 },
    effects: { ...DE },
  },
  'ui-toggle-off': {
    name: 'Toggle Off',
    tagline: 'Lower muted switch click',
    duration: 0.12,
    synthParams: { synthType: 'MetalSynth', note: 'F3', frequency: 174.61, volume: -18,
      envelope: { attack: 0.001, decay: 0.07, sustain: 0, release: 0.02 },
      harmonicity: 3, modulationIndex: 6, resonance: 1500, octaves: 1 },
    effects: { ...DE },
  },

  // Delete / destructive
  'ui-delete': {
    name: 'Delete',
    tagline: 'Sharp downward snap',
    duration: 0.2,
    synthParams: { synthType: 'Synth', note: 'C3', frequency: 130.81, volume: -10,
      envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.05 } },
    effects: { ...DE, distortion: { enabled: true, wet: 0.4, distortion: 0.5 } },
  },
  'ui-glitch': {
    name: 'Glitch',
    tagline: 'Digital corruption burst',
    duration: 0.2,
    synthParams: { synthType: 'NoiseSynth', note: 'C4', frequency: 261.63, volume: -8,
      envelope: { attack: 0.001, decay: 0.12, sustain: 0.1, release: 0.05 },
      noiseType: 'white' },
    effects: { ...DE,
      bitCrusher: { enabled: true, wet: 1.0, bits: 2 },
      distortion: { enabled: true, wet: 0.7, distortion: 0.8 } },
  },

  // Upload / send / action
  'ui-send': {
    name: 'Send',
    tagline: 'Light upward pluck whoosh',
    duration: 0.3,
    synthParams: { synthType: 'PluckSynth', note: 'C6', frequency: 1046.5, volume: -12,
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.08 },
      attackNoise: 0.5, dampening: 5000, resonancePluck: 0.7 },
    effects: { ...DE },
  },
  'ui-upload': {
    name: 'Upload Done',
    tagline: 'Rising completion sweep',
    duration: 0.45,
    synthParams: { synthType: 'Synth', note: 'G5', frequency: 783.99, volume: -12,
      envelope: { attack: 0.05, decay: 0.3, sustain: 0.1, release: 0.08 } },
    effects: { ...DE, filter: { enabled: true, frequency: 3000, type: 'lowpass', Q: 2 } },
  },

  // Open / close
  'ui-open': {
    name: 'Open',
    tagline: 'Gentle expand bloom',
    duration: 0.35,
    synthParams: { synthType: 'AMSynth', note: 'C5', frequency: 523.25, volume: -14,
      envelope: { attack: 0.05, decay: 0.25, sustain: 0.1, release: 0.1 },
      harmonicity: 2 },
    effects: { ...DE, reverb: { enabled: true, wet: 0.2, decay: 0.8, preDelay: 0.005 } },
  },
  'ui-close': {
    name: 'Close',
    tagline: 'Quick deflate dismiss',
    duration: 0.2,
    synthParams: { synthType: 'AMSynth', note: 'G3', frequency: 195.99, volume: -14,
      envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.06 },
      harmonicity: 2 },
    effects: { ...DE },
  },

  // Retro / game
  'ui-8bit-blip': {
    name: '8-bit Blip',
    tagline: 'Classic chip-tune blip',
    duration: 0.15,
    synthParams: { synthType: 'Synth', note: 'C5', frequency: 523.25, volume: -12,
      envelope: { attack: 0.001, decay: 0.1, sustain: 0.2, release: 0.04 } },
    effects: { ...DE, bitCrusher: { enabled: true, wet: 0.9, bits: 4 } },
  },
  'ui-8bit-jump': {
    name: '8-bit Jump',
    tagline: 'Square-wave platformer jump',
    duration: 0.25,
    synthParams: { synthType: 'Synth', note: 'E5', frequency: 659.25, volume: -12,
      envelope: { attack: 0.001, decay: 0.18, sustain: 0.1, release: 0.06 } },
    effects: { ...DE, bitCrusher: { enabled: true, wet: 1.0, bits: 3 } },
  },
  'ui-power-up': {
    name: 'Power Up',
    tagline: 'Rising energetic synth sweep',
    duration: 0.6,
    synthParams: { synthType: 'FMSynth', note: 'G5', frequency: 783.99, volume: -10,
      envelope: { attack: 0.01, decay: 0.45, sustain: 0.3, release: 0.1 },
      harmonicity: 3, modulationIndex: 10 },
    effects: { ...DE, bitCrusher: { enabled: true, wet: 0.5, bits: 5 } },
  },
  'ui-beep': {
    name: 'Simple Beep',
    tagline: 'Pure sine beep',
    duration: 0.2,
    synthParams: { synthType: 'Synth', note: 'A4', frequency: 440, volume: -14,
      envelope: { attack: 0.005, decay: 0.15, sustain: 0, release: 0.04 } },
    effects: { ...DE },
  },

  // Sci-fi / futuristic
  'ui-laser': {
    name: 'Laser',
    tagline: 'Sci-fi zap shot',
    duration: 0.3,
    synthParams: { synthType: 'FMSynth', note: 'C6', frequency: 1046.5, volume: -10,
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.06 },
      harmonicity: 0.5, modulationIndex: 20 },
    effects: { ...DE, distortion: { enabled: true, wet: 0.3, distortion: 0.4 } },
  },
  'ui-robot': {
    name: 'Robot Beep',
    tagline: 'Metallic digital chirp',
    duration: 0.3,
    synthParams: { synthType: 'FMSynth', note: 'E4', frequency: 329.63, volume: -12,
      envelope: { attack: 0.001, decay: 0.2, sustain: 0.1, release: 0.06 },
      harmonicity: 8, modulationIndex: 3 },
    effects: { ...DE, bitCrusher: { enabled: true, wet: 0.4, bits: 6 } },
  },
  'ui-scan': {
    name: 'Scanner',
    tagline: 'Futuristic scan sweep',
    duration: 0.5,
    synthParams: { synthType: 'AMSynth', note: 'A5', frequency: 880, volume: -14,
      envelope: { attack: 0.1, decay: 0.35, sustain: 0.1, release: 0.08 },
      harmonicity: 4 },
    effects: { ...DE, delay: { enabled: true, wet: 0.3, delayTime: 0.1, feedback: 0.2 } },
  },

  // Nature / organic
  'ui-bubble': {
    name: 'Bubble',
    tagline: 'Watery bubble pop',
    duration: 0.25,
    synthParams: { synthType: 'PluckSynth', note: 'G4', frequency: 392, volume: -12,
      envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.08 },
      attackNoise: 0.2, dampening: 6000, resonancePluck: 0.95 },
    effects: { ...DE, reverb: { enabled: true, wet: 0.25, decay: 0.5, preDelay: 0.005 } },
  },
  'ui-sparkle': {
    name: 'Sparkle',
    tagline: 'Bright magical shimmer',
    duration: 0.4,
    synthParams: { synthType: 'FMSynth', note: 'G6', frequency: 1567.98, volume: -16,
      envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.12 },
      harmonicity: 7, modulationIndex: 8 },
    effects: { ...DE, reverb: { enabled: true, wet: 0.4, decay: 1.5, preDelay: 0.005 } },
  },
  'ui-drop': {
    name: 'Water Drop',
    tagline: 'Single clean water drop',
    duration: 0.3,
    synthParams: { synthType: 'PluckSynth', note: 'D6', frequency: 1174.66, volume: -14,
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.08 },
      attackNoise: 0.1, dampening: 7000, resonancePluck: 0.9 },
    effects: { ...DE, reverb: { enabled: true, wet: 0.3, decay: 0.8, preDelay: 0.005 } },
  },

  // Ambient / background
  'ui-ambient-hum': {
    name: 'Ambient Hum',
    tagline: 'Soft atmospheric pad swell',
    duration: 4.0,
    synthParams: { synthType: 'AMSynth', note: 'A2', frequency: 110, volume: -18,
      envelope: { attack: 1.0, decay: 0.5, sustain: 0.8, release: 2.0 },
      harmonicity: 2 },
    effects: { ...DE, reverb: { enabled: true, wet: 0.6, decay: 4.0, preDelay: 0.02 } },
  },

  // Musical one-shots
  'ui-bell': {
    name: 'Bell Strike',
    tagline: 'Warm FM bell tone',
    duration: 2.0,
    synthParams: { synthType: 'FMSynth', note: 'C5', frequency: 523.25, volume: -12,
      envelope: { attack: 0.001, decay: 1.4, sustain: 0, release: 0.4 },
      harmonicity: 5, modulationIndex: 12 },
    effects: { ...DE, reverb: { enabled: true, wet: 0.35, decay: 2.5, preDelay: 0.01 } },
  },
  'ui-xylophone': {
    name: 'Xylophone Hit',
    tagline: 'Bright marimba-like mallet strike',
    duration: 1.0,
    synthParams: { synthType: 'FMSynth', note: 'C5', frequency: 523.25, volume: -12,
      envelope: { attack: 0.001, decay: 0.6, sustain: 0, release: 0.2 },
      harmonicity: 2, modulationIndex: 5 },
    effects: { ...DE, reverb: { enabled: true, wet: 0.2, decay: 1.0, preDelay: 0.01 } },
  },
  'ui-gong': {
    name: 'Gong',
    tagline: 'Deep resonant gong strike',
    duration: 3.0,
    synthParams: { synthType: 'MetalSynth', note: 'C3', frequency: 130.81, volume: -14,
      envelope: { attack: 0.005, decay: 2.5, sustain: 0, release: 0.5 },
      harmonicity: 2.5, modulationIndex: 8, resonance: 1000, octaves: 2 },
    effects: { ...DE, reverb: { enabled: true, wet: 0.5, decay: 3.5, preDelay: 0.02 } },
  },
  'ui-pluck': {
    name: 'String Pluck',
    tagline: 'Delicate single string pluck',
    duration: 1.0,
    synthParams: { synthType: 'PluckSynth', note: 'E4', frequency: 329.63, volume: -12,
      envelope: { attack: 0.001, decay: 0.6, sustain: 0, release: 0.2 },
      attackNoise: 0.5, dampening: 4000, resonancePluck: 0.85 },
    effects: { ...DE, reverb: { enabled: true, wet: 0.2, decay: 1.2, preDelay: 0.01 } },
  },
};

// ---------------------------------------------------------------------------
// Keyword → archetype map (~60 tokens)
// ---------------------------------------------------------------------------

const KEYWORD_MAP: Record<string, string> = {
  // Click / tap / press
  click: 'ui-click', tap: 'ui-click', button: 'ui-click', press: 'ui-click',
  select: 'ui-click', touch: 'ui-click-soft', soft: 'ui-click-soft',
  pop: 'ui-pop', bubble: 'ui-bubble', tick: 'ui-tick',
  // Success / confirm
  success: 'ui-success', confirm: 'ui-success', complete: 'ui-success',
  done: 'ui-success', check: 'ui-success', correct: 'ui-success',
  ding: 'ui-ding', win: 'ui-level-up', 'level up': 'ui-level-up',
  achievement: 'ui-level-up', reward: 'ui-level-up', coin: 'ui-coin',
  // Error / warning
  error: 'ui-error', fail: 'ui-error', wrong: 'ui-buzz',
  warning: 'ui-warning', alert: 'ui-warning', denied: 'ui-buzz', buzz: 'ui-buzz',
  no: 'ui-buzz', reject: 'ui-buzz',
  // Notification / ping
  notification: 'ui-ping', notify: 'ui-ping', ping: 'ui-ping',
  message: 'ui-message', chat: 'ui-message', chime: 'ui-chime', remind: 'ui-chime',
  // Hover / transition
  hover: 'ui-hover', focus: 'ui-hover', highlight: 'ui-hover',
  swoosh: 'ui-swoosh', swipe: 'ui-swoosh', slide: 'ui-whoosh', whoosh: 'ui-whoosh',
  transition: 'ui-whoosh', sweep: 'ui-whoosh',
  // Toggle / switch
  toggle: 'ui-toggle', switch: 'ui-toggle', on: 'ui-toggle', flip: 'ui-toggle',
  off: 'ui-toggle-off',
  // Delete / destructive / glitch
  delete: 'ui-delete', trash: 'ui-delete', remove: 'ui-delete',
  glitch: 'ui-glitch', corrupt: 'ui-glitch', digital: 'ui-glitch', broken: 'ui-glitch',
  destroy: 'ui-glitch',
  // Upload / download / send
  send: 'ui-send', upload: 'ui-upload', submit: 'ui-send',
  download: 'ui-upload', transfer: 'ui-upload', receive: 'ui-message',
  // Open / close
  open: 'ui-open', expand: 'ui-open', show: 'ui-open', modal: 'ui-open',
  close: 'ui-close', dismiss: 'ui-close', collapse: 'ui-close', hide: 'ui-close',
  // Ambient
  ambient: 'ui-ambient-hum', drone: 'ui-ambient-hum', hum: 'ui-ambient-hum',
  background: 'ui-ambient-hum', atmosphere: 'ui-ambient-hum',
  // Retro / game
  '8-bit': 'ui-8bit-blip', retro: 'ui-8bit-blip', arcade: 'ui-8bit-blip',
  blip: 'ui-8bit-blip', beep: 'ui-beep', boop: 'ui-beep',
  jump: 'ui-8bit-jump', 'power up': 'ui-power-up', powerup: 'ui-power-up',
  // Sci-fi
  laser: 'ui-laser', zap: 'ui-laser', 'sci-fi': 'ui-laser', scifi: 'ui-laser',
  robot: 'ui-robot', computer: 'ui-robot', cyber: 'ui-robot', synthetic: 'ui-scan',
  scanner: 'ui-scan', scan: 'ui-scan', futuristic: 'ui-scan',
  // Nature
  water: 'ui-drop', drop: 'ui-drop', rain: 'ui-drop',
  sparkle: 'ui-sparkle', shimmer: 'ui-sparkle', magical: 'ui-sparkle', fairy: 'ui-sparkle',
  wind: 'ui-swoosh', air: 'ui-swoosh',
  // Musical
  bell: 'ui-bell', xylophone: 'ui-xylophone', marimba: 'ui-xylophone',
  gong: 'ui-gong', pluck: 'ui-pluck', strum: 'ui-pluck',
  chime2: 'ui-chime', piano: 'ui-bell',
};

// ---------------------------------------------------------------------------
// Keyword search (no API required)
// ---------------------------------------------------------------------------

export function keywordSearch(query: string): SoundSuggestion[] {
  const tokens = query.toLowerCase().replace(/[^a-z0-9\s-]/g, '').split(/\s+/).filter(Boolean);

  const scores: Map<string, number> = new Map();

  for (const token of tokens) {
    // Exact keyword match
    const exact = KEYWORD_MAP[token];
    if (exact) scores.set(exact, (scores.get(exact) ?? 0) + 3);
    // Partial match — token is a substring of a keyword or vice-versa
    for (const [kw, archetype] of Object.entries(KEYWORD_MAP)) {
      if (kw !== token && (kw.includes(token) || token.includes(kw))) {
        scores.set(archetype, (scores.get(archetype) ?? 0) + 1);
      }
    }
  }

  if (scores.size === 0) {
    // No match — return three varied defaults
    return ['ui-click', 'ui-success', 'ui-ping'].map(k => ARCHETYPES[k]);
  }

  const ranked = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key]) => ARCHETYPES[key])
    .filter(Boolean);

  // Pad to 3 if needed
  const defaults = ['ui-click', 'ui-ding', 'ui-ping'];
  let i = 0;
  while (ranked.length < 3) {
    const fallback = ARCHETYPES[defaults[i++]];
    if (!ranked.includes(fallback)) ranked.push(fallback);
  }
  return ranked;
}

// ---------------------------------------------------------------------------
// Claude API search
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a synthesizer sound designer specialising in UI/UX sound effects for websites and apps — button clicks, notifications, success/error tones, hover effects, transitions, retro game SFX, etc.

Given a description, return a JSON array of EXACTLY 3 distinct preset suggestions.

Each object must match this TypeScript shape:
{
  "name": "Short Name",          // 2-4 words
  "tagline": "Brief description", // max 8 words
  "duration": 0.3,               // seconds; 0.05-1.5 for UI sounds, up to 4 for pads
  "synthParams": {
    "synthType": "Synth",        // ONLY ONE OF: Synth | FMSynth | AMSynth | MembraneSynth | MetalSynth | NoiseSynth | PluckSynth
    "note": "C4",                // standard note name, e.g. "C4", "A5"
    "frequency": 261.63,         // Hz matching the note
    "volume": -10,               // dB, typically -20 to -4; louder = closer to 0
    "envelope": { "attack": 0.001, "decay": 0.1, "sustain": 0, "release": 0.05 },
    // include ONLY the optional fields relevant to the chosen synthType:
    "noiseType": "white",        // NoiseSynth only: "white" | "brown" | "pink"
    "pitchDecay": 0.05,          // MembraneSynth only, 0.01-0.5
    "octaves": 10,               // MembraneSynth (4-12) or MetalSynth (1-8)
    "harmonicity": 5,            // FMSynth | AMSynth | MetalSynth, 0.5-16
    "modulationIndex": 10,       // FMSynth | MetalSynth, 1-32
    "resonance": 4000,           // MetalSynth only, Hz, 200-8000
    "attackNoise": 1,            // PluckSynth only, 0.1-5
    "dampening": 4000,           // PluckSynth only, Hz, 1000-8000
    "resonancePluck": 0.7        // PluckSynth only, 0.1-0.99
  },
  "effects": {
    "reverb":      { "enabled": false, "wet": 0.3,  "decay": 2,    "preDelay": 0.01 },
    "delay":       { "enabled": false, "wet": 0.3,  "delayTime": 0.25, "feedback": 0.4 },
    "distortion":  { "enabled": false, "wet": 0.5,  "distortion": 0.4 },
    "filter":      { "enabled": false, "frequency": 2000, "type": "lowpass", "Q": 1 },
    "bitCrusher":  { "enabled": false, "wet": 1.0,  "bits": 4 }
  }
}

Rules:
- Return ONLY the JSON array. No markdown. No explanation. No code fences.
- Make each of the 3 presets meaningfully distinct (different synthType or dramatically different params).
- filter "type" must be one of: "lowpass" | "highpass" | "bandpass" | "notch"
- All 3 presets must be valid JSON with all required fields present.
- For UI sounds: keep duration short (0.05-1.0s) and volume quiet (-12 to -8 dB).`;

function validateSuggestion(raw: unknown): SoundSuggestion | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.name !== 'string' || typeof r.duration !== 'number') return null;
  if (!r.synthParams || typeof r.synthParams !== 'object') return null;
  const sp = r.synthParams as Record<string, unknown>;
  const validTypes = ['Synth', 'FMSynth', 'AMSynth', 'MembraneSynth', 'MetalSynth', 'NoiseSynth', 'PluckSynth'];
  if (!validTypes.includes(sp.synthType as string)) return null;
  if (!sp.envelope || typeof sp.envelope !== 'object') return null;
  if (!r.effects || typeof r.effects !== 'object') return null;
  const eff = r.effects as Record<string, unknown>;
  // Ensure all effect slots exist (merge with defaults)
  const effects: EffectsParams = {
    reverb:     { ...DEFAULT_EFFECTS.reverb,     ...((eff.reverb     as object) ?? {}) },
    delay:      { ...DEFAULT_EFFECTS.delay,      ...((eff.delay      as object) ?? {}) },
    distortion: { ...DEFAULT_EFFECTS.distortion, ...((eff.distortion as object) ?? {}) },
    filter:     { ...DEFAULT_EFFECTS.filter,     ...((eff.filter     as object) ?? {}) },
    bitCrusher: { ...DEFAULT_EFFECTS.bitCrusher, ...((eff.bitCrusher as object) ?? {}) },
  };
  return {
    name: r.name as string,
    tagline: (r.tagline as string) ?? '',
    duration: Math.max(0.05, Math.min(6, r.duration as number)),
    synthParams: sp as unknown as SynthParams,
    effects,
  };
}

export async function claudeSearch(query: string, apiKey: string): Promise<SoundSuggestion[]> {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Design 3 synth presets that sound like: "${query}"` }],
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `API error ${resp.status}`);
  }

  const data = await resp.json() as { content: Array<{ type: string; text: string }> };
  const text = data.content.find(b => b.type === 'text')?.text ?? '';

  // Extract JSON array from response (handle cases where model wraps in markdown)
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('No JSON array found in response');

  const parsed = JSON.parse(jsonMatch[0]) as unknown[];
  const results = parsed.map(validateSuggestion).filter((s): s is SoundSuggestion => s !== null);
  if (results.length === 0) throw new Error('No valid presets in response');
  return results;
}
