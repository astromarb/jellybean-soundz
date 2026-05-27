import React, { useState, useEffect, useCallback } from 'react';
import { PadAssignment, Sound } from '../types';
import SoundPad from './SoundPad';
import PadContextMenu from './PadContextMenu';
import { playAudioBlob } from '../lib/audio';
import * as db from '../lib/db';

const KEYBOARD_KEYS = ['1', '2', '3', '4', 'q', 'w', 'e', 'r', '5', '6', '7', '8', 't', 'y', 'u', 'i'];

interface ContextMenuState {
  x: number;
  y: number;
  padIndex: number;
}

interface PadGridProps {
  pads: PadAssignment[];
  sounds: Sound[];
  onAssignSound: (padIndex: number, soundId: string) => void;
  onClearPad: (padIndex: number) => void;
  onRenamePad: (padIndex: number, name: string) => void;
  onSelectSound: (sound: Sound) => void;
}

export default function PadGrid({
  pads,
  sounds,
  onAssignSound,
  onClearPad,
  onRenamePad,
  onSelectSound,
}: PadGridProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const soundMap = new Map(sounds.map((s) => [s.id, s]));

  const playPad = useCallback(
    async (padIndex: number) => {
      const pad = pads[padIndex];
      if (!pad?.soundId) return;
      const sound = soundMap.get(pad.soundId);
      if (!sound) return;

      onSelectSound(sound);

      try {
        const blob = await db.getAudioBlob(pad.soundId);
        if (blob) {
          await playAudioBlob(blob);
        }
      } catch (err) {
        console.error('Error playing pad sound:', err);
      }
    },
    [pads, soundMap, onSelectSound]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      const index = KEYBOARD_KEYS.indexOf(key);
      if (index !== -1 && index < pads.length) {
        playPad(index);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pads, playPad]);

  const handleContextMenu = (e: React.MouseEvent, padIndex: number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, padIndex });
  };

  const handleDrop = (padIndex: number, soundId: string) => {
    onAssignSound(padIndex, soundId);
  };

  const handleRenamePrompt = (padIndex: number) => {
    const pad = pads[padIndex];
    const newName = window.prompt('Enter new pad name:', pad.padName);
    if (newName && newName.trim()) {
      onRenamePad(padIndex, newName.trim());
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 relative">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 shrink-0">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Pad Grid</h2>
        <span className="text-xs text-gray-600">Right-click for options · Drag sounds from library</span>
      </div>

      {/* Grid */}
      <div className="flex-1 p-3 grid grid-cols-4 grid-rows-4 gap-2">
        {pads.map((pad, index) => (
          <SoundPad
            key={pad.padIndex}
            pad={pad}
            sound={pad.soundId ? soundMap.get(pad.soundId) : undefined}
            padIndex={index}
            keyboardKey={KEYBOARD_KEYS[index] ?? ''}
            onPlay={playPad}
            onContextMenu={handleContextMenu}
            onDrop={handleDrop}
          />
        ))}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <PadContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          padIndex={contextMenu.padIndex}
          sounds={sounds}
          onAssign={onAssignSound}
          onClear={onClearPad}
          onRename={handleRenamePrompt}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
