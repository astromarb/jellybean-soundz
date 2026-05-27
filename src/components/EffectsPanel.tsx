import React, { useState } from 'react';
import { EffectsParams } from '../types';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  formatValue?: (v: number) => string;
  color?: string;
}

function EffectSlider({ label, value, min, max, step, onChange, formatValue, color }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-14 shrink-0">{label}</span>
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
            '--slider-color': color ?? '#00C8FF',
            '--slider-pct': `${pct}%`,
          } as React.CSSProperties
        }
      />
      <span className="text-xs font-mono text-gray-400 w-12 text-right shrink-0">
        {formatValue ? formatValue(value) : value.toFixed(2)}
      </span>
    </div>
  );
}

interface EffectSectionProps {
  title: string;
  enabled: boolean;
  onToggle: () => void;
  color: string;
  children: React.ReactNode;
}

function EffectSection({ title, enabled, onToggle, color, children }: EffectSectionProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div
      className={`rounded-lg border transition-all duration-200 ${
        enabled ? 'border-gray-700 bg-gray-800/50' : 'border-gray-800 bg-gray-900/30 opacity-60'
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Toggle */}
        <button
          onClick={onToggle}
          className={`relative w-8 h-4 rounded-full transition-all duration-200 shrink-0 ${
            enabled ? 'bg-opacity-100' : 'bg-gray-700'
          }`}
          style={enabled ? { backgroundColor: color } : {}}
          aria-label={`Toggle ${title}`}
        >
          <div
            className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-200 ${
              enabled ? 'left-4' : 'left-0.5'
            }`}
          />
        </button>

        {/* Title */}
        <span
          className="text-xs font-semibold flex-1 cursor-pointer"
          style={enabled ? { color } : { color: '#6b7280' }}
          onClick={() => setExpanded((e) => !e)}
        >
          {title}
        </span>

        {/* Expand */}
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-gray-600 hover:text-gray-400 transition-colors"
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {expanded && enabled && (
        <div className="px-3 pb-3 space-y-2 border-t border-gray-700/50 pt-2">
          {children}
        </div>
      )}
    </div>
  );
}

interface EffectsPanelProps {
  effects: EffectsParams;
  onChange: (effects: EffectsParams) => void;
}

