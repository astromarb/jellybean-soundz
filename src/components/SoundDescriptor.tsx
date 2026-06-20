import React, { useState, useCallback, useMemo } from 'react';
import { SynthParams, EffectsParams, SoundRights, AppMode } from '../types';
import { getProvidersForMode, getProviderById, GeneratedSound, SoundProvider } from '../lib/providers';
import { rightsBadge, MODE_INFO } from '../lib/rights';
import { playDirect, playAudioBlob } from '../lib/audio';

interface Props {
  audioEnabled: boolean;
  enableAudio: () => Promise<void>;
  mode: AppMode;
  onLoad: (name: string, synthParams: SynthParams, effects: EffectsParams) => void;
  onSave: (name: string, synthParams: SynthParams, effects: EffectsParams, duration: number, rights: SoundRights) => Promise<void>;
  onSaveBlob: (name: string, blob: Blob, duration: number, rights: SoundRights) => Promise<void>;
  onClose: () => void;
}

type Phase = 'describe' | 'questions' | 'results';

// Per-provider key/plan metadata for the credentials UI. Providers not listed
// here (keyword) need no key.
const PROVIDER_KEYS: Record<string, { keyLS: string; planLS?: string; placeholder: string; getUrl: string; hasPlan: boolean }> = {
  claude: { keyLS: 'jb-anthropic-key', placeholder: 'sk-ant-…', getUrl: 'https://console.anthropic.com', hasPlan: false },
  elevenlabs: { keyLS: 'jb-elevenlabs-key', planLS: 'jb-elevenlabs-plan', placeholder: 'ElevenLabs API key', getUrl: 'https://elevenlabs.io/app/settings/api-keys', hasPlan: true },
  stability: { keyLS: 'jb-stability-key', planLS: 'jb-stability-plan', placeholder: 'sk-…', getUrl: 'https://platform.stability.ai/account/keys', hasPlan: true },
};

const EXAMPLES = [
  'a soft UI button click for a minimal web app',
  'a bright sparkly success chime',
  'futuristic sci-fi laser zap',
  'warm notification ping, not harsh',
  'glitchy error buzz, lo-fi feel',
  'gentle modal open / expand sound',
];

function effectBadges(effects: EffectsParams): string[] {
  const badges: string[] = [];
  if (effects.filter?.enabled) badges.push(`Filter ${effects.filter.type}`);
  if (effects.reverb?.enabled) badges.push('Reverb');
  if (effects.delay?.enabled) badges.push('Delay');
  if (effects.distortion?.enabled) badges.push('Distort');
  return badges;
}

