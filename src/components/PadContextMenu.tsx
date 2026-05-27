import React, { useEffect, useRef } from 'react';
import { Sound } from '../types';

interface PadContextMenuProps {
  x: number;
  y: number;
  padIndex: number;
  sounds: Sound[];
  onAssign: (padIndex: number, soundId: string) => void;
  onClear: (padIndex: number) => void;
  onRename: (padIndex: number) => void;
  onClose: () => void;
}

export default function PadContextMenu({
  x,
  y,
  padIndex,
  sounds,
  onAssign,
  onClear,
  onRename,
  onClose,
}: PadContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to stay in viewport
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - 300);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl py-1 w-52 text-sm"
      style={{ left: adjustedX, top: adjustedY }}
    >
      <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-widest border-b border-gray-700 mb-1">
        Pad {padIndex + 1}
      </div>

      {/* Assign submenu */}
      <div className="px-2">
        <div className="text-xs text-gray-400 px-2 py-1">Assign Sound</div>
        <div className="max-h-36 overflow-y-auto space-y-0.5">
          {sounds.length === 0 ? (
            <div className="text-xs text-gray-600 px-2 py-1">No sounds in library</div>
          ) : (
            sounds.map((sound) => (
              <button
                key={sound.id}
                onClick={() => { onAssign(padIndex, sound.id); onClose(); }}
                className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-700 text-left text-gray-200 transition-colors"
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: sound.color }}
                />
                <span className="truncate">{sound.name}</span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="border-t border-gray-700 mt-1 pt-1 px-2 space-y-0.5">
        <button
          onClick={() => { onRename(padIndex); onClose(); }}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-700 text-left text-gray-200 transition-colors"
        >
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Rename Pad
        </button>
        <button
          onClick={() => { onClear(padIndex); onClose(); }}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-red-900/40 text-left text-red-400 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Clear Pad
        </button>
      </div>
    </div>
  );
}
