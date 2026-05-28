import React, { useState, useRef, useCallback } from 'react';
import { Sound, ChainItem } from '../types';
import { useChains } from '../hooks/useChains';
import { playChain, exportChainAsWav, getChainDuration } from '../lib/chainPlayer';
import { downloadBlob } from '../lib/wavEncoder';

// ─── Sound Palette (left panel) ──────────────────────────────────────────────

function SoundPalette({
  sounds,
  onAdd,
}: {
  sounds: Sound[];
  onAdd: (soundId: string) => void;
}) {
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('application/x-sound-id', id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-800">
      <div className="px-3 py-2 border-b border-gray-800 shrink-0">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Sounds</h2>
        <p className="text-xs text-gray-600 mt-0.5">Click or drag → chain</p>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {sounds.length === 0 ? (
          <div className="text-center py-8 text-gray-600 text-sm">
            <div className="text-2xl mb-2">🎵</div>
            No sounds yet
          </div>
        ) : (
          sounds.map((sound) => (
            <div
              key={sound.id}
              draggable
              onDragStart={(e) => handleDragStart(e, sound.id)}
              onClick={() => onAdd(sound.id)}
              className="group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer hover:bg-gray-800 transition-all select-none"
              title="Click to append · Drag to add"
            >
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: sound.color, boxShadow: `0 0 6px ${sound.color}80` }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-100 truncate">{sound.name}</div>
                <div className="text-xs text-gray-500 font-mono">
                  {sound.synthParams.synthType.replace('Synth', '')} · {sound.duration.toFixed(1)}s
                </div>
              </div>
              <span className="text-gray-600 text-base opacity-0 group-hover:opacity-100 transition-opacity">+</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Timeline Strip ───────────────────────────────────────────────────────────

function TimelineStrip({
  items,
  sounds,
  playingIndex,
  totalDuration,
}: {
  items: ChainItem[];
  sounds: Sound[];
  playingIndex: number | null;
  totalDuration: number;
}) {
  if (items.length === 0) {
    return (
      <div className="h-14 flex items-center justify-center text-gray-700 text-xs border-b border-gray-800 bg-gray-950">
        Add sounds to see the timeline
      </div>
    );
  }

  const effective = Math.max(totalDuration, 0.01);

  return (
    <div className="h-14 flex items-stretch border-b border-gray-800 bg-gray-950 overflow-x-auto">
      <div className="flex items-stretch px-2 py-1.5 gap-0 min-w-full">
        {items.map((item, i) => {
          const sound = sounds.find((s) => s.id === item.soundId);
          if (!sound) return null;
          const gapPct = (item.gapBefore / effective) * 100;
          const soundPct = (sound.duration / effective) * 100;
          const active = playingIndex === i;

          return (
            <React.Fragment key={item.id}>
              {item.gapBefore > 0.005 && (
                <div
                  className="flex items-center justify-center border-r border-dashed border-gray-700 text-gray-600 text-[10px] font-mono shrink-0 self-stretch"
                  style={{ width: `${Math.max(gapPct, 1.5)}%`, minWidth: 20 }}
                >
                  {item.gapBefore >= 0.05 ? `${item.gapBefore.toFixed(1)}s` : ''}
                </div>
              )}
              <div
                className={`flex flex-col justify-center px-1.5 rounded shrink-0 self-stretch transition-all ${
                  active ? 'ring-2 ring-white ring-inset' : ''
                }`}
                style={{
                  width: `${Math.max(soundPct, 3)}%`,
                  minWidth: 36,
                  background: `linear-gradient(135deg, ${sound.color}35 0%, ${sound.color}18 100%)`,
                  borderLeft: `3px solid ${active ? '#fff' : sound.color}`,
                }}
              >
                <span className="text-[11px] font-semibold text-white truncate leading-tight">{sound.name}</span>
                <span className="text-[10px] text-gray-500 font-mono leading-tight">{sound.duration.toFixed(1)}s</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ─── Chain Item Row ───────────────────────────────────────────────────────────

function ChainItemRow({
  item,
  index,
  totalItems,
  sound,
  isPlaying,
  onMoveUp,
  onMoveDown,
  onRemove,
  onDuplicate,
  onSetGap,
}: {
  item: ChainItem;
  index: number;
  totalItems: number;
  sound: Sound | undefined;
  isPlaying: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onSetGap: (gap: number) => void;
}) {
  const [editingGap, setEditingGap] = useState(false);
  const [gapDraft, setGapDraft] = useState('');

  const openGapEdit = () => {
    setGapDraft(item.gapBefore.toFixed(2));
    setEditingGap(true);
  };

  const commitGap = () => {
    const val = parseFloat(gapDraft);
    if (!isNaN(val)) onSetGap(val);
    setEditingGap(false);
  };

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 border-b border-gray-800/50 transition-colors ${
        isPlaying ? 'bg-violet-900/20' : 'hover:bg-gray-800/20'
      }`}
    >
      {/* Playing bar */}
      <div
        className={`w-1 h-7 rounded-full shrink-0 transition-all ${isPlaying ? 'bg-violet-400' : 'bg-transparent'}`}
      />

      {/* Index */}
      <span className="text-xs font-mono text-gray-600 w-5 text-right shrink-0">{index + 1}</span>

      {/* Reorder */}
      <div className="flex flex-col gap-0 shrink-0">
        <button
          onClick={onMoveUp}
          disabled={index === 0}
          className="text-gray-600 hover:text-gray-200 disabled:opacity-20 transition-colors text-[10px] leading-none py-0.5 px-0.5"
          title="Move up"
        >▲</button>
        <button
          onClick={onMoveDown}
          disabled={index === totalItems - 1}
          className="text-gray-600 hover:text-gray-200 disabled:opacity-20 transition-colors text-[10px] leading-none py-0.5 px-0.5"
          title="Move down"
        >▼</button>
      </div>

      {/* Sound color */}
      <div
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={
          sound
            ? { backgroundColor: sound.color, boxShadow: `0 0 6px ${sound.color}80` }
            : { backgroundColor: '#555' }
        }
      />

      {/* Sound name + info */}
      <div className="flex-1 min-w-0">
        {sound ? (
          <>
            <div className="text-sm font-medium text-gray-100 truncate">{sound.name}</div>
            <div className="text-xs text-gray-500 font-mono">
              {sound.synthParams.synthType.replace('Synth', '')} · {sound.duration.toFixed(2)}s
            </div>
          </>
        ) : (
          <span className="text-sm text-gray-600 italic">Missing sound</span>
        )}
      </div>

      {/* Gap before */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[10px] text-gray-600 uppercase tracking-widest">gap</span>
        {editingGap ? (
          <input
            type="number"
            value={gapDraft}
            min={0}
            step={0.1}
            onChange={(e) => setGapDraft(e.target.value)}
            onBlur={commitGap}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitGap();
              if (e.key === 'Escape') setEditingGap(false);
            }}
            className="w-16 bg-gray-700 border border-violet-500 text-gray-100 text-xs rounded px-2 py-1 focus:outline-none font-mono"
            autoFocus
          />
        ) : (
          <button
            onClick={openGapEdit}
            className="w-16 text-xs font-mono text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 rounded px-2 py-1 text-left transition-colors"
            title="Click to edit gap before this sound"
          >
            {item.gapBefore.toFixed(2)}s
          </button>
        )}
      </div>

      {/* Duplicate */}
      <button
        onClick={onDuplicate}
        className="text-gray-600 hover:text-gray-300 transition-colors shrink-0 p-1"
        title="Duplicate"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>

      {/* Delete */}
      <button
        onClick={onRemove}
        className="text-gray-600 hover:text-red-400 transition-colors shrink-0 p-1"
        title="Remove"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ─── ChainerTab (main export) ─────────────────────────────────────────────────

export default function ChainerTab({
  sounds,
  audioEnabled,
  enableAudio,
}: {
  sounds: Sound[];
  audioEnabled: boolean;
  enableAudio: () => Promise<void>;
}) {
  const {
    chains,
    activeChain,
    activeChainId,
    setActiveChainId,
    addChain,
    renameChain,
    deleteChain,
    addItem,
    removeItem,
    setItemGap,
    moveItem,
    duplicateItem,
  } = useChains();

  const [isPlaying, setIsPlaying] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const stopFnRef = useRef<(() => void) | null>(null);

  const totalDuration = activeChain ? getChainDuration(activeChain.items, sounds) : 0;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const soundId = e.dataTransfer.getData('application/x-sound-id');
    if (soundId) addItem(soundId);
  };

  const handlePlay = useCallback(async () => {
    if (!audioEnabled) await enableAudio();
    if (!activeChain || activeChain.items.length === 0) return;

    if (stopFnRef.current) {
      stopFnRef.current();
      stopFnRef.current = null;
    }

    setIsPlaying(true);
    setPlayingIndex(null);

    try {
      const stop = await playChain(activeChain.items, sounds, (idx) => {
        setPlayingIndex(idx);
      });
      stopFnRef.current = stop;

      const duration = getChainDuration(activeChain.items, sounds);
      setTimeout(() => {
        setIsPlaying(false);
        setPlayingIndex(null);
        stopFnRef.current = null;
      }, (duration + 0.3) * 1000);
    } catch (err) {
      console.error('Chain play error:', err);
      setIsPlaying(false);
      setPlayingIndex(null);
    }
  }, [audioEnabled, enableAudio, activeChain, sounds]);

  const handleStop = useCallback(() => {
    if (stopFnRef.current) {
      stopFnRef.current();
      stopFnRef.current = null;
    }
    setIsPlaying(false);
    setPlayingIndex(null);
  }, []);

  const handleExport = async () => {
    if (!activeChain || activeChain.items.length === 0 || isExporting) return;
    setIsExporting(true);
    try {
      const blob = await exportChainAsWav(activeChain.items, sounds);
      downloadBlob(blob, `${activeChain.name.replace(/\s+/g, '_')}.wav`);
    } catch (err) {
      console.error('Export error:', err);
      alert('Export failed — make sure all sounds in the chain have been saved to the library.');
    } finally {
      setIsExporting(false);
    }
  };

  const commitRename = () => {
    if (activeChain && nameDraft.trim()) renameChain(activeChain.id, nameDraft.trim());
    setEditingName(false);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Sound Palette */}
        <div className="w-48 shrink-0">
          <SoundPalette sounds={sounds} onAdd={addItem} />
        </div>

        {/* Main: Chain area */}
        <div
          className="flex-1 flex flex-col overflow-hidden"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          {/* Chain header */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-800 bg-gray-900 shrink-0 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-500 shrink-0">Chain</span>

            <select
              value={activeChainId ?? ''}
              onChange={(e) => setActiveChainId(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:border-violet-500 max-w-[180px]"
            >
              {chains.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {editingName && activeChain ? (
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename();
                  if (e.key === 'Escape') setEditingName(false);
                }}
                className="bg-gray-800 border border-violet-500 text-gray-100 text-sm rounded-lg px-2 py-1.5 focus:outline-none w-40"
                autoFocus
              />
            ) : (
              <button
                onClick={() => { if (activeChain) { setNameDraft(activeChain.name); setEditingName(true); } }}
                className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-200 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-all"
                title="Rename chain"
              >
                Rename
              </button>
            )}

            <button
              onClick={() => addChain(`Chain ${chains.length + 1}`)}
              className="px-2.5 py-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-all"
            >
              + New
            </button>

            <button
              onClick={() => {
                if (!activeChain) return;
                if (chains.length <= 1) { alert('Cannot delete the last chain.'); return; }
                if (window.confirm(`Delete "${activeChain.name}"?`)) deleteChain(activeChain.id);
              }}
              disabled={chains.length <= 1}
              className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-red-400 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Delete
            </button>
          </div>

          {/* Timeline visualization */}
          <TimelineStrip
            items={activeChain?.items ?? []}
            sounds={sounds}
            playingIndex={playingIndex}
            totalDuration={totalDuration}
          />

          {/* Item list */}
          <div className="flex-1 overflow-y-auto">
            {!activeChain || activeChain.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-600 select-none">
                <div className="text-5xl">🔗</div>
                <div className="text-center">
                  <div className="text-gray-400 font-medium mb-1">Chain is empty</div>
                  <div className="text-sm">Click sounds on the left to add them,<br />or drag sounds directly here</div>
                </div>
              </div>
            ) : (
              activeChain.items.map((item, index) => (
                <ChainItemRow
                  key={item.id}
                  item={item}
                  index={index}
                  totalItems={activeChain.items.length}
                  sound={sounds.find((s) => s.id === item.soundId)}
                  isPlaying={playingIndex === index}
                  onMoveUp={() => moveItem(item.id, 'up')}
                  onMoveDown={() => moveItem(item.id, 'down')}
                  onRemove={() => removeItem(item.id)}
                  onDuplicate={() => duplicateItem(item.id)}
                  onSetGap={(gap) => setItemGap(item.id, gap)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Transport bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-900 border-t border-gray-800 shrink-0">
        <button
          onClick={isPlaying ? handleStop : handlePlay}
          disabled={!activeChain || activeChain.items.length === 0}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
            isPlaying
              ? 'bg-amber-600 hover:bg-amber-500 text-white'
              : 'bg-violet-600 hover:bg-violet-500 text-white'
          }`}
        >
          {isPlaying ? (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" />
              </svg>
              Stop
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Play Chain
            </>
          )}
        </button>

        <div className="flex items-center gap-2 text-xs font-mono text-gray-500">
          <span>{activeChain?.items.length ?? 0} sounds</span>
          <span className="text-gray-700">·</span>
          <span>{totalDuration.toFixed(2)}s total</span>
        </div>

        <div className="flex-1" />

        <button
          onClick={handleExport}
          disabled={isExporting || !activeChain || activeChain.items.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isExporting ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Chain WAV
            </>
          )}
        </button>
      </div>
    </div>
  );
}
