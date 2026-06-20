import React from 'react';
import { Sound } from '../types';
import { rightsBadge } from '../lib/rights';

interface SoundLibraryItemProps {
  sound: Sound;
  isSelected: boolean;
  onSelect: (sound: Sound) => void;
  onPlay: (sound: Sound) => void;
  onDelete: (sound: Sound) => void;
  onDownload: (sound: Sound) => void;
}

export default function SoundLibraryItem({
  sound,
  isSelected,
  onSelect,
  onPlay,
  onDelete,
  onDownload,
}: SoundLibraryItemProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/x-sound-id', sound.id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${sound.name}"?`)) {
      onDelete(sound);
    }
  };

  const shortType = sound.synthParams.synthType.replace('Synth', '').replace('Pluck', 'PLK') || 'SYN';
  const badge = rightsBadge(sound.rights);

  return (
    <div
      className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-all duration-150 select-none ${
        isSelected
          ? 'bg-gray-700 ring-1 ring-offset-0'
          : 'hover:bg-gray-800'
      }`}
      style={isSelected ? { outline: `1px solid ${sound.color}` } : {}}
      onClick={() => onSelect(sound)}
      draggable
      onDragStart={handleDragStart}
      title={`Drag to assign to a pad`}
    >
      {/* Color dot */}
      <div
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: sound.color, boxShadow: `0 0 6px ${sound.color}80` }}
      />

      {/* Name + type */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-gray-100 truncate">{sound.name}</span>
          {sound.tags?.includes('ai') && (
            <span title="AI-generated" className="text-[9px] text-violet-400 shrink-0">✨</span>
          )}
          {sound.tags?.includes('seed') && (
            <span title="Built-in preset" className="text-[9px] text-emerald-500 shrink-0">🌱</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 font-mono">{shortType}</span>
          <span
            title={badge.title}
            className={`px-1 py-px rounded text-[8px] font-medium border ${badge.className} shrink-0`}
          >
            {badge.emoji} {badge.label}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onPlay(sound); }}
          className="p-1 rounded hover:bg-gray-600 text-gray-400 hover:text-white transition-colors"
          title="Play"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDownload(sound); }}
          className="p-1 rounded hover:bg-gray-600 text-gray-400 hover:text-white transition-colors"
          title="Download WAV"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
        <button
          onClick={handleDelete}
          className="p-1 rounded hover:bg-red-900/50 text-gray-400 hover:text-red-400 transition-colors"
          title="Delete"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
