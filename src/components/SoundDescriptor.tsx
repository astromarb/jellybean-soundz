import React, { useState, useCallback, useRef } from 'react';
import { SynthParams, EffectsParams } from '../types';
import { keywordSearch, claudeAsk, claudeSearch, SoundSuggestion } from '../lib/soundAI';
import { playDirect } from '../lib/audio';

const LS_KEY = 'jb-anthropic-key';

interface Props {
  audioEnabled: boolean;
  enableAudio: () => Promise<void>;
  onLoad: (name: string, synthParams: SynthParams, effects: EffectsParams) => void;
  onSave: (name: string, synthParams: SynthParams, effects: EffectsParams) => Promise<void>;
  onClose: () => void;
}

type Phase = 'describe' | 'questions' | 'results';

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

const EXAMPLES = [
  'a soft UI button click for a minimal web app',
  'a bright sparkly success chime',
  'futuristic sci-fi laser zap',
  'warm notification ping, not harsh',
  'glitchy error buzz, lo-fi feel',
  'gentle modal open / expand sound',
];

export default function SoundDescriptor({ audioEnabled, enableAudio, onLoad, onSave, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(LS_KEY) ?? '');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [phase, setPhase] = useState<Phase>('describe');
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('');
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<SoundSuggestion[]>([]);
  const [previewingIdx, setPreviewingIdx] = useState<number | null>(null);
  const [savedIdx, setSavedIdx] = useState<Set<number>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const storedKey = () => localStorage.getItem(LS_KEY) ?? '';

  const handleKeyChange = useCallback((v: string) => {
    setApiKey(v);
    if (v.trim()) localStorage.setItem(LS_KEY, v.trim());
    else localStorage.removeItem(LS_KEY);
  }, []);

  // Phase 1 → 2: ask Claude for clarifying questions
  const handleAskClaude = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    const key = storedKey();
    if (!key) return;
    setLoading(true);
    setLoadingLabel('Thinking of questions…');
    setError('');
    try {
      const qs = await claudeAsk(q, key);
      if (qs.length === 0) {
        // If no questions, go straight to generation
        await runGenerate(q, key, {});
      } else {
        setQuestions(qs);
        setAnswers(Object.fromEntries(qs.map(q => [q, ''])));
        setPhase('questions');
      }
    } catch (err: unknown) {
      // If the ask step fails, fall through directly to generation
      console.warn('claudeAsk failed, generating directly:', err);
      await runGenerate(q, key, {});
    } finally {
      setLoading(false);
      setLoadingLabel('');
    }
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  // Phase 1 → 3: keyword search (no API)
  const handleKeywordSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setLoadingLabel('Searching…');
    setError('');
    setSuggestions([]);
    setSavedIdx(new Set());
    try {
      const results = keywordSearch(q);
      if (results.length === 0) setError('No matching presets found — try different keywords.');
      else setSuggestions(results);
      setPhase('results');
    } finally {
      setLoading(false);
      setLoadingLabel('');
    }
  }, [query]);

  // Phase 2 → 3 or Phase 1 → 3 (with key, no questions step)
  async function runGenerate(q: string, key: string, ans: Record<string, string>) {
    setLoading(true);
    setLoadingLabel('Generating presets…');
    setError('');
    setSuggestions([]);
    setSavedIdx(new Set());
    try {
      const results = await claudeSearch(q, key, ans);
      if (results.length === 0) setError("No valid presets returned — try rephrasing.");
      else setSuggestions(results);
      setPhase('results');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // Try keyword fallback
      const fallback = keywordSearch(q);
      if (fallback.length > 0) {
        setSuggestions(fallback);
        setPhase('results');
        setError(`Claude API error — showing keyword results instead. (${msg})`);
      } else {
        setError(`Couldn't generate suggestions: ${msg}`);
      }
    } finally {
      setLoading(false);
      setLoadingLabel('');
    }
  }

  const handleGenerate = useCallback(async () => {
    const q = query.trim();
    const key = storedKey();
    if (!q || !key) return;
    await runGenerate(q, key, answers);
  }, [query, answers]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetry = useCallback(() => {
    setSuggestions([]);
    setSavedIdx(new Set());
    setError('');
    setPhase('describe');
    setQuestions([]);
    setAnswers({});
  }, []);

  const handlePreview = useCallback(async (idx: number, s: SoundSuggestion) => {
    if (!audioEnabled) await enableAudio();
    setPreviewingIdx(idx);
    try { await playDirect(s.synthParams, s.effects, s.duration); } catch (_) {}
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

  const hasKey = !!storedKey();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/85 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>✨</span> AI Sound Designer
            </h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {phase === 'describe' && 'Describe a sound in plain English'}
              {phase === 'questions' && 'Claude has a few questions to refine your sound'}
              {phase === 'results' && 'Choose a preset to preview, load, or save'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* ── Phase 1: Describe ── */}
          {phase === 'describe' && (
            <>
              <div>
                <textarea
                  ref={textareaRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) hasKey ? handleAskClaude() : handleKeywordSearch(); }}
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

              {/* API key section */}
              <div className="rounded-xl border border-gray-700 bg-gray-800/50">
                <button
                  onClick={() => setShowKeyInput(v => !v)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span>{hasKey ? '🔑' : '🔒'}</span>
                    <span>
                      {hasKey ? (
                        <><span className="text-green-400">Claude AI active</span><span className="text-[10px] text-gray-600 ml-1">— will ask clarifying questions</span></>
                      ) : (
                        <>Use Claude AI <span className="text-[10px] text-gray-600 ml-1">(optional — add key to enable)</span></>
                      )}
                    </span>
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
                      <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">
                        Get a key →
                      </a>
                    </p>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                {hasKey && (
                  <button
                    onClick={handleAskClaude}
                    disabled={!query.trim() || loading}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white transition-all shadow-lg hover:shadow-purple-500/25"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {loadingLabel}
                      </span>
                    ) : '✨ Ask Claude'}
                  </button>
                )}
                <button
                  onClick={handleKeywordSearch}
                  disabled={!query.trim() || loading}
                  className={`py-2.5 rounded-xl text-sm font-medium disabled:opacity-40 transition-colors ${
                    hasKey
                      ? 'px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'
                      : 'flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg'
                  }`}
                >
                  {hasKey ? '🔍 Quick Search' : '🔍 Search Library'}
                </button>
              </div>
            </>
          )}

          {/* ── Phase 2: Questions ── */}
          {phase === 'questions' && (
            <>
              <div className="rounded-xl bg-gray-800/60 border border-gray-700 px-4 py-3">
                <p className="text-[11px] text-gray-500 font-mono uppercase tracking-widest mb-1">Your description</p>
                <p className="text-sm text-gray-200">"{query}"</p>
              </div>

              <div className="space-y-3">
                <p className="text-[11px] text-gray-500 uppercase tracking-widest">Claude's questions</p>
                {questions.map((q, i) => (
                  <div key={i} className="space-y-1.5">
                    <label className="text-xs text-gray-300">{q}</label>
                    <input
                      type="text"
                      value={answers[q] ?? ''}
                      onChange={e => setAnswers(prev => ({ ...prev, [q]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') handleGenerate(); }}
                      placeholder="Your answer (optional)…"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white transition-all shadow-lg hover:shadow-purple-500/25"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {loadingLabel}
                    </span>
                  ) : '✨ Generate →'}
                </button>
                <button
                  onClick={handleRetry}
                  className="px-4 py-2.5 rounded-xl text-sm bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700 transition-colors"
                >
                  ← Back
                </button>
              </div>
            </>
          )}

          {/* ── Phase 3: Results ── */}
          {phase === 'results' && (
            <>
              {error && (
                <div className="rounded-xl bg-yellow-950/50 border border-yellow-800 px-3 py-2.5 text-xs text-yellow-300">
                  {error}
                </div>
              )}

              {suggestions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-gray-500 uppercase tracking-widest">Suggestions</p>
                    <button
                      onClick={handleRetry}
                      className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      ↻ Start over
                    </button>
                  </div>
                  {suggestions.map((s, idx) => (
                    <div key={idx} className="rounded-xl border border-gray-700 bg-gray-800/60 p-3 space-y-2.5">
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
            </>
          )}

          {/* Error (describe phase) */}
          {phase === 'describe' && error && (
            <div className="rounded-xl bg-red-950/50 border border-red-800 px-3 py-2.5 text-xs text-red-300">
              {error}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
