import React from 'react';
import { SynthParams, SynthType, NOTE_NAMES, SYNTH_TYPES, PresetName } from '../types';

const PRESETS: Record<PresetName, Partial<SynthParams>> = {
  Kick: {
    synthType: 'MembraneSynth',
    note: 'C1',
    frequency: 32.7,
    volume: -2,
    envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.1 },
    pitchDecay: 0.08,
    octaves: 10,
  },
  Snare: {
    synthType: 'NoiseSynth',
    note: 'A3',
    frequency: 220,
    volume: -6,
    envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 },
    noiseType: 'white',
  },
  'Hi-Hat': {
    synthType: 'MetalSynth',
    note: 'A5',
    frequency: 880,
    volume: -12,
    envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.03 },
    harmonicity: 5.1,
    modulationIndex: 32,
    resonance: 4000,
    octaves: 1.5,
  },
  Clap: {
    synthType: 'NoiseSynth',
    note: 'A4',
    frequency: 440,
    volume: -8,
    envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.1 },
    noiseType: 'white',
  },
  Bass: {
    synthType: 'Synth',
    note: 'E2',
    frequency: 82.41,
    volume: -4,
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.3 },
  },
  Lead: {
    synthType: 'Synth',
    note: 'A4',
    frequency: 440,
    volume: -8,
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.4 },
  },
  Pad: {
    synthType: 'AMSynth',
    note: 'C4',
    frequency: 261.63,
    volume: -10,
    envelope: { attack: 0.5, decay: 0.3, sustain: 0.8, release: 1.2 },
    harmonicity: 3,
  },
  Laser: {
    synthType: 'Synth',
    note: 'C6',
    frequency: 1046.5,
    volume: -8,
    envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 },
  },
  Whoosh: {
    synthType: 'NoiseSynth',
    note: 'A3',
    frequency: 220,
    volume: -6,
    envelope: { attack: 0.1, decay: 0.5, sustain: 0.1, release: 0.8 },
    noiseType: 'pink',
  },
};

// Export SYNTH_TYPES from types
export { SYNTH_TYPES };

interface SynthControlsProps {
  params: SynthParams;
  onChange: (params: SynthParams) => void;
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  formatValue,
  color,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  formatValue?: (v: number) => string;
  color?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 w-16 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="slider-thumb flex-1"
        style={
          {
            '--slider-color': color ?? '#7700FF',
            '--slider-pct': `${pct}%`,
          } as React.CSSProperties
        }
      />
      <span className="text-xs font-mono text-gray-300 w-12 text-right shrink-0">
        {formatValue ? formatValue(value) : value.toFixed(2)}
      </span>
    </div>
  );
}

