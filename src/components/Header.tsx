import React from 'react';
import { AppMode } from '../types';
import { MODE_INFO } from '../lib/rights';

interface HeaderProps {
  onExportAll: () => void;
  mode: AppMode;
  onModeChange: (m: AppMode) => void;
}

const MODES: AppMode[] = ['personal', 'commercial', 'research'];

export default function Header({ onExportAll, mode, onModeChange }: HeaderProps) {
  const active = MODE_INFO[mode];
  return (
    <header className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🍬</span>
        <span className="font-bold text-lg tracking-tight">
          <span className="text-white">jellybean</span>
          <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent ml-1">
            soundz
          </span>
        </span>
        <span className="ml-2 text-xs text-gray-500 font-mono bg-gray-800 px-2 py-0.5 rounded">
          v0.1.0
        </span>
      </div>

      {/* Workspace mode selector */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-0.5 bg-gray-800 border border-gray-700 rounded-lg p-0.5">
          {MODES.map((m) => {
            const info = MODE_INFO[m];
            const isActive = m === mode;
            return (
              <button
                key={m}
                onClick={() => onModeChange(m)}
                title={info.blurb}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  isActive ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <span className="mr-1">{info.emoji}</span>
                {info.label}
              </button>
            );
          })}
        </div>
        <p className="hidden lg:block text-[10px] text-gray-500 max-w-[18rem] truncate" title={active.blurb}>
          {active.blurb}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onExportAll}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-md transition-all border border-gray-700 hover:border-gray-600"
          title="Export all sounds as ZIP"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export All
        </button>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-md transition-all border border-gray-700 hover:border-gray-600"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
          </svg>
          GitHub
        </a>
      </div>
    </header>
  );
}
