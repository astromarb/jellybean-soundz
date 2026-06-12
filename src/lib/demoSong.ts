import { BeatzProject, BeatzTrack, BeatzStep, InstrumentType, NoteDuration } from '../types';

// ---------------------------------------------------------------------------
// "Jellybean Symphony" — a 32-bar showcase composition.
//
// Structure (4-chord cycle: Am – F – C – G, one chord per bar):
//   Bars  1–4   Intro     piano + pad, soft hats enter
//   Bars  5–8   Verse A   kick + bass join
//   Bars  9–12  Verse B   snare backbeat + pluck arpeggio
//   Bars 13–16  Build     strings swell, hats double, snare roll into chorus
//   Bars 17–24  Chorus    full arrangement: lead melody, choir, brass stabs
//   Bars 25–28  Bridge    stripped back: piano arps, choir + strings carry it
//   Bars 29–32  Finale    full chorus again, ends on a held whole-note chord
// ---------------------------------------------------------------------------

const BARS = 32;
const STEPS_PER_BAR = 16;
const TOTAL_STEPS = BARS * STEPS_PER_BAR;
const BPM = 122;

interface Chord {
  bass: string;
  bassOct: string;
  fifth: string;
  piano: string;     // mid-register chord voicing
  high: string;      // upper voicing for strings/choir
  arp: string[];     // chord tones for arpeggios
  lead: string[];    // melody pool for the chord
}

const PROG: Chord[] = [
  { // Am
    bass: 'A1', bassOct: 'A2', fifth: 'E2',
    piano: 'A3,C4,E4', high: 'A4,C5,E5',
    arp: ['A3', 'C4', 'E4', 'A4'],
    lead: ['A4', 'B4', 'C5', 'E5'],
  },
  { // F
    bass: 'F1', bassOct: 'F2', fifth: 'C2',
    piano: 'F3,A3,C4', high: 'F4,A4,C5',
    arp: ['F3', 'A3', 'C4', 'F4'],
    lead: ['A4', 'C5', 'F5', 'E5'],
  },
  { // C
    bass: 'C2', bassOct: 'C3', fifth: 'G2',
    piano: 'G3,C4,E4', high: 'G4,C5,E5',
    arp: ['G3', 'C4', 'E4', 'G4'],
    lead: ['G4', 'C5', 'D5', 'E5'],
  },
  { // G
    bass: 'G1', bassOct: 'G2', fifth: 'D2',
    piano: 'G3,B3,D4', high: 'G4,B4,D5',
    arp: ['G3', 'B3', 'D4', 'G4'],
    lead: ['B4', 'D5', 'G4', 'A4'],
  },
];

const chordAt = (bar: number): Chord => PROG[bar % 4];

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function emptySteps(defaultNote: string): BeatzStep[] {
  return Array.from({ length: TOTAL_STEPS }, () => ({ active: false, note: defaultNote, velocity: 1 }));
}

// Place a note: bar is 1-based for readability against the structure chart above.
function on(steps: BeatzStep[], bar: number, step: number, note: string, dur?: NoteDuration, vel = 1) {
  const idx = (bar - 1) * STEPS_PER_BAR + step;
  if (idx < 0 || idx >= TOTAL_STEPS) return;
  steps[idx] = { active: true, note, velocity: vel, duration: dur };
}

interface TrackOpts {
  volume: number;
  pan?: number;
  reverb?: number;
  delay?: number;
  color: string;
  defaultNote?: string;
}

function makeTrack(name: string, instrument: InstrumentType, opts: TrackOpts, steps: BeatzStep[]): BeatzTrack {
  return {
    id: uid('bt'),
    name,
    type: 'instrument',
    instrument,
    defaultNote: opts.defaultNote ?? 'C4',
    stepDuration: '16n',
    steps,
    volume: opts.volume,
    muted: false,
    solo: false,
    pan: opts.pan ?? 0,
    reverb: opts.reverb ?? 0,
    delay: opts.delay ?? 0,
    color: opts.color,
  };
}

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

const FULL_BARS = [...range(5, 24), ...range(29, 32)];     // bars with kick
const BACKBEAT_BARS = [...range(9, 24), ...range(29, 31)]; // bars with snare 2 & 4
const CHORUS_BARS = [...range(17, 24), ...range(29, 31)];

