import * as Tone from 'tone';
import { SynthParams, EffectsParams, SynthType } from '../types';
import { audioBufferToWav } from './wavEncoder';

export type ToneSynth =
  | Tone.Synth
  | Tone.FMSynth
  | Tone.AMSynth
  | Tone.MembraneSynth
  | Tone.MetalSynth
  | Tone.NoiseSynth
  | Tone.PluckSynth;

function createSynth(params: SynthParams): ToneSynth {
  const { synthType, volume, envelope } = params;

  switch (synthType) {
    case 'Synth':
      return new Tone.Synth({
        volume,
        envelope: {
          attack: envelope.attack,
          decay: envelope.decay,
          sustain: envelope.sustain,
          release: envelope.release,
        },
      });

    case 'FMSynth':
      return new Tone.FMSynth({
        volume,
        envelope: {
          attack: envelope.attack,
          decay: envelope.decay,
          sustain: envelope.sustain,
          release: envelope.release,
        },
        harmonicity: params.harmonicity ?? 3,
        modulationIndex: params.modulationIndex ?? 10,
      });

    case 'AMSynth':
      return new Tone.AMSynth({
        volume,
        envelope: {
          attack: envelope.attack,
          decay: envelope.decay,
          sustain: envelope.sustain,
          release: envelope.release,
        },
        harmonicity: params.harmonicity ?? 3,
      });

    case 'MembraneSynth':
      return new Tone.MembraneSynth({
        volume,
        envelope: {
          attack: envelope.attack,
          decay: envelope.decay,
          sustain: envelope.sustain,
          release: envelope.release,
        },
        pitchDecay: params.pitchDecay ?? 0.05,
        octaves: params.octaves ?? 10,
      });

    case 'MetalSynth':
      return new Tone.MetalSynth({
        volume,
        envelope: {
          attack: envelope.attack,
          decay: envelope.decay,
          sustain: envelope.sustain,
          release: envelope.release,
        },
        harmonicity: params.harmonicity ?? 5.1,
        modulationIndex: params.modulationIndex ?? 32,
        resonance: params.resonance ?? 4000,
        octaves: params.octaves ?? 1.5,
      });

    case 'NoiseSynth':
      return new Tone.NoiseSynth({
        volume,
        noise: {
          type: (params.noiseType ?? 'white') as 'white' | 'brown' | 'pink',
        },
        envelope: {
          attack: envelope.attack,
          decay: envelope.decay,
          sustain: envelope.sustain,
          release: envelope.release,
        },
      });

    case 'PluckSynth':
      return new Tone.PluckSynth({
        volume,
        attackNoise: params.attackNoise ?? 1,
        dampening: params.dampening ?? 4000,
        resonance: params.resonancePluck ?? 0.7,
      });

    default:
      return new Tone.Synth({ volume });
  }
}

function buildEffectsChain(
  effects: EffectsParams
): Tone.ToneAudioNode[] {
  const chain: Tone.ToneAudioNode[] = [];

  if (effects.filter.enabled) {
    const filter = new Tone.Filter({
      frequency: effects.filter.frequency,
      type: effects.filter.type,
      Q: effects.filter.Q,
    });
    chain.push(filter);
  }

  if (effects.distortion.enabled) {
    const dist = new Tone.Distortion(effects.distortion.distortion);
    dist.wet.value = effects.distortion.wet;
    chain.push(dist);
  }

  if (effects.bitCrusher.enabled) {
    const bc = new Tone.BitCrusher(effects.bitCrusher.bits);
    bc.wet.value = effects.bitCrusher.wet;
    chain.push(bc);
  }

  if (effects.delay.enabled) {
    const delay = new Tone.FeedbackDelay({
      delayTime: effects.delay.delayTime,
      feedback: effects.delay.feedback,
      wet: effects.delay.wet,
    });
    chain.push(delay);
  }

  if (effects.reverb.enabled) {
    const reverb = new Tone.Reverb({
      decay: effects.reverb.decay,
      preDelay: effects.reverb.preDelay,
      wet: effects.reverb.wet,
    });
    chain.push(reverb);
  }

  return chain;
}

