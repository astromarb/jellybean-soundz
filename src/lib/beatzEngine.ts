import * as Tone from 'tone';
import type { BeatzProject, BeatzTrack, InstrumentType, Sound } from '../types';
import { getAudioBlob } from './db';
import { audioBufferToWav } from './wavEncoder';

// Instrument emoji badges for UI use
export const INSTRUMENT_EMOJI: Record<InstrumentType, string> = {
  Piano: '🎹', Violin: '🎻', Cello: '🎻', Choir: '🎤',
  Brass: '🎺', Flute: '🪈', Lead: '🎸', Pad: '🌊', Bass: '🔊', Arp: '✨',
  Strings: '🎻', Pluck: '🪕', Kick: '🥁', Snare: '🥁', HiHat: '🎩',
};

// Instrument descriptions for UI
export const INSTRUMENT_LABEL: Record<InstrumentType, string> = {
  Piano: 'Piano', Violin: 'Violin', Cello: 'Cello', Choir: 'Choir',
  Brass: 'Brass', Flute: 'Flute', Lead: 'Lead Synth', Pad: 'Synth Pad', Bass: 'Bass', Arp: 'Arp',
  Strings: 'Strings', Pluck: 'Synth Pluck', Kick: 'Kick Drum', Snare: 'Snare Drum', HiHat: 'Hi-Hat',
};

type AnySynth =
  | Tone.PolySynth
  | Tone.Synth
  | Tone.MembraneSynth
  | Tone.MetalSynth
  | Tone.NoiseSynth;

// Create a Tone.js synth preset for an instrument type
export function createInstrumentSynth(type: InstrumentType): AnySynth {
  switch (type) {
    case 'Piano':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 1.2, sustain: 0.3, release: 1.5 },
        volume: -6,
      });
    case 'Violin':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.15, decay: 0.05, sustain: 0.9, release: 0.4 },
        volume: -8,
      });
    case 'Cello':
      return new Tone.PolySynth(Tone.AMSynth, {
        harmonicity: 2.5,
        envelope: { attack: 0.2, decay: 0.1, sustain: 0.85, release: 0.6 },
        volume: -7,
      });
    case 'Choir':
      return new Tone.PolySynth(Tone.AMSynth, {
        harmonicity: 3.5,
        envelope: { attack: 0.5, decay: 0.1, sustain: 0.9, release: 0.8 },
        volume: -6,
      });
    case 'Brass':
      return new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 1,
        modulationIndex: 2,
        envelope: { attack: 0.04, decay: 0.1, sustain: 0.9, release: 0.3 },
        volume: -6,
      });
    case 'Flute':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.08, decay: 0.1, sustain: 0.8, release: 0.3 },
        volume: -10,
      });
    case 'Lead':
      return new Tone.Synth({
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
        volume: -8,
      });
    case 'Pad':
      return new Tone.PolySynth(Tone.AMSynth, {
        harmonicity: 2.5,
        envelope: { attack: 0.8, decay: 0.3, sustain: 0.9, release: 2.0 },
        volume: -10,
      });
    case 'Bass':
      return new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.3 },
        volume: -4,
      });
    case 'Arp':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'square8' },
        envelope: { attack: 0.002, decay: 0.15, sustain: 0.3, release: 0.2 },
        volume: -10,
      });
    case 'Strings':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'fatsawtooth', count: 3, spread: 30 } as Tone.OmniOscillatorOptions,
        envelope: { attack: 0.4, decay: 0.2, sustain: 0.9, release: 1.4 },
        volume: -10,
      });
    case 'Pluck':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.002, decay: 0.25, sustain: 0.05, release: 0.3 },
        volume: -8,
      });
    case 'Kick':
      return new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 8,
        envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 0.4 },
        volume: -2,
      });
    case 'Snare':
      return new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.08 },
        volume: -8,
      });
    case 'HiHat':
      return new Tone.MetalSynth({
        envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 },
        harmonicity: 5.1,
        modulationIndex: 32,
        resonance: 4000,
        octaves: 1.5,
        volume: -16,
      });
  }
}

// Trigger a note (or comma-separated chord) on an instrument synth.
export function triggerInstrument(
  synth: AnySynth,
  type: InstrumentType,
  note: string,
  dur: string,
  time?: number,
  velocity: number = 1
): void {
  if (type === 'Snare') {
    (synth as Tone.NoiseSynth).triggerAttackRelease(dur, time, velocity);
    return;
  }
  if (type === 'HiHat') {
    (synth as Tone.MetalSynth).triggerAttackRelease(note || 'G5', dur, time, velocity);
    return;
  }
  if (type === 'Kick') {
    (synth as Tone.MembraneSynth).triggerAttackRelease(note || 'C1', dur, time, velocity);
    return;
  }
  const notes = note.includes(',') ? note.split(',').map(n => n.trim()).filter(Boolean) : note;
  if (synth instanceof Tone.PolySynth) {
    synth.triggerAttackRelease(notes, dur, time, velocity);
  } else {
    const single = Array.isArray(notes) ? notes[0] : notes;
    (synth as Tone.Synth).triggerAttackRelease(single, dur, time, velocity);
  }
}

