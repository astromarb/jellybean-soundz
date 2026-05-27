import React, { useState, useCallback } from 'react';
import { PadAssignment, Sound, JELLYBEAN_COLORS } from '../types';

interface SoundPadProps {
  pad: PadAssignment;
  sound: Sound | undefined;
  padIndex: number;
  keyboardKey: string;
  onPlay: (padIndex: number) => void;
  onContextMenu: (e: React.MouseEvent, padIndex: number) => void;
  onDrop: (padIndex: number, soundId: string) => void;
}

export default function SoundPad({
  pad,
  sound,
  padIndex,
  keyboardKey,
  onPlay,
  onContextMenu,
  onDrop,
}: SoundPadProps) {
  const [isActive, setIsActive] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const color = sound?.color ?? JELLYBEAN_COLORS[padIndex % JELLYBEAN_COLORS.length];

  const handleClick = useCallback(() => {
    if (!sound) return;
    setIsActive(true);
    onPlay(padIndex);
    setTimeout(() => setIsActive(false), 200);
  }, [sound, padIndex, onPlay]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const soundId = e.dataTransfer.getData('application/x-sound-id');
    if (soundId) onDrop(padIndex, soundId);
  };

  const isEmpty = !sound;

  return (
    <button
      className={`
        relative flex flex-col items-center justify-center rounded-xl font-medium
        transition-all duration-100 select-none cursor-pointer
        border-2 overflow-hidden group
        ${isEmpty
          ? 'border-gray-700 bg-gray-800/50 hover:bg-gray-800 hover:border-gray-600'
          : 'hover:brightness-110 active:scale-95'
        }
        ${isDragOver ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-900' : ''}
        ${isActive ? 'pad-active' : ''}
      `}
      style={
        !isEmpty
          ? {
              borderColor: `${color}60`,
              background: `linear-gradient(135deg, ${color}18 0%, ${color}08 100%)`,
              boxShadow: isActive
                ? `0 0 30px ${color}80, inset 0 0 20px ${color}20`
                : `0 0 ${isDragOver ? '20px' : '0px'} ${color}40`,
            }
          : undefined
      }
      onClick={handleClick}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, padIndex); }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      aria-label={`Pad ${padIndex + 1}${sound ? ': ' + sound.name : ' (empty)'}`}
    >
      {/* Background glow when active */}
      {!isEmpty && isActive && (
        <div
          className="absolute inset-0 opacity-30 rounded-xl"
          style={{ background: color }}
        />
      )}

      {/* Color accent bar */}
      {!isEmpty && (
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
          style={{ background: color, opacity: 0.8 }}
        />
      )}

      {/* Sound name */}
      <div className="flex flex-col items-center gap-1 px-2 z-10">
        {!isEmpty ? (
          <>
            <div
              className="w-3 h-3 rounded-full mb-1"
              style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
            />
            <span className="text-xs font-semibold text-center leading-tight text-white line-clamp-2">
              {sound.name}
            </span>
            <span className="text-xs text-gray-500 font-mono">
              {sound.synthParams.synthType.replace('Synth', '')}
            </span>
          </>
        ) : (
          <span className="text-xs text-gray-600">Empty</span>
        )}
      </div>

      {/* Keyboard shortcut badge */}
      <div className="absolute bottom-1.5 right-2">
        <span className="text-xs font-mono text-gray-600 group-hover:text-gray-400 transition-colors">
          {keyboardKey}
        </span>
      </div>
    </button>
  );
}