// Live preview (real-time)
let liveSynth: ToneSynth | null = null;
let liveChain: Tone.ToneAudioNode[] = [];

export function stopLivePreview(): void {
  if (liveSynth) {
    try {
      liveSynth.triggerRelease();
    } catch (_) {}
    setTimeout(() => {
      if (liveSynth) {
        liveSynth.dispose();
        liveSynth = null;
      }
      liveChain.forEach((node) => node.dispose());
      liveChain = [];
    }, 300);
  }
}

export async function startLivePreview(
  synthParams: SynthParams,
  effects: EffectsParams
): Promise<void> {
  await Tone.start();
  stopLivePreview();

  await new Promise((r) => setTimeout(r, 50));

  const synth = createSynth(synthParams);
  const chain = buildEffectsChain(effects);

  if (chain.length > 0) {
    synth.connect(chain[0]);
    for (let i = 0; i < chain.length - 1; i++) {
      chain[i].connect(chain[i + 1]);
    }
    chain[chain.length - 1].toDestination();
  } else {
    synth.toDestination();
  }

  liveSynth = synth;
  liveChain = chain;

  const isNoise = synthParams.synthType === 'NoiseSynth';
  const isMetal = synthParams.synthType === 'MetalSynth';

  if (isNoise) {
    (synth as Tone.NoiseSynth).triggerAttack(Tone.now());
  } else if (isMetal) {
    (synth as Tone.MetalSynth).triggerAttack(synthParams.note, Tone.now());
  } else {
    (synth as Tone.Synth).triggerAttack(synthParams.note);
  }
}

// Offline render → WAV blob
export async function renderSoundToWav(
  synthParams: SynthParams,
  effects: EffectsParams,
  duration: number = 2
): Promise<Blob> {
  const offlineBuffer = await Tone.Offline(async (context) => {
    const synth = createSynthForContext(synthParams, context);
    const chain = buildEffectsChainForContext(effects, context);

    if (chain.length > 0) {
      synth.connect(chain[0]);
      for (let i = 0; i < chain.length - 1; i++) {
        chain[i].connect(chain[i + 1]);
      }
      chain[chain.length - 1].toDestination();
    } else {
      synth.toDestination();
    }

    const isNoise = synthParams.synthType === 'NoiseSynth';
    const isMetal = synthParams.synthType === 'MetalSynth';
    const noteDuration = Math.min(duration * 0.8, 1.5);

    if (isNoise) {
      (synth as Tone.NoiseSynth).triggerAttackRelease(noteDuration, Tone.now());
    } else if (isMetal) {
      (synth as Tone.MetalSynth).triggerAttackRelease(synthParams.note, noteDuration);
    } else {
      (synth as Tone.Synth).triggerAttackRelease(synthParams.note, noteDuration);
    }
  }, duration);

  // offlineBuffer is a ToneAudioBuffer, get the underlying AudioBuffer
  const audioBuffer = offlineBuffer.get();
  if (!audioBuffer) throw new Error('Failed to render audio');
  return audioBufferToWav(audioBuffer);
}

// Helpers that work with the offline context
function createSynthForContext(params: SynthParams, _ctx: Tone.BaseContext): ToneSynth {
  // Tone.Offline sets up its own context internally, so we just create normally
  return createSynth(params);
}

function buildEffectsChainForContext(effects: EffectsParams, _ctx: Tone.BaseContext): Tone.ToneAudioNode[] {
  return buildEffectsChain(effects);
}

// Play a WAV blob
export async function playAudioBlob(blob: Blob): Promise<Tone.Player> {
  await Tone.start();
  const url = URL.createObjectURL(blob);
  const player = new Tone.Player(url).toDestination();
  await Tone.loaded();
  player.start();
  player.onstop = () => {
    player.dispose();
    URL.revokeObjectURL(url);
  };
  return player;
}

export const SYNTH_TYPES: SynthType[] = [
  'Synth',
  'FMSynth',
  'AMSynth',
  'MembraneSynth',
  'MetalSynth',
  'NoiseSynth',
  'PluckSynth',
];