export function createDemoProject(): BeatzProject {
  const tracks: BeatzTrack[] = [];

  // ── Kick: four on the floor, soft single hits in the bridge ──
  {
    const s = emptySteps('C1');
    FULL_BARS.forEach(bar => {
      const vel = bar <= 8 ? 0.85 : bar <= 16 ? 0.92 : 1;
      [0, 4, 8, 12].forEach(st => on(s, bar, st, 'C1', '16n', vel));
    });
    range(25, 28).forEach(bar => on(s, bar, 0, 'C1', '16n', 0.6)); // bridge heartbeat
    on(s, 32, 0, 'C1', '4n', 1); // final downbeat
    tracks.push(makeTrack('Kick', 'Kick', { volume: -4, pan: 0, color: '#FF3B5C' }, s));
  }

  // ── Snare: backbeat on 2 & 4, 16th-note roll into the chorus ──
  {
    const s = emptySteps('C3');
    BACKBEAT_BARS.forEach(bar => {
      [4, 12].forEach(st => on(s, bar, st, 'C3', '16n', 0.9));
    });
    // Bar 16: crescendo roll on the back half
    range(8, 15).forEach(st => on(s, 16, st, 'C3', '32n', 0.35 + (st - 8) * 0.09));
    tracks.push(makeTrack('Snare', 'Snare', { volume: -8, pan: 0.05, reverb: 0.25, color: '#FF7A00' }, s));
  }

  // ── Hi-hat: offbeats, doubling to 16ths in build & chorus ──
  {
    const s = emptySteps('G5');
    range(3, 12).forEach(bar => {
      [2, 6, 10, 14].forEach(st => on(s, bar, st, 'G5', '32n', 0.6));
    });
    range(13, 15).forEach(bar => {
      [0, 2, 4, 6, 8, 10, 12, 14].forEach(st => on(s, bar, st, 'G5', '32n', st % 4 === 0 ? 0.7 : 0.45));
    });
    range(0, 15).forEach(st => on(s, 16, st, 'G5', '32n', 0.35 + st * 0.03));
    CHORUS_BARS.forEach(bar => {
      range(0, 15).forEach(st => on(s, bar, st, 'G5', '32n', st % 4 === 0 ? 0.75 : st % 2 === 0 ? 0.5 : 0.3));
    });
    tracks.push(makeTrack('Hi-Hat', 'HiHat', { volume: -16, pan: 0.35, color: '#FFB800' }, s));
  }

  // ── Bass: rolling octave groove, whole notes in the bridge ──
  {
    const s = emptySteps('A1');
    [...range(5, 24), ...range(29, 31)].forEach(bar => {
      const c = chordAt(bar - 1);
      const vel = bar >= 17 ? 1 : 0.85;
      on(s, bar, 0, c.bass, '8n', vel);
      on(s, bar, 3, c.bass, '16n', vel * 0.7);
      on(s, bar, 6, c.bassOct, '16n', vel * 0.8);
      on(s, bar, 8, c.bass, '8n', vel * 0.9);
      on(s, bar, 11, c.fifth, '16n', vel * 0.7);
      on(s, bar, 14, c.bassOct, '16n', vel * 0.75);
    });
    range(25, 28).forEach(bar => on(s, bar, 0, chordAt(bar - 1).bass, '1n', 0.6));
    on(s, 32, 0, 'A1', '1n', 0.9);
    tracks.push(makeTrack('Bass', 'Bass', { volume: -6, pan: 0, color: '#4400FF' }, s));
  }

  // ── Piano: whole-note chords → syncopated stabs → bridge arpeggios ──
  {
    const s = emptySteps('C4');
    range(1, 4).forEach(bar => on(s, bar, 0, chordAt(bar - 1).piano, '1n', 0.6));
    range(5, 12).forEach(bar => {
      const c = chordAt(bar - 1);
      on(s, bar, 0, c.piano, '2n', 0.7);
      on(s, bar, 8, c.piano, '2n', 0.65);
    });
    range(13, 16).forEach(bar => {
      const c = chordAt(bar - 1);
      const vel = 0.6 + (bar - 13) * 0.1;
      [0, 4, 8, 12].forEach(st => on(s, bar, st, c.piano, '4n', vel));
    });
    CHORUS_BARS.forEach(bar => {
      const c = chordAt(bar - 1);
      on(s, bar, 0, c.piano, '4n', 0.85);
      on(s, bar, 6, c.piano, '8n', 0.75);
      on(s, bar, 10, c.piano, '8n', 0.8);
    });
    range(25, 28).forEach(bar => {
      const c = chordAt(bar - 1);
      [0, 2, 4, 6, 8, 10, 12, 14].forEach((st, i) => on(s, bar, st, c.arp[i % 4], '8n', 0.55));
    });
    on(s, 32, 0, 'A3,C4,E4,A4', '1n', 0.9);
    tracks.push(makeTrack('Piano', 'Piano', { volume: -8, pan: -0.15, reverb: 0.2, color: '#00FF7A' }, s));
  }

  // ── Pluck: arpeggios from verse B, driving 16ths in the chorus ──
  {
    const s = emptySteps('A3');
    range(9, 16).forEach(bar => {
      const c = chordAt(bar - 1);
      const swell = bar >= 13 ? 0.1 * (bar - 12) : 0;
      [0, 2, 4, 6, 8, 10, 12, 14].forEach((st, i) =>
        on(s, bar, st, c.arp[i % 4], '16n', Math.min(1, 0.55 + swell)));
    });
    CHORUS_BARS.forEach(bar => {
      const c = chordAt(bar - 1);
      range(0, 15).forEach(st =>
        on(s, bar, st, c.arp[st % 4], '16n', st % 4 === 0 ? 0.7 : 0.5));
    });
    tracks.push(makeTrack('Pluck', 'Pluck', { volume: -12, pan: -0.4, reverb: 0.25, delay: 0.4, color: '#00E5FF' }, s));
  }

  // ── Strings: swelling held chords from the build onward ──
  {
    const s = emptySteps('A4');
    range(13, 16).forEach(bar => on(s, bar, 0, chordAt(bar - 1).high, '1n', 0.4 + (bar - 13) * 0.13));
    [...CHORUS_BARS, ...range(25, 28)].forEach(bar =>
      on(s, bar, 0, chordAt(bar - 1).high, '1n', range(25, 28).includes(bar) ? 0.5 : 0.8));
    on(s, 32, 0, 'A4,C5,E5', '1n', 0.85);
    tracks.push(makeTrack('Strings', 'Strings', { volume: -12, pan: 0.25, reverb: 0.45, color: '#7700FF' }, s));
  }

  // ── Choir: chorus + bridge halo ──
  {
    const s = emptySteps('C5');
    CHORUS_BARS.forEach(bar => on(s, bar, 0, chordAt(bar - 1).high, '1n', 0.55));
    range(25, 28).forEach(bar => on(s, bar, 0, chordAt(bar - 1).high, '1n', 0.65));
    on(s, 32, 0, 'A4,E5', '1n', 0.7);
    tracks.push(makeTrack('Choir', 'Choir', { volume: -12, pan: -0.25, reverb: 0.55, color: '#FF00CC' }, s));
  }

  // ── Brass: chorus stabs and the final hit ──
  {
    const s = emptySteps('A3');
    [17, 19, 21, 23, 29, 31].forEach(bar => {
      const c = chordAt(bar - 1);
      on(s, bar, 0, c.piano, '4n', 0.9);
      on(s, bar, 10, c.piano, '8n', 0.8);
    });
    on(s, 32, 0, 'A2,A3,C4,E4', '1n', 1);
    tracks.push(makeTrack('Brass', 'Brass', { volume: -10, pan: 0.3, reverb: 0.3, color: '#FF7A00' }, s));
  }

  // ── Lead: the chorus melody ──
  {
    const s = emptySteps('A4');
    [...range(17, 24), ...range(29, 31)].forEach(bar => {
      const c = chordAt(bar - 1);
      const phraseB = ((bar - 17) % 8) >= 4 || bar >= 29;
      if (!phraseB) {
        on(s, bar, 0, c.lead[0], '4n', 0.85);
        on(s, bar, 4, c.lead[1], '8n', 0.8);
        on(s, bar, 6, c.lead[2], '8n', 0.75);
        on(s, bar, 8, c.lead[3], '4n', 0.85);
        on(s, bar, 14, c.lead[1], '8n', 0.7);
      } else {
        on(s, bar, 0, c.lead[3], '8n', 0.85);
        on(s, bar, 2, c.lead[2], '8n', 0.8);
        on(s, bar, 4, c.lead[1], '4n', 0.85);
        on(s, bar, 10, c.lead[0], '8n', 0.75);
        on(s, bar, 12, c.lead[1], '4n', 0.8);
      }
    });
    // Bridge fill leading back into the finale
    on(s, 28, 8, 'E4', '8n', 0.5);
    on(s, 28, 10, 'G4', '8n', 0.6);
    on(s, 28, 12, 'A4', '8n', 0.7);
    on(s, 28, 14, 'C5', '8n', 0.8);
    on(s, 32, 0, 'A4', '1n', 0.9);
    tracks.push(makeTrack('Lead', 'Lead', { volume: -8, pan: 0, reverb: 0.35, delay: 0.25, color: '#00FF7A' }, s));
  }

  // ── Pad: low harmonic glue throughout ──
  {
    const s = emptySteps('A2');
    range(1, 32).forEach(bar => {
      const c = chordAt(bar - 1);
      on(s, bar, 0, `${c.bassOct},${c.piano.split(',')[0]}`, '1n', 0.35);
    });
    tracks.push(makeTrack('Pad', 'Pad', { volume: -16, pan: 0.1, reverb: 0.5, color: '#0095FF' }, s));
  }

  return {
    id: uid('bp'),
    name: 'Jellybean Symphony',
    bpm: BPM,
    bars: BARS,
    stepsPerBar: STEPS_PER_BAR,
    tracks,
    createdAt: Date.now(),
  };
}