export default function SynthControls({ params, onChange }: SynthControlsProps) {
  const noteIndex = NOTE_NAMES.indexOf(params.note);

  const updateField = <K extends keyof SynthParams>(key: K, value: SynthParams[K]) => {
    onChange({ ...params, [key]: value });
  };

  const updateEnvelope = (key: keyof typeof params.envelope, value: number) => {
    onChange({ ...params, envelope: { ...params.envelope, [key]: value } });
  };

  const applyPreset = (presetName: PresetName) => {
    const preset = PRESETS[presetName];
    onChange({ ...params, ...preset });
  };

  const handleNoteSlider = (idx: number) => {
    const note = NOTE_NAMES[Math.round(idx)];
    // Compute frequency from note (A4 = 440 Hz)
    const semitones = Math.round(idx) - NOTE_NAMES.indexOf('A4');
    const freq = 440 * Math.pow(2, semitones / 12);
    onChange({ ...params, note, frequency: parseFloat(freq.toFixed(2)) });
  };

  const isNoise = params.synthType === 'NoiseSynth';
  const isMembrane = params.synthType === 'MembraneSynth';
  const isMetal = params.synthType === 'MetalSynth';
  const isFM = params.synthType === 'FMSynth';
  const isAM = params.synthType === 'AMSynth';
  const isPluck = params.synthType === 'PluckSynth';

  return (
    <div className="space-y-4">
      {/* Presets */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Presets</div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(PRESETS) as PresetName[]).map((name) => (
            <button
              key={name}
              onClick={() => applyPreset(name)}
              className="px-2 py-1 text-xs rounded-md bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 hover:border-gray-600 transition-all"
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Synth Type */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Synth Type</div>
        <select
          value={params.synthType}
          onChange={(e) => updateField('synthType', e.target.value as SynthType)}
          className="w-full bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500 transition-colors"
        >
          {SYNTH_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Note / Frequency */}
      {!isNoise && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">
            Note / Frequency
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-mono font-bold text-violet-400 w-12">{params.note}</span>
            <span className="text-xs text-gray-500 font-mono">{params.frequency.toFixed(1)} Hz</span>
          </div>
          <Slider
            label="Note"
            value={noteIndex}
            min={0}
            max={NOTE_NAMES.length - 1}
            step={1}
            onChange={handleNoteSlider}
            formatValue={(v) => NOTE_NAMES[Math.round(v)] ?? ''}
            color="#7700FF"
          />
        </div>
      )}

      {/* Noise type */}
      {isNoise && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Noise Type</div>
          <div className="flex gap-2">
            {(['white', 'brown', 'pink'] as const).map((t) => (
              <button
                key={t}
                onClick={() => updateField('noiseType', t)}
                className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${
                  params.noiseType === t
                    ? 'bg-violet-600 border-violet-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Volume */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Volume</div>
        <Slider
          label="dB"
          value={params.volume}
          min={-40}
          max={0}
          step={0.5}
          onChange={(v) => updateField('volume', v)}
          formatValue={(v) => `${v.toFixed(1)}dB`}
          color="#00C8FF"
        />
      </div>

      {/* ADSR Envelope */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">ADSR Envelope</div>
        <div className="space-y-2">
          <Slider label="Attack" value={params.envelope.attack} min={0.001} max={2} step={0.001} onChange={(v) => updateEnvelope('attack', v)} formatValue={(v) => `${v.toFixed(3)}s`} color="#00FF7A" />
          <Slider label="Decay" value={params.envelope.decay} min={0.001} max={2} step={0.001} onChange={(v) => updateEnvelope('decay', v)} formatValue={(v) => `${v.toFixed(3)}s`} color="#FFB800" />
          <Slider label="Sustain" value={params.envelope.sustain} min={0} max={1} step={0.01} onChange={(v) => updateEnvelope('sustain', v)} formatValue={(v) => `${(v * 100).toFixed(0)}%`} color="#FF7A00" />
          <Slider label="Release" value={params.envelope.release} min={0.001} max={4} step={0.001} onChange={(v) => updateEnvelope('release', v)} formatValue={(v) => `${v.toFixed(3)}s`} color="#FF3B5C" />
        </div>
      </div>

      {/* FM/AM specific */}
      {(isFM || isAM) && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Modulation</div>
          <div className="space-y-2">
            <Slider label="Harm." value={params.harmonicity ?? 3} min={0.5} max={10} step={0.1} onChange={(v) => updateField('harmonicity', v)} formatValue={(v) => v.toFixed(1)} color="#AA00FF" />
            {isFM && (
              <Slider label="Mod.Idx" value={params.modulationIndex ?? 10} min={0} max={50} step={0.5} onChange={(v) => updateField('modulationIndex', v)} formatValue={(v) => v.toFixed(1)} color="#FF00CC" />
            )}
          </div>
        </div>
      )}

      {/* Membrane specific */}
      {isMembrane && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Membrane</div>
          <div className="space-y-2">
            <Slider label="PitchDcy" value={params.pitchDecay ?? 0.05} min={0.001} max={0.5} step={0.001} onChange={(v) => updateField('pitchDecay', v)} formatValue={(v) => v.toFixed(3)} color="#FF3B5C" />
            <Slider label="Octaves" value={params.octaves ?? 10} min={1} max={20} step={0.5} onChange={(v) => updateField('octaves', v)} formatValue={(v) => v.toFixed(1)} color="#FF7A00" />
          </div>
        </div>
      )}

      {/* Metal specific */}
      {isMetal && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Metal</div>
          <div className="space-y-2">
            <Slider label="Harm." value={params.harmonicity ?? 5.1} min={0.5} max={20} step={0.1} onChange={(v) => updateField('harmonicity', v)} formatValue={(v) => v.toFixed(1)} color="#FFB800" />
            <Slider label="Mod.Idx" value={params.modulationIndex ?? 32} min={1} max={100} step={1} onChange={(v) => updateField('modulationIndex', v)} formatValue={(v) => v.toFixed(0)} color="#FFE500" />
            <Slider label="Reson." value={params.resonance ?? 4000} min={100} max={8000} step={50} onChange={(v) => updateField('resonance', v)} formatValue={(v) => `${v.toFixed(0)}Hz`} color="#A8FF00" />
          </div>
        </div>
      )}

      {/* Pluck specific */}
      {isPluck && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Pluck</div>
          <div className="space-y-2">
            <Slider label="Atk.Nse" value={params.attackNoise ?? 1} min={0} max={20} step={0.5} onChange={(v) => updateField('attackNoise', v)} formatValue={(v) => v.toFixed(1)} color="#00FFBF" />
            <Slider label="Damp." value={params.dampening ?? 4000} min={100} max={8000} step={50} onChange={(v) => updateField('dampening', v)} formatValue={(v) => `${v.toFixed(0)}Hz`} color="#00E5FF" />
            <Slider label="Reson." value={params.resonancePluck ?? 0.7} min={0} max={0.99} step={0.01} onChange={(v) => updateField('resonancePluck', v)} formatValue={(v) => v.toFixed(2)} color="#00C8FF" />
          </div>
        </div>
      )}
    </div>
  );
}
