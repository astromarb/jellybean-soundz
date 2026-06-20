import React, { useState, useCallback, useRef } from 'react';
import { SynthParams, EffectsParams } from '../types';
import { keywordSearch, claudeSearch, SoundSuggestion } from '../lib/soundAI';
import { playDirect } from '../lib/audio';

const LS_KEY = 'jb-anthropic-key';

interface Props {
  audioEnabled: boolean;
  enableAudio: () => Promise<void>;
  onLoad: (name: string, synthParams: SynthParams, effects: EffectsParams) => void;
  onSave: (name: string, synthParams: SynthParams, effects: EffectsParams) => Promise<void>;
  onClose: () => void;
}

function SynthBadge({ label }: { label: string }) {
  return (
    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-gray-700 text-gray-300 border border-gray-600">
      {label}
    </span>
  );
}

function effectBadges(effects: EffectsParams): string[] {
  const badges: string[] = [];
  if (effects.filter?.enabled) badges.push(`Filter ${effects.filter.type}`);
  if (effects.reverb?.enabled) badges.push('Reverb');
  if (effects.delay?.enabled) badges.push('Delay');
  if (effects.distortion?.enabled) badges.push('Distort');
  return badges;
}

export default function SoundDescriptor({ audioEnabled, enableAudio, onLoad, onSave, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(LS_KEY) ?? '');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<SoundSuggestion[]>([]);
  const [previewingIdx, setPreviewingIdx] = useState<number | null>(null);
  const [savedIdx, setSavedIdx] = useState<Set<number>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyChange = useCallback((v: string) => {
    setApiKey(v);
    if (v.trim()) localStorage.setItem(LS_KEY, v.trim());
    else localStorage.removeItem(LS_KEY);
  }, []);

  const generate = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError('');
    setSuggestions([]);
    setSavedIdx(new Set());

    try {
      const storedKey = localStorage.getItem(LS_KEY);
      let results: SoundSuggestion[];
      if (storedKey) {
        try {
          results = await claudeSearch(q, storedKey);
        } catch (aiErr) {
          console.warn('Claude API failed, falling back to keyword search:', aiErr);
          results = keywordSearch(q);
          if (results.length === 0) throw aiErr;
        }
      } else {
        results = keywordSearch(q);
      }
      if (results.length === 0) {
        setError("No suggestions found — try rephrasing or add more descriptors.");
      } else {
        setSuggestions(results);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Couldn't generate suggestions: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handlePreview = useCallback(async (idx: number, s: SoundSuggestion) => {
    if (!audioEnabled) await enableAudio();
    setPreviewingIdx(idx);
    try {
      await playDirect(s.synthParams, s.effects, s.duration);
    } catch (_) {}
    setPreviewingIdx(null);
  }, [audioEnabled, enableAudio]);

  const handleLoad = useCallback((s: SoundSuggestion) => {
    onLoad(s.name, s.synthParams, s.effects);
    onClose();
  }, [onLoad, onClose]);

  const handleSave = useCallback(async (idx: number, s: SoundSuggestion) => {
    await onSave(s.name, s.synthParams, s.effects);
    setSavedIdx(prev => new Set(prev).add(idx));
  }, [onSave]);

  const EXAMPLES = [
    'a deep punchy kick for trap music',
    'a bright sparkly UI success chime',
    'futuristic laser zap sci-fi button',
    'soft warm notification ping',
    'glitchy lo-fi error sound',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/85 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>✨</span> AI Sound Designer
            </h2>
            <p className="text-[11px] text-gray-500 mt-0.5">Describe a sound in plain English</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Query input */}
          <div>
            <textarea
              ref={textareaRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generate(); }}
              placeholder="Describe the sound you want…"
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-violet-500 transition-colors"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {EXAMPLES.map(ex => (
                <button
                  key={ex}
                  onClick={() => setQuery(ex)}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-700 transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {/* Optional API key */}
          <div className="rounded-xl border border-gray-700 bg-gray-800/50">
            <button
              onClick={() => setShowKeyInput(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              <span className="flex items-center gap-2">
                <span>🔑</span>
                <span>Use Claude AI <span className="text-[10px] text-gray-600 ml-1">(optional — falls back to keyword matching)</span></span>
              </span>
              <span className="text-[10px] text-gray-600">{showKeyInput ? '▲' : '▼'}</span>
            </button>
            {showKeyInput && (
              <div className="px-3 pb-3 space-y-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => handleKeyChange(e.target.value)}
                  placeholder="sk-ant-…"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 font-mono"
                />
                <p className="text-[10px] text-gray-600">
                  Stored in localStorage only. Never leaves your browser except to api.anthropic.com.{' '}
                  <a
                    href="https://console.anthropic.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-400 hover:underline"
                  >
                    Get a key →
                  </a>
                </p>
              </div>
            )}
          </div>

          {/* Generate button */}
          <button
            onClick={generate}
            disabled={!query.trim() || loading}
            className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white transition-all shadow-lg hover:shadow-purple-500/25"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating…
              </span>
            ) : suggestions.length > 0 ? '↻ Try Again' : '✨ Generate Suggestions'}
          </button>

          {/* Error */}
          {error && (
            <div className="rounded-xl bg-red-950/50 border border-red-800 px-3 py-2.5 text-xs text-red-300">
              {error}
            </div>
          )}

          {/* Results */}
          {suggestions.length > 0 && (
            <div className="space-y-3">
              <p className="text-[11px] text-gray-500 uppercase tracking-widest">Suggestions</p>
              {suggestions.map((s, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-gray-700 bg-gray-800/60 p-3 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-white">{s.name}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">{s.tagline}</div>
                    </div>
                    <SynthBadge label={s.synthParams.synthType} />
                  </div>

                  {effectBadges(s.effects).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {effectBadges(s.effects).map(b => (
                        <span key={b} className="px-1.5 py-0.5 rounded text-[9px] bg-violet-900/50 text-violet-300 border border-violet-800">
                          {b}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      onClick={() => handlePreview(idx, s)}
                      disabled={previewingIdx !== null}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white transition-colors"
                    >
                      {previewingIdx === idx ? (
                        <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                      ) : '▶'}
                      Preview
                    </button>
                    <button
                      onClick={() => handleLoad(s)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                    >
                      📥 Load into Editor
                    </button>
                    <button
                      onClick={() => handleSave(idx, s)}
                      disabled={savedIdx.has(idx)}
                      className={`ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                        savedIdx.has(idx)
                          ? 'bg-green-900/50 text-green-400 border border-green-800 cursor-default'
                          : 'bg-violet-700 hover:bg-violet-600 text-white'
                      }`}
                    >
                      {savedIdx.has(idx) ? '✓ Saved' : '+ Save to Library'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
