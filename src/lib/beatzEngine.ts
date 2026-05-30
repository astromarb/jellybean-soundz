import * as Tone from 'tone';
import type { BeatzProject, BeatzTrack, InstrumentType, Sound } from '../types';
import { getAudioBlob } from './db';
import { audioBufferToWav } from './wavEncoder';

// Instrument emoji badges for UI use
export const INSTRUMENT_EMOJI: Record<InstrumentType, string> = {
  Piano: '🎹', Violin: '🎻', Cello: '🎻', Choir: '🎤',
  Brass: '🎺', Flute: '🪈', Lead: '🎸', Pad: '🌊', Bass: '🔊', Arp: '✨',
};

// Instrument descriptions for UI
export const INSTRUMENT_LABEL: Record<InstrumentType, string> = {
  Piano: 'Piano', Violin: 'Violin', Cello: 'Cello', Choir: 'Choir',
  Brass: 'Brass', Flute: 'Flute', Lead: 'Lead Synth', Pad: 'Synth Pad', Bass: 'Bass', Arp: 'Arp',
};

// Create a Tone.js synth preset for an instrument type
export function createInstrumentSynth(type: InstrumentType): Tone.PolySynth | Tone.Synth {
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
  }
}

// Live playback state management
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let activeSequences: Tone.Sequence<any>[] = [];
let activeChannels: Tone.Channel[] = [];
let activeSynths: (Tone.PolySynth | Tone.Synth)[] = [];
let activeObjectUrls: string[] = [];

export function stopBeatz(): void {
  Tone.getTransport().stop();
  Tone.getTransport().cancel();
  activeSequences.forEach(s => { try { s.stop(); s.dispose(); } catch (_) {} });
  activeSynths.forEach(s => { try { s.dispose(); } catch (_) {} });
  activeChannels.forEach(c => { try { c.dispose(); } catch (_) {} });
  activeObjectUrls.forEach(url => URL.revokeObjectURL(url));
  activeSequences = [];
  activeSynths = [];
  activeChannels = [];
  activeObjectUrls = [];
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

  // Tick sequence for UI position tracking
  const tickArr = Array.from({ length: totalSteps }, (_, i) => i);
  const tickSeq = new Tone.Sequence((_, step) => { onStepTick(step as number); }, tickArr, '16n');
  tickSeq.start(0);
  activeSequences.push(tickSeq);

  for (const track of project.tracks) {
    if (track.muted) continue;

    const channel = new Tone.Channel(track.volume, 0).toDestination();
    activeChannels.push(channel);

    if (track.type === 'instrument') {
      const synth = createInstrumentSynth(track.instrument!);
      synth.connect(channel);
      activeSynths.push(synth as Tone.PolySynth | Tone.Synth);

      // Build the steps array for Tone.Sequence — each active step carries note + duration
      const stepsArr = track.steps.slice(0, totalSteps).map(s =>
        s.active ? { note: s.note || track.defaultNote, dur: s.duration || track.stepDuration || '16n' } : null
      );

      const seq = new Tone.Sequence(
        (time, val) => {
          if (!val) return;
          const { note, dur } = val as { note: string; dur: string };
          (synth as Tone.PolySynth).triggerAttackRelease(note, dur, time);
        },
        stepsArr,
        '16n'
      );
      seq.start(0);
      activeSequences.push(seq);

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
      activeSequences.push(seq);
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
  const totalDuration = totalSteps * stepDuration + 1.5; // +1.5s tail for reverb/release

  const sampleRate = 44100;
  const offlineCtx = new OfflineAudioContext(2, Math.ceil(totalDuration * sampleRate), sampleRate);

  for (const track of project.tracks) {
    if (track.muted) continue;

    const gainNode = offlineCtx.createGain();
    gainNode.gain.value = Math.pow(10, track.volume / 20);
    gainNode.connect(offlineCtx.destination);

    if (track.type === 'sound' && track.soundId) {
      const blob = await getAudioBlob(track.soundId);
      if (!blob) continue;

      const ab = await blob.arrayBuffer();
      const audioBuffer = await offlineCtx.decodeAudioData(ab);

      track.steps.slice(0, totalSteps).forEach((step, i) => {
        if (!step.active) return;
        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(gainNode);
        source.start(i * stepDuration);
      });

    } else if (track.type === 'instrument') {
      // Render instrument track via Tone.Offline then mix in
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
  const toneBuffer = await Tone.Offline(() => {
    const synth = createInstrumentSynth(track.instrument!);
    synth.toDestination();

    Tone.getTransport().bpm.value = project.bpm;

    const totalSteps = project.bars * project.stepsPerBar;
    const events: [string, { note: string; dur: string }][] = [];

    track.steps.slice(0, totalSteps).forEach((step, i) => {
      if (!step.active) return;
      const bar = Math.floor(i / project.stepsPerBar);
      const stepInBar = i % project.stepsPerBar;
      const beat = Math.floor(stepInBar / 4);
      const sixteenth = stepInBar % 4;
      events.push([`${bar}:${beat}:${sixteenth}`, {
        note: step.note || track.defaultNote,
        dur: step.duration || track.stepDuration || '16n',
      }]);
    });

    if (events.length === 0) return;

    const part = new Tone.Part((time, val) => {
      const { note, dur } = val as { note: string; dur: string };
      (synth as Tone.PolySynth).triggerAttackRelease(note, dur, time);
    }, events);
    part.start(0);
    Tone.getTransport().start();
  }, totalDuration);

  return toneBuffer.get() ?? null;
}
