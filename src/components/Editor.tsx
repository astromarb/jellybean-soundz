import React, { useState } from 'react';
import { Sound, SynthParams, EffectsParams, DEFAULT_SYNTH_PARAMS, DEFAULT_EFFECTS } from '../types';
import SynthControls from './SynthControls';
import EffectsPanel from './EffectsPanel';
import { startLivePreview, stopLivePreview } from '../lib/audio';
import { randomizeSynthParams, randomizeEffects } from '../lib/randomize';

type EditorTab = 'synth' | 'effects';

interface EditorProps {
  synthParams: SynthParams;
  effects: EffectsParams;
  soundName: string;
  isSaving: boolean;
  editingSound?: Sound | null;
  onSynthParamsChange: (params: SynthParams) => void;
  onEffectsChange: (effects: EffectsParams) => void;
  onSoundNameChange: (name: string) => void;
  onSave: () => void;
  onUpdate?: () => void;
  onReset: () => void;
}

export default function Editor({
  synthParams,
  effects,
  soundName,
  isSaving,
  editingSound,
  onSynthParamsChange,
  onEffectsChange,
  onSoundNameChange,
  onSave,
  onUpdate,
  onReset,
}: EditorProps) {
  const [tab, setTab] = useState<EditorTab>('synth');
  const [isPreviewing, setIsPreviewing] = useState(false);

  const handlePreview = async () => {
    if (isPreviewing) {
      stopLivePreview();
      setIsPreviewing(false);
    } else {
      setIsPreviewing(true);
      try {
        await startLivePreview(synthParams, effects);
      } catch (err) {
        console.error('Preview error:', err);
        setIsPreviewing(false);
      }
    }
  };

  const handleStop = () => {
    stopLivePreview();
    setIsPreviewing(false);
  };

  const handleRandomize = () => {
    onSynthParamsChange(randomizeSynthParams());
    onEffectsChange(randomizeEffects());
  };

  const isEditing = !!editingSound;

  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 flex-1">
            {isEditing ? 'Editing' : 'New Sound'}
          </h2>
          {isEditing && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: `${editingSound!.color}25`,
                color: editingSound!.color,
                border: `1px solid ${editingSound!.color}50`,
              }}
            >
              {editingSound!.synthParams.synthType.replace('Synth', '')}
            </span>
          )}
        </div>
        <input
          type="text"
          value={soundName}
          onChange={(e) => onSoundNameChange(e.target.value)}
          placeholder="Sound name..."
          className="w-full bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-violet-500 transition-colors placeholder-gray-600"
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 shrink-0">
        <button
          onClick={() => setTab('synth')}
          className={`flex-1 py-2 text-xs font-semibold uppercase tracking-widest transition-all ${
            tab === 'synth'
              ? 'text-violet-400 border-b-2 border-violet-500'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Synth
        </button>
        <button
          onClick={() => setTab('effects')}
          className={`flex-1 py-2 text-xs font-semibold uppercase tracking-widest transition-all ${
            tab === 'effects'
              ? 'text-violet-400 border-b-2 border-violet-500'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Effects
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {tab === 'synth' ? (
          <SynthControls params={synthParams} onChange={onSynthParamsChange} />
        ) : (
          <EffectsPanel effects={effects} onChange={onEffectsChange} />
        )}
      </div>

      {/* Action buttons */}
      <div className="px-3 py-3 border-t border-gray-800 space-y-2 shrink-0">
        {/* Randomize */}
        <button
          onClick={handleRandomize}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 transition-all"
          title="Randomize all synth params and effects"
        >
          <span className="text-base leading-none">🎲</span>
          Randomize
        </button>

        {/* Preview / Stop */}
        <div className="flex gap-2">
          <button
            onClick={handlePreview}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-all ${
              isPreviewing
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700'
            }`}
          >
            {isPreviewing ? (
              <>
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                Live
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Preview
              </>
            )}
          </button>
          {isPreviewing && (
            <button
              onClick={handleStop}
              className="px-3 py-2 text-sm font-medium rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 transition-all"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" />
              </svg>
            </button>
          )}
        </div>

        {/* Save / Update buttons */}
        {isEditing ? (
          <>
            {/* Primary: Update */}
            <button
              onClick={onUpdate}
              disabled={isSaving || !soundName.trim()}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all shadow-lg hover:shadow-purple-500/25"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Rendering...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Update Sound
                </>
              )}
            </button>

            {/* Secondary: Save as new */}
            <button
              onClick={onSave}
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 hover:text-white transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Save as New Copy
            </button>
          </>
        ) : (
          /* Creating new */
          <button
            onClick={onSave}
            disabled={isSaving || !soundName.trim()}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all shadow-lg hover:shadow-purple-500/25"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Rendering...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save to Library
              </>
            )}
          </button>
        )}

        {/* Reset */}
        <button
          onClick={onReset}
          className="w-full py-1.5 text-xs font-medium text-gray-600 hover:text-gray-400 transition-colors"
        >
          {isEditing ? 'Discard changes' : 'Reset to defaults'}
        </button>
      </div>
    </div>
  );
}