// When any track is soloed, only solo tracks play; otherwise mute filters.
function isTrackAudible(track: BeatzTrack, anySolo: boolean): boolean {
  return anySolo ? !!track.solo : !track.muted;
}

// Live playback state management
let activeSequences: Tone.Sequence<unknown>[] = [];
let activeNodes: Tone.ToneAudioNode[] = [];
let activeObjectUrls: string[] = [];

export function stopBeatz(): void {
  Tone.getTransport().stop();
  Tone.getTransport().cancel();
  activeSequences.forEach(s => { try { s.stop(); s.dispose(); } catch (_) {} });
  activeNodes.forEach(n => { try { n.dispose(); } catch (_) {} });
  activeObjectUrls.forEach(url => URL.revokeObjectURL(url));
  activeSequences = [];
  activeNodes = [];
  activeObjectUrls = [];
}

export function pauseBeatz(): void {
  Tone.getTransport().pause();
}

export function resumeBeatz(): void {
  Tone.getTransport().start();
}

// Play the project live using Tone.Transport + Tone.Sequence
export async function startBeatz(
  project: BeatzProject,
  sounds: Sound[],
  onStepTick: (step: number) => void  // called each 16th note to update UI position
): Promise<void> {
  void sounds; // sounds param reserved for future use
  await Tone.start();
  stopBeatz();

  const transport = Tone.getTransport();
  transport.bpm.value = project.bpm;
  transport.loop = true;
  transport.loopStart = '0m';
  transport.loopEnd = `${project.bars}m`;

  const totalSteps = project.bars * project.stepsPerBar;
  const anySolo = project.tracks.some(t => t.solo);

  // Master bus: gentle glue compression + brickwall limiter for a mastered output
  const masterLimiter = new Tone.Limiter(-1).toDestination();
  const masterComp = new Tone.Compressor({ threshold: -18, ratio: 3, attack: 0.01, release: 0.2 });
  masterComp.connect(masterLimiter);
  activeNodes.push(masterComp, masterLimiter);

  // Shared FX send buses
  const reverbBus = new Tone.Reverb({ decay: 2.6, preDelay: 0.02 });
  reverbBus.wet.value = 1;
  reverbBus.connect(masterComp);
  const delayBus = new Tone.FeedbackDelay('8n.', 0.3);
  delayBus.wet.value = 1;
  delayBus.connect(masterComp);
  activeNodes.push(reverbBus, delayBus);
  try { await reverbBus.generate(); } catch (_) {}

  // Tick sequence for UI position tracking
  const tickArr = Array.from({ length: totalSteps }, (_, i) => i);
  const tickSeq = new Tone.Sequence((_, step) => { onStepTick(step as number); }, tickArr, '16n');
  tickSeq.start(0);
  activeSequences.push(tickSeq as Tone.Sequence<unknown>);

  for (const track of project.tracks) {
    if (!isTrackAudible(track, anySolo)) continue;

    const channel = new Tone.Channel(track.volume, track.pan ?? 0);
    channel.connect(masterComp);
    activeNodes.push(channel);

    if ((track.reverb ?? 0) > 0) {
      const send = new Tone.Gain(track.reverb!);
      channel.connect(send);
      send.connect(reverbBus);
      activeNodes.push(send);
    }
    if ((track.delay ?? 0) > 0) {
      const send = new Tone.Gain(track.delay!);
      channel.connect(send);
      send.connect(delayBus);
      activeNodes.push(send);
    }

    if (track.type === 'instrument') {
      const synth = createInstrumentSynth(track.instrument!);
      synth.connect(channel);
      activeNodes.push(synth);

      // Build the steps array for Tone.Sequence — each active step carries note + duration + velocity
      const stepsArr = track.steps.slice(0, totalSteps).map(s =>
        s.active
          ? { note: s.note || track.defaultNote, dur: s.duration || track.stepDuration || '16n', vel: s.velocity ?? 1 }
          : null
      );

      const instr = track.instrument!;
      const seq = new Tone.Sequence(
        (time, val) => {
          if (!val) return;
          const { note, dur, vel } = val as { note: string; dur: string; vel: number };
          triggerInstrument(synth, instr, note, dur, time, vel);
        },
        stepsArr,
        '16n'
      );
      seq.start(0);
      activeSequences.push(seq as Tone.Sequence<unknown>);

    } else if (track.type === 'sound' && track.soundId) {
      const blob = await getAudioBlob(track.soundId);
      if (!blob) continue;

      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await Tone.context.rawContext.decodeAudioData(arrayBuffer);
      const toneBuffer = new Tone.ToneAudioBuffer(audioBuffer);

      const stepsArr = track.steps.slice(0, totalSteps).map(s => s.active ? true : null);

      const seq = new Tone.Sequence(
        (time, active) => {
          if (!active) return;
          // Create a one-shot player from pre-decoded buffer each hit
          const player = new Tone.Player(toneBuffer).connect(channel);
          player.start(time);
          // Schedule dispose after sound finishes
          const disposeAt = audioBuffer.duration + 0.5;
          setTimeout(() => {
            try { player.dispose(); } catch (_) {}
          }, disposeAt * 1000);
        },
        stepsArr,
        '16n'
      );
      seq.start(0);
      activeSequences.push(seq as Tone.Sequence<unknown>);
    }
  }

  transport.start('+0.05');
}