export default function EffectsPanel({ effects, onChange }: EffectsPanelProps) {
  const update = <K extends keyof EffectsParams>(key: K, value: EffectsParams[K]) => {
    onChange({ ...effects, [key]: value });
  };

  return (
    <div className="space-y-2">
      {/* Reverb */}
      <EffectSection
        title="Reverb"
        enabled={effects.reverb.enabled}
        onToggle={() => update('reverb', { ...effects.reverb, enabled: !effects.reverb.enabled })}
        color="#7700FF"
      >
        <EffectSlider label="Wet" value={effects.reverb.wet} min={0} max={1} step={0.01} onChange={(v) => update('reverb', { ...effects.reverb, wet: v })} formatValue={(v) => `${(v * 100).toFixed(0)}%`} color="#7700FF" />
        <EffectSlider label="Decay" value={effects.reverb.decay} min={0.1} max={10} step={0.1} onChange={(v) => update('reverb', { ...effects.reverb, decay: v })} formatValue={(v) => `${v.toFixed(1)}s`} color="#7700FF" />
        <EffectSlider label="PreDly" value={effects.reverb.preDelay} min={0} max={0.5} step={0.005} onChange={(v) => update('reverb', { ...effects.reverb, preDelay: v })} formatValue={(v) => `${(v * 1000).toFixed(0)}ms`} color="#7700FF" />
      </EffectSection>

      {/* Delay */}
      <EffectSection
        title="Delay"
        enabled={effects.delay.enabled}
        onToggle={() => update('delay', { ...effects.delay, enabled: !effects.delay.enabled })}
        color="#0095FF"
      >
        <EffectSlider label="Wet" value={effects.delay.wet} min={0} max={1} step={0.01} onChange={(v) => update('delay', { ...effects.delay, wet: v })} formatValue={(v) => `${(v * 100).toFixed(0)}%`} color="#0095FF" />
        <EffectSlider label="Time" value={effects.delay.delayTime} min={0.01} max={1} step={0.01} onChange={(v) => update('delay', { ...effects.delay, delayTime: v })} formatValue={(v) => `${(v * 1000).toFixed(0)}ms`} color="#0095FF" />
        <EffectSlider label="Feedbk" value={effects.delay.feedback} min={0} max={0.95} step={0.01} onChange={(v) => update('delay', { ...effects.delay, feedback: v })} formatValue={(v) => `${(v * 100).toFixed(0)}%`} color="#0095FF" />
      </EffectSection>

      {/* Distortion */}
      <EffectSection
        title="Distortion"
        enabled={effects.distortion.enabled}
        onToggle={() => update('distortion', { ...effects.distortion, enabled: !effects.distortion.enabled })}
        color="#FF7A00"
      >
        <EffectSlider label="Wet" value={effects.distortion.wet} min={0} max={1} step={0.01} onChange={(v) => update('distortion', { ...effects.distortion, wet: v })} formatValue={(v) => `${(v * 100).toFixed(0)}%`} color="#FF7A00" />
        <EffectSlider label="Amount" value={effects.distortion.distortion} min={0} max={1} step={0.01} onChange={(v) => update('distortion', { ...effects.distortion, distortion: v })} formatValue={(v) => `${(v * 100).toFixed(0)}%`} color="#FF7A00" />
      </EffectSection>

      {/* Filter */}
      <EffectSection
        title="Filter"
        enabled={effects.filter.enabled}
        onToggle={() => update('filter', { ...effects.filter, enabled: !effects.filter.enabled })}
        color="#00FF7A"
      >
        <div className="flex gap-1 mb-2">
          {(['lowpass', 'highpass', 'bandpass'] as BiquadFilterType[]).map((t) => (
            <button
              key={t}
              onClick={() => update('filter', { ...effects.filter, type: t })}
              className={`flex-1 py-1 text-xs rounded-md border transition-all ${
                effects.filter.type === t
                  ? 'bg-emerald-700/50 border-emerald-600 text-emerald-300'
                  : 'bg-gray-800 border-gray-700 text-gray-500 hover:bg-gray-700'
              }`}
            >
              {t === 'lowpass' ? 'LP' : t === 'highpass' ? 'HP' : 'BP'}
            </button>
          ))}
        </div>
        <EffectSlider label="Freq" value={effects.filter.frequency} min={20} max={20000} step={10} onChange={(v) => update('filter', { ...effects.filter, frequency: v })} formatValue={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}kHz` : `${v.toFixed(0)}Hz`} color="#00FF7A" />
        <EffectSlider label="Q" value={effects.filter.Q} min={0.1} max={20} step={0.1} onChange={(v) => update('filter', { ...effects.filter, Q: v })} formatValue={(v) => v.toFixed(1)} color="#00FF7A" />
      </EffectSection>

      {/* BitCrusher */}
      <EffectSection
        title="BitCrusher"
        enabled={effects.bitCrusher.enabled}
        onToggle={() => update('bitCrusher', { ...effects.bitCrusher, enabled: !effects.bitCrusher.enabled })}
        color="#FF3B5C"
      >
        <EffectSlider label="Wet" value={effects.bitCrusher.wet} min={0} max={1} step={0.01} onChange={(v) => update('bitCrusher', { ...effects.bitCrusher, wet: v })} formatValue={(v) => `${(v * 100).toFixed(0)}%`} color="#FF3B5C" />
        <EffectSlider label="Bits" value={effects.bitCrusher.bits} min={1} max={16} step={1} onChange={(v) => update('bitCrusher', { ...effects.bitCrusher, bits: v })} formatValue={(v) => `${v.toFixed(0)} bit`} color="#FF3B5C" />
      </EffectSection>
    </div>
  );
}