export default function SoundDescriptor({ audioEnabled, enableAudio, mode, onLoad, onSave, onSaveBlob, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState<Phase>('describe');
  const [providerId, setProviderId] = useState<string>('claude');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyVersion, setKeyVersion] = useState(0); // bump to recompute availability
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<GeneratedSound[]>([]);
  const [previewingIdx, setPreviewingIdx] = useState<number | null>(null);
  const [savedIdx, setSavedIdx] = useState<Set<number>>(new Set());

  const providers = useMemo(() => getProvidersForMode(mode), [mode]);
  // Default to first available provider in this mode if current pick isn't offered.
  const provider: SoundProvider = useMemo(() => {
    const found = providers.find((p) => p.id === providerId);
    if (found) return found;
    const fallback = providers.find((p) => p.isAvailable()) ?? providers[providers.length - 1];
    return fallback;
  }, [providers, providerId, keyVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  const keyMeta = PROVIDER_KEYS[provider.id];
  const available = provider.isAvailable();

  const readLS = (k?: string) => (k && localStorage.getItem(k)) || '';
  const writeLS = (k: string, v: string) => {
    if (v.trim()) localStorage.setItem(k, v.trim());
    else localStorage.removeItem(k);
    setKeyVersion((n) => n + 1);
  };

  const resetResults = () => { setResults([]); setSavedIdx(new Set()); setError(''); setNotice(''); };

  async function runGenerate(ans: Record<string, string>) {
    setLoading(true);
    setLoadingLabel(provider.kind === 'audio' ? 'Generating audio…' : 'Generating presets…');
    setError('');
    setNotice('');
    setResults([]);
    setSavedIdx(new Set());
    try {
      const out = await provider.generate(query.trim(), { mode, answers: ans });
      if (out.length === 0) setError('No results returned — try rephrasing.');
      else setResults(out);
      setPhase('results');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // Preset-provider failure → fall back to offline keyword search.
      if (provider.kind === 'preset') {
        try {
          const kw = getProviderById('keyword')!;
          const fallback = await kw.generate(query.trim(), { mode });
          setResults(fallback);
          setPhase('results');
          setNotice(`${provider.label} failed — showing offline results instead. (${msg})`);
          return;
        } catch { /* fall through to hard error */ }
      }
      setError(`Couldn't generate: ${msg}`);
      setPhase('results');
    } finally {
      setLoading(false);
      setLoadingLabel('');
    }
  }

  const handlePrimary = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    if (keyMeta && !available) { setShowKeyInput(true); setError(`Add your ${provider.label} key to use this provider.`); return; }
    resetResults();

    if (provider.supportsQuestions && provider.ask) {
      setLoading(true);
      setLoadingLabel('Thinking of questions…');
      try {
        const qs = await provider.ask(q);
        if (qs.length > 0) {
          setQuestions(qs);
          setAnswers(Object.fromEntries(qs.map((x) => [x, ''])));
          setPhase('questions');
          return;
        }
      } catch (err) {
        console.warn('ask failed, generating directly:', err);
      } finally {
        setLoading(false);
        setLoadingLabel('');
      }
    }
    await runGenerate({});
  }, [query, provider, available, keyMeta]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerateAnswers = useCallback(async () => {
    await runGenerate(answers);
  }, [answers]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetry = useCallback(() => {
    resetResults();
    setPhase('describe');
    setQuestions([]);
    setAnswers({});
  }, []);

  const handlePreview = useCallback(async (idx: number, s: GeneratedSound) => {
    if (!audioEnabled) await enableAudio();
    setPreviewingIdx(idx);
    try {
      if (s.blob) await playAudioBlob(s.blob);
      else if (s.synthParams && s.effects) await playDirect(s.synthParams, s.effects, s.duration);
    } catch (_) { /* ignore */ }
    setPreviewingIdx(null);
  }, [audioEnabled, enableAudio]);

  const handleLoad = useCallback((s: GeneratedSound) => {
    if (s.synthParams && s.effects) {
      onLoad(s.name, s.synthParams, s.effects);
      onClose();
    }
  }, [onLoad, onClose]);

  const handleSave = useCallback(async (idx: number, s: GeneratedSound) => {
    if (s.blob) await onSaveBlob(s.name, s.blob, s.duration, s.rights);
    else if (s.synthParams && s.effects) await onSave(s.name, s.synthParams, s.effects, s.duration, s.rights);
    setSavedIdx((prev) => new Set(prev).add(idx));
  }, [onSave, onSaveBlob]);

  const primaryLabel = provider.supportsQuestions && provider.ask
    ? '✨ Ask Claude'
    : (provider.kind === 'audio' ? '🎧 Generate Audio' : '✨ Generate');

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
              {phase === 'describe' && `Describe a sound — ${MODE_INFO[mode].emoji} ${MODE_INFO[mode].label} mode`}
              {phase === 'questions' && 'Claude has a few questions to refine your sound'}
              {phase === 'results' && 'Choose a result to preview, load, or save'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* ── Phase 1: Describe ── */}
          {phase === 'describe' && (
            <>
              <div>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePrimary(); }}
                  placeholder="Describe the sound you want…"
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-violet-500 transition-colors"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {EXAMPLES.map((ex) => (
                    <button key={ex} onClick={() => setQuery(ex)}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-700 transition-colors">
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              {/* Provider picker */}
              <div>
                <p className="text-[11px] text-gray-500 uppercase tracking-widest mb-1.5">Generator</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {providers.map((p) => {
                    const isActive = p.id === provider.id;
                    const ok = p.isAvailable();
                    return (
                      <button key={p.id} onClick={() => { setProviderId(p.id); setShowKeyInput(false); setError(''); }}
                        title={p.description}
                        className={`text-left px-2.5 py-2 rounded-lg border text-xs transition-colors ${
                          isActive ? 'border-violet-500 bg-violet-950/40 text-white' : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-800'
                        }`}>
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-medium truncate">{p.label}</span>
                          <span className={`text-[8px] px-1 rounded ${ok ? 'text-emerald-400' : 'text-gray-500'}`}>{ok ? '● ready' : '○ key'}</span>
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{p.kind === 'audio' ? 'Real audio' : 'Synth preset'}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Credentials for selected provider */}
              {keyMeta && (
                <div className="rounded-xl border border-gray-700 bg-gray-800/50">
                  <button onClick={() => setShowKeyInput((v) => !v)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-gray-400 hover:text-gray-200 transition-colors">
                    <span className="flex items-center gap-2">
                      <span>{available ? '🔑' : '🔒'}</span>
                      <span>
                        {available
                          ? <span className="text-green-400">{provider.label} key set</span>
                          : <>Add {provider.label} key <span className="text-[10px] text-gray-600 ml-1">(required)</span></>}
                      </span>
                    </span>
                    <span className="text-[10px] text-gray-600">{showKeyInput ? '▲' : '▼'}</span>
                  </button>
                  {showKeyInput && (
                    <div className="px-3 pb-3 space-y-2">
                      <input type="password" defaultValue={readLS(keyMeta.keyLS)}
                        onChange={(e) => writeLS(keyMeta.keyLS, e.target.value)}
                        placeholder={keyMeta.placeholder}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 font-mono" />
                      {keyMeta.hasPlan && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-500">Plan:</span>
                          {(['personal', 'commercial'] as const).map((pl) => (
                            <button key={pl} onClick={() => writeLS(keyMeta.planLS!, pl)}
                              className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                                readLS(keyMeta.planLS) === pl ? 'border-violet-500 text-white bg-violet-950/50' : 'border-gray-700 text-gray-400 hover:text-gray-200'
                              }`}>
                              {pl === 'commercial' ? '💼 Commercial' : '🏠 Personal'}
                            </button>
                          ))}
                          <span className="text-[9px] text-gray-600">sets license scope</span>
                        </div>
                      )}
                      <p className="text-[10px] text-gray-600">
                        Stored in localStorage only. Sent only to the provider's API.{' '}
                        <a href={keyMeta.getUrl} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">Get a key →</a>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-red-950/50 border border-red-800 px-3 py-2.5 text-xs text-red-300">{error}</div>
              )}

              <button onClick={handlePrimary} disabled={!query.trim() || loading}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white transition-all shadow-lg hover:shadow-purple-500/25">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {loadingLabel}
                  </span>
                ) : primaryLabel}
              </button>
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
                    <input type="text" value={answers[q] ?? ''}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleGenerateAnswers(); }}
                      placeholder="Your answer (optional)…"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors" />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={handleGenerateAnswers} disabled={loading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white transition-all shadow-lg hover:shadow-purple-500/25">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />{loadingLabel}
                    </span>
                  ) : '✨ Generate →'}
                </button>
                <button onClick={handleRetry} className="px-4 py-2.5 rounded-xl text-sm bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700 transition-colors">← Back</button>
              </div>
            </>
          )}

          {/* ── Phase 3: Results ── */}
          {phase === 'results' && (
            <>
              {notice && (
                <div className="rounded-xl bg-yellow-950/50 border border-yellow-800 px-3 py-2.5 text-xs text-yellow-300">{notice}</div>
              )}
              {error && (
                <div className="rounded-xl bg-red-950/50 border border-red-800 px-3 py-2.5 text-xs text-red-300">{error}</div>
              )}

              {results.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-gray-500 uppercase tracking-widest">Results</p>
                    <button onClick={handleRetry} className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors">↻ Start over</button>
                  </div>
                  {results.map((s, idx) => {
                    const badge = rightsBadge(s.rights);
                    return (
                      <div key={idx} className="rounded-xl border border-gray-700 bg-gray-800/60 p-3 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-bold text-white">{s.name}</div>
                            {s.tagline && <div className="text-[11px] text-gray-400 mt-0.5">{s.tagline}</div>}
                          </div>
                          <span title={badge.title} className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${badge.className} shrink-0`}>
                            {badge.emoji} {badge.label}
                          </span>
                        </div>

                        {s.synthParams && s.effects && effectBadges(s.effects).length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {effectBadges(s.effects).map((b) => (
                              <span key={b} className="px-1.5 py-0.5 rounded text-[9px] bg-violet-900/50 text-violet-300 border border-violet-800">{b}</span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-0.5">
                          <button onClick={() => handlePreview(idx, s)} disabled={previewingIdx !== null}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white transition-colors">
                            {previewingIdx === idx ? <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : '▶'} Preview
                          </button>
                          {s.synthParams && (
                            <button onClick={() => handleLoad(s)}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-gray-700 hover:bg-gray-600 text-white transition-colors">
                              📥 Load into Editor
                            </button>
                          )}
                          <button onClick={() => handleSave(idx, s)} disabled={savedIdx.has(idx)}
                            className={`ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                              savedIdx.has(idx) ? 'bg-green-900/50 text-green-400 border border-green-800 cursor-default' : 'bg-violet-700 hover:bg-violet-600 text-white'
                            }`}>
                            {savedIdx.has(idx) ? '✓ Saved' : '+ Save to Library'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
