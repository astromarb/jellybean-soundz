import React from 'react';
import { Sound } from '../types';
import SoundLibraryItem from './SoundLibraryItem';

interface SoundLibraryProps {
  sounds: Sound[];
  selectedSound: Sound | null;
  onSelectSound: (sound: Sound) => void;
  onPlaySound: (sound: Sound) => void;
  onDeleteSound: (sound: Sound) => void;
  onDownloadSound: (sound: Sound) => void;
  onNewSound: () => void;
}

export default function SoundLibrary({
  sounds,
  selectedSound,
  onSelectSound,
  onPlaySound,
  onDeleteSound,
  onDownloadSound,
  onNewSound,
}: SoundLibraryProps) {
  return (
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 shrink-0">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Library</h2>
        <span className="text-xs text-gray-600 font-mono">{sounds.length}</span>
      </div>

      {/* Sound list */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {sounds.length === 0 ? (
          <div className="text-center py-8 text-gray-600 text-sm">
            <div className="text-2xl mb-2">🎵</div>
            No sounds yet
          </div>
        ) : (
          sounds.map((sound) => (
            <SoundLibraryItem
              key={sound.id}
              sound={sound}
              isSelected={selectedSound?.id === sound.id}
              onSelect={onSelectSound}
              onPlay={onPlaySound}
              onDelete={onDeleteSound}
              onDownload={onDownloadSound}
            />
          ))
        )}
      </div>

      {/* New Sound button */}
      <div className="px-3 py-3 border-t border-gray-800 shrink-0">
        <button
          onClick={onNewSound}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white transition-all shadow-lg hover:shadow-purple-500/25"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Sound
        </button>
      </div>
    </div>
  );
}
