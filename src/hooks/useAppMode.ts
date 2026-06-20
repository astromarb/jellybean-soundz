import { useState, useCallback } from 'react';
import { AppMode } from '../types';

const LS_KEY = 'jb-app-mode';

function readMode(): AppMode {
  if (typeof localStorage === 'undefined') return 'personal';
  const v = localStorage.getItem(LS_KEY);
  return v === 'commercial' || v === 'research' || v === 'personal' ? v : 'personal';
}

/** Global workspace mode (Personal / Commercial / Research), persisted in localStorage. */
export function useAppMode(): [AppMode, (m: AppMode) => void] {
  const [mode, setModeState] = useState<AppMode>(readMode);

  const setMode = useCallback((m: AppMode) => {
    setModeState(m);
    try { localStorage.setItem(LS_KEY, m); } catch { /* ignore */ }
  }, []);

  return [mode, setMode];
}