// Export the full mix as a WAV blob
export async function exportBeatz(project: BeatzProject, sounds: Sound[]): Promise<Blob> {
  void sounds; // reserved for future use
  const bpmInSeconds = 60 / project.bpm;
  const stepDuration = bpmInSeconds / 4; // 16th note
  const totalSteps = project.bars * project.stepsPerBar;
  const totalDuration = totalSteps * stepDuration + 2.5; // tail for reverb/release

  const sampleRate = 44100;
  const offlineCtx = new OfflineAudioContext(2, Math.ceil(totalDuration * sampleRate), sampleRate);
  const anySolo = project.tracks.some(t => t.solo);

  // Master chain: glue compressor + limiter-style compressor for a mastered mix
  const masterComp = offlineCtx.createDynamicsCompressor();
  masterComp.threshold.value = -18;
  masterComp.ratio.value = 3;
  masterComp.attack.value = 0.01;
  masterComp.release.value = 0.2;
  const limiter = offlineCtx.createDynamicsCompressor();
  limiter.threshold.value = -1.5;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.1;
  masterComp.connect(limiter);
  limiter.connect(offlineCtx.destination);

  for (const track of project.tracks) {
    if (!isTrackAudible(track, anySolo)) continue;

    const gainNode = offlineCtx.createGain();
    gainNode.gain.value = Math.pow(10, track.volume / 20);
    const panner = offlineCtx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, track.pan ?? 0));
    gainNode.connect(panner);
    panner.connect(masterComp);

    // Simple feedback delay send (native nodes) for sound tracks; instrument
    // tracks get their FX rendered inside Tone.Offline below.
    if (track.type === 'sound' && track.soundId) {
      const blob = await getAudioBlob(track.soundId);
      if (!blob) continue;

      const ab = await blob.arrayBuffer();
      const audioBuffer = await offlineCtx.decodeAudioData(ab);

      track.steps.slice(0, totalSteps).forEach((step, i) => {
        if (!step.active) return;
        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffer;
        const velGain = offlineCtx.createGain();
        velGain.gain.value = step.velocity ?? 1;
        source.connect(velGain);
        velGain.connect(gainNode);
        source.start(i * stepDuration);
      });

    } else if (track.type === 'instrument') {
      // Render instrument track (with its FX sends) via Tone.Offline, then mix in
      try {
        const instrBuffer = await renderInstrumentTrack(track, project, totalDuration);
        if (!instrBuffer) continue;
        const source = offlineCtx.createBufferSource();
        source.buffer = instrBuffer;
        source.connect(gainNode);
        source.start(0);
      } catch (err) {
        console.warn('Could not render instrument track:', track.name, err);
      }
    }
  }

  const rendered = await offlineCtx.startRendering();
  return audioBufferToWav(rendered);
}

async function renderInstrumentTrack(
  track: BeatzTrack,
  project: BeatzProject,
  totalDuration: number
): Promise<AudioBuffer | null> {
  const toneBuffer = await Tone.Offline(async () => {
    const synth = createInstrumentSynth(track.instrument!);

    // Per-track FX chain rendered offline (wet acts as dry/wet mix here)
    let tail: Tone.ToneAudioNode = synth;
    if ((track.delay ?? 0) > 0) {
      const delay = new Tone.FeedbackDelay('8n.', 0.3);
      delay.wet.value = Math.min(1, track.delay!);
      tail.connect(delay);
      tail = delay;
    }
    if ((track.reverb ?? 0) > 0) {
      const reverb = new Tone.Reverb({ decay: 2.6, preDelay: 0.02 });
      reverb.wet.value = Math.min(1, track.reverb!);
      tail.connect(reverb);
      tail = reverb;
      try { await reverb.generate(); } catch (_) {}
    }
    tail.toDestination();

    Tone.getTransport().bpm.value = project.bpm;

    const totalSteps = project.bars * project.stepsPerBar;
    const events: [string, { note: string; dur: string; vel: number }][] = [];

    track.steps.slice(0, totalSteps).forEach((step, i) => {
      if (!step.active) return;
      const bar = Math.floor(i / project.stepsPerBar);
      const stepInBar = i % project.stepsPerBar;
      const beat = Math.floor(stepInBar / 4);
      const sixteenth = stepInBar % 4;
      events.push([`${bar}:${beat}:${sixteenth}`, {
        note: step.note || track.defaultNote,
        dur: step.duration || track.stepDuration || '16n',
        vel: step.velocity ?? 1,
      }]);
    });

    if (events.length === 0) return;

    const instr = track.instrument!;
    const part = new Tone.Part((time, val) => {
      const { note, dur, vel } = val as { note: string; dur: string; vel: number };
      triggerInstrument(synth, instr, note, dur, time, vel);
    }, events);
    part.start(0);
    Tone.getTransport().start();
  }, totalDuration);

  return toneBuffer.get() ?? null;
}
