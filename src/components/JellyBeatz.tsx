import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
} from 'react';
import HumModal from './HumModal';
import PianoRoll from './PianoRoll';
import * as Tone from 'tone';
import { Sound, JELLYBEAN_COLORS, InstrumentType, NoteDuration, NOTE_DURATIONS, BeatzTrack } from '../types';
import { useBeatz } from '../hooks/useBeatz';
import {
  startBeatz,
  stopBeatz,
  pauseBeatz,
  resumeBeatz,
  exportBeatz,
  INSTRUMENT_EMOJI,
  INSTRUMENT_LABEL,
} from '../lib/beatzEngine';
import { downloadBlob } from '../lib/wavEncoder';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  sounds: Sound[];
  audioEnabled: boolean;
  enableAudio: () => Promise<void>;
}

interface ContextMenu {
  trackId: string;
  x: number;
  y: number;
}

interface StepEditorState {
  trackId: string;
  stepIndex: number;
  currentNote: string;
  currentDuration: NoteDuration;
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INSTRUMENTS: InstrumentType[] = [
  'Piano', 'Pluck', 'Strings', 'Violin', 'Cello', 'Choir',
  'Brass', 'Flute', 'Lead', 'Pad', 'Bass', 'Arp',
  'Kick', 'Snare', 'HiHat',
];

const SIDEBAR_W = 264;

// Width (px) of one 16th-note step cell — drives the horizontal zoom level
const STEP_W_MIN = 8;
const STEP_W_MAX = 52;
const STEP_W_DEFAULT = 20;

// Compute the pixel width of one bar at a given step cell size
function barPixelWidth(stepW: number, stepsPerBar: number): number {
  const beatsPerBar = stepsPerBar / 4;
  // beat group = 4 steps + 3 inner gaps (gap-0.5 = 2px) + 2px left+right padding
  const beatGroupW = 4 * stepW + 3 * 2 + 4;
  // bar = N beat groups + (N-1) gaps between groups (gap-0.5 = 2px)
  return beatsPerBar * beatGroupW + (beatsPerBar - 1) * 2;
}

const NOTES_IN_OCTAVE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const OCTAVES = [2, 3, 4, 5];

function buildNoteList(): string[] {
  const notes: string[] = [];
  for (const oct of OCTAVES) {
    for (const n of NOTES_IN_OCTAVE) {
      notes.push(`${n}${oct}`);
    }
  }
  return notes;
}

const ALL_NOTES = buildNoteList();

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StepEditor({
  currentNote,
  currentDuration,
  onSelectNote,
  onSelectDuration,
  onClose,
  anchorX,
  anchorY,
}: {
  currentNote: string;
  currentDuration: NoteDuration;
  onSelectNote: (note: string) => void;
  onSelectDuration: (d: NoteDuration) => void;
  onClose: () => void;
  anchorX: number;
  anchorY: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<'note' | 'duration'>('note');

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const [pos, setPos] = useState({ left: anchorX, top: anchorY });
  useLayoutEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = anchorX;
    let top = anchorY;
    if (left + rect.width > vw - 8) left = vw - rect.width - 8;
    if (top + rect.height > vh - 8) top = vh - rect.height - 8;
    if (left < 8) left = 8;
    if (top < 8) top = 8;
    setPos({ left, top });
  }, [anchorX, anchorY]);

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl select-none"
      style={{ left: pos.left, top: pos.top, minWidth: 280 }}
    >
      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setTab('note')}
          className={`flex-1 py-1.5 text-xs font-semibold uppercase tracking-widest transition-colors ${tab === 'note' ? 'text-violet-400 border-b-2 border-violet-500' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Note — {currentNote}
        </button>
        <button
          onClick={() => setTab('duration')}
          className={`flex-1 py-1.5 text-xs font-semibold uppercase tracking-widest transition-colors ${tab === 'duration' ? 'text-violet-400 border-b-2 border-violet-500' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Duration — {NOTE_DURATIONS.find(d => d.value === currentDuration)?.short ?? currentDuration}
        </button>
      </div>

      {tab === 'note' && (
        <div className="p-3 space-y-1">
          {OCTAVES.map(oct => (
            <div key={oct} className="flex gap-1">
              <div className="w-6 text-xs text-gray-500 font-mono self-center">{oct}</div>
              {NOTES_IN_OCTAVE.map(n => {
                const note = `${n}${oct}`;
                const isSharp = n.includes('#');
                const isSelected = note === currentNote;
                return (
                  <button
                    key={note}
                    onClick={() => { onSelectNote(note); onClose(); }}
                    className={`text-xs font-mono rounded transition-all w-7 h-6 ${isSharp ? 'bg-gray-800 text-gray-300 text-[9px]' : 'bg-gray-700 text-white'} ${isSelected ? 'ring-2 ring-violet-400' : 'hover:brightness-125'}`}
                    style={isSelected ? { backgroundColor: '#7700FF', color: '#fff' } : undefined}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {tab === 'duration' && (
        <div className="p-3">
          <div className="grid grid-cols-3 gap-2">
            {NOTE_DURATIONS.map(d => (
              <button
                key={d.value}
                onClick={() => { onSelectDuration(d.value); onClose(); }}
                className={`flex flex-col items-center py-3 rounded-lg border transition-all ${
                  d.value === currentDuration
                    ? 'bg-violet-600 border-violet-400 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
                }`}
              >
                <DurationIcon value={d.value} />
                <span className="text-xs font-mono mt-1">{d.short}</span>
                <span className="text-[10px] text-gray-400">{d.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DurationIcon({ value }: { value: NoteDuration }) {
  const filled = { '1n': 1, '2n': 2, '4n': 4, '8n': 8, '16n': 16, '32n': 32 }[value] ?? 16;
  const boxes = Math.min(8, Math.round(16 / filled));
  return (
    <div className="flex gap-0.5 h-3 items-center">
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          className={`h-full rounded-sm ${i < boxes ? 'bg-current w-2' : 'bg-gray-700 w-1'}`}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function JellyBeatz({ sounds, audioEnabled, enableAudio }: Props) {
  const beatz = useBeatz(sounds);

  // Playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isExporting, setIsExporting] = useState(false);

  // UI state
  const [showSoundPicker, setShowSoundPicker] = useState(false);
  const [showInstrumentPicker, setShowInstrumentPicker] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [stepEditor, setStepEditor] = useState<StepEditorState | null>(null);
  const [showHumModal, setShowHumModal] = useState(false);
  const [pianoRollTrackId, setPianoRollTrackId] = useState<string | null>(null);
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renamingTrackId, setRenamingTrackId] = useState<string | null>(null);
  const [renameTrackValue, setRenameTrackValue] = useState('');
  const [editingBpm, setEditingBpm] = useState(false);
  const [bpmInput, setBpmInput] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [showNewProjectInput, setShowNewProjectInput] = useState(false);
  const [stepW, setStepW] = useState(STEP_W_DEFAULT);

  const gridRef = useRef<HTMLDivElement>(null);
  const soundPickerRef = useRef<HTMLDivElement>(null);
  const instrPickerRef = useRef<HTMLDivElement>(null);
  // Decouples Tone.js audio callback from React renders: write step to ref,
  // read it in a RAF loop so state updates happen at display refresh rate (~60fps)
  // rather than on every audio scheduler tick.
  const currentStepRef = useRef(-1);
  const prevPlayBarRef = useRef(-1);

  const project = beatz.activeProject;

  // ── Stop on unmount ──
  useEffect(() => {
    return () => {
      stopBeatz();
    };
  }, []);

  // ── Stop when project changes ──
  useEffect(() => {
    if (isPlaying) {
      stopBeatz();
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentStep(-1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beatz.activeProjectId]);

  // ── Close pickers on outside click ──
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (soundPickerRef.current && !soundPickerRef.current.contains(e.target as Node)) {
        setShowSoundPicker(false);
      }
      if (instrPickerRef.current && !instrPickerRef.current.contains(e.target as Node)) {
        setShowInstrumentPicker(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // ── Close context menu on outside click ──
  useEffect(() => {
    if (!contextMenu) return;
    function handle() { setContextMenu(null); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [contextMenu]);

  // ── RAF loop: sync currentStepRef → currentStep state at display refresh rate ──
  useEffect(() => {
    if (!isPlaying || isPaused) return;
    let raf: number;
    const sync = () => {
      // Functional update: React bails out without re-render if value is unchanged
      setCurrentStep(prev => {
        const next = currentStepRef.current;
        return next === prev ? prev : next;
      });
      raf = requestAnimationFrame(sync);
    };
    raf = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, isPaused]);

  // ── Auto-scroll: follow the playhead, advance view when nearing right edge ──
  useEffect(() => {
    if (!isPlaying || isPaused || currentStep < 0 || !gridRef.current || !project) return;
    const currentBar = Math.floor(currentStep / project.stepsPerBar);
    if (currentBar === prevPlayBarRef.current) return;
    prevPlayBarRef.current = currentBar;

    const container = gridRef.current;
    // +13 per bar gap accounts for bar separator (w-px mx-1 = 9px) + surrounding gaps
    const barW = barPixelWidth(stepW, project.stepsPerBar) + 13;
    const barPx = SIDEBAR_W + currentBar * barW;

    if (currentBar === 0) {
      container.scrollTo({ left: 0, behavior: 'smooth' });
      return;
    }
    // Scroll forward when the current bar enters the right 30% of the visible area
    const visibleRight = container.scrollLeft + container.clientWidth;
    if (barPx > visibleRight - container.clientWidth * 0.3) {
      container.scrollTo({
        left: Math.max(0, barPx - SIDEBAR_W - 20),
        behavior: 'smooth',
      });
    }
  }, [currentStep, isPlaying, isPaused, project, stepW]);

  // ── Transport ──
  const handlePlay = useCallback(async () => {
    if (!audioEnabled) await enableAudio();
    if (isPlaying && isPaused) {
      resumeBeatz();
      setIsPaused(false);
    } else if (!isPlaying && project) {
      await Tone.start();
      // Write step index to ref only — no React setState from audio callback
      await startBeatz(project, sounds, (step) => {
        currentStepRef.current = step;
      });
      setIsPlaying(true);
      setIsPaused(false);
    }
  }, [isPlaying, isPaused, project, sounds, audioEnabled, enableAudio]);

  const handlePause = useCallback(() => {
    if (!isPlaying || isPaused) return;
    pauseBeatz();
    setIsPaused(true);
  }, [isPlaying, isPaused]);

  const handleStop = useCallback(() => {
    stopBeatz();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentStep(-1);
    currentStepRef.current = -1;
    prevPlayBarRef.current = -1;
  }, []);

  // ── Export ──
  const handleExport = useCallback(async () => {
    if (!project || isExporting) return;
    if (!audioEnabled) await enableAudio();
    setIsExporting(true);
    try {
      const blob = await exportBeatz(project, sounds);
      downloadBlob(blob, `${project.name.replace(/\s+/g, '_')}.wav`);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Check console for details.');
    } finally {
      setIsExporting(false);
    }
  }, [project, sounds, audioEnabled, enableAudio, isExporting]);

  // ── BPM helpers ──
  const startEditBpm = () => {
    if (!project) return;
    setBpmInput(String(project.bpm));
    setEditingBpm(true);
  };

  const commitBpm = () => {
    const n = parseInt(bpmInput, 10);
    if (!isNaN(n)) beatz.setBpm(n);
    setEditingBpm(false);
  };

  // ── Rename project ──
  const startRenameProject = () => {
    if (!project) return;
    setRenamingProjectId(project.id);
    setRenameValue(project.name);
  };

  const commitRenameProject = () => {
    if (renamingProjectId && renameValue.trim()) {
      beatz.renameProject(renamingProjectId, renameValue.trim());
    }
    setRenamingProjectId(null);
    setRenameValue('');
  };

  // ── Track renaming ──
  const startRenameTrack = (trackId: string, currentName: string) => {
    setRenamingTrackId(trackId);
    setRenameTrackValue(currentName);
  };

  const commitRenameTrack = () => {
    if (renamingTrackId && renameTrackValue.trim()) {
      beatz.renameTrack(renamingTrackId, renameTrackValue.trim());
    }
    setRenamingTrackId(null);
    setRenameTrackValue('');
  };

  // ── Color cycling ──
  const cycleColor = useCallback((track: BeatzTrack) => {
    const idx = JELLYBEAN_COLORS.indexOf(track.color);
    const next = JELLYBEAN_COLORS[(idx + 1) % JELLYBEAN_COLORS.length];
    beatz.setTrackColor(track.id, next);
  }, [beatz]);

  // ── Context menu ──
  const openContextMenu = (e: React.MouseEvent, trackId: string) => {
    e.preventDefault();
    setContextMenu({ trackId, x: e.clientX, y: e.clientY });
  };

  // ── Step interaction ──
  const handleStepClick = useCallback((track: BeatzTrack, stepIndex: number) => {
    beatz.toggleStep(track.id, stepIndex);
  }, [beatz]);

  const handleStepRightClick = useCallback((
    e: React.MouseEvent,
    track: BeatzTrack,
    stepIndex: number,
  ) => {
    e.preventDefault();
    if (track.type !== 'instrument') return;
    const step = track.steps[stepIndex];
    setStepEditor({
      trackId: track.id,
      stepIndex,
      currentNote: step.note || track.defaultNote,
      currentDuration: step.duration || track.stepDuration || '16n',
      x: e.clientX,
      y: e.clientY,
    });
  }, []);

  // ── Duration calculation ──
  const calcDuration = () => {
    if (!project) return '0:00';
    const bps = project.bpm / 60;
    const totalBeats = project.bars * 4;
    const seconds = totalBeats / bps;
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (beatz.loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="text-3xl">🎵</div>
          <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          <div className="text-gray-400 text-sm font-mono">Loading JELLYBEATZ...</div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-950">
        <div className="text-center space-y-4">
          <div className="text-5xl">🎵</div>
          <p className="text-gray-400">No projects yet.</p>
          <button
            onClick={() => beatz.addProject('Beat 1')}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            + New Project
          </button>
        </div>
      </div>
    );
  }

  const totalSteps = project.bars * project.stepsPerBar;

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-gray-950 text-white select-none">
      {/* ── Header ── */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 bg-gray-900 border-b border-gray-800 flex-wrap">
        {/* Project selector */}
        <div className="flex items-center gap-1">
          {renamingProjectId === project.id ? (
            <input
              autoFocus
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onBlur={commitRenameProject}
              onKeyDown={e => { if (e.key === 'Enter') commitRenameProject(); if (e.key === 'Escape') setRenamingProjectId(null); }}
              className="bg-gray-800 border border-violet-500 text-white text-sm rounded px-2 py-1 w-32 font-mono"
            />
          ) : (
            <select
              value={project.id}
              onChange={e => beatz.setActiveProjectId(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white text-sm rounded px-2 py-1 font-mono cursor-pointer"
            >
              {beatz.projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={startRenameProject}
            title="Rename project"
            className="p-1 text-gray-400 hover:text-white transition-colors text-xs"
          >
            ✏️
          </button>
        </div>

        {/* New project */}
        {showNewProjectInput ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              onBlur={() => {
                if (newProjectName.trim()) beatz.addProject(newProjectName.trim());
                setShowNewProjectInput(false);
                setNewProjectName('');
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  if (newProjectName.trim()) beatz.addProject(newProjectName.trim());
                  setShowNewProjectInput(false);
                  setNewProjectName('');
                }
                if (e.key === 'Escape') { setShowNewProjectInput(false); setNewProjectName(''); }
              }}
              placeholder="Project name..."
              className="bg-gray-800 border border-violet-500 text-white text-sm rounded px-2 py-1 w-32 font-mono"
            />
          </div>
        ) : (
          <button
            onClick={() => setShowNewProjectInput(true)}
            className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700 transition-colors"
          >
            + New
          </button>
        )}

        {beatz.projects.length > 1 && (
          <button
            onClick={() => {
              if (confirm(`Delete "${project.name}"?`)) beatz.deleteProject(project.id);
            }}
            className="px-2 py-1 text-xs bg-gray-800 hover:bg-red-900 text-gray-400 hover:text-red-300 rounded border border-gray-700 transition-colors"
          >
            Delete
          </button>
        )}

        <div className="w-px h-5 bg-gray-700 mx-1" />

        {/* BPM */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 font-mono">BPM</span>
          {editingBpm ? (
            <input
              autoFocus
              value={bpmInput}
              onChange={e => setBpmInput(e.target.value)}
              onBlur={commitBpm}
              onKeyDown={e => { if (e.key === 'Enter') commitBpm(); if (e.key === 'Escape') setEditingBpm(false); }}
              className="bg-gray-800 border border-violet-500 text-white text-sm rounded px-2 py-1 w-16 font-mono text-center"
              type="number"
              min={40}
              max={250}
            />
          ) : (
            <button
              onClick={startEditBpm}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white text-sm font-mono rounded px-2 py-1 w-16 text-center transition-colors"
            >
              {project.bpm}
            </button>
          )}
          <div className="flex flex-col gap-0.5">
            <button
              onClick={() => beatz.setBpm(project.bpm + 1)}
              className="text-gray-400 hover:text-white leading-none text-[10px] px-0.5"
            >▲</button>
            <button
              onClick={() => beatz.setBpm(project.bpm - 1)}
              className="text-gray-400 hover:text-white leading-none text-[10px] px-0.5"
            >▼</button>
          </div>
        </div>

        {/* Bars */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 font-mono">Bars</span>
          <select
            value={project.bars}
            onChange={e => beatz.setBars(parseInt(e.target.value, 10))}
            className="bg-gray-800 border border-gray-700 text-white text-sm rounded px-1 py-1 font-mono cursor-pointer"
          >
            {[1, 2, 4, 8, 16, 32].map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        <div className="w-px h-5 bg-gray-700 mx-1" />

        {/* Duration */}
        <span className="text-xs text-gray-500 font-mono">{calcDuration()}</span>

        <div className="ml-auto flex items-center gap-2">
          {/* Transport: Play / Pause / Stop */}
          <div className="flex items-center gap-1">
            <button
              onClick={handlePlay}
              disabled={isPlaying && !isPaused}
              className={`
                px-4 py-1.5 rounded-lg text-sm font-bold transition-all
                ${isPlaying && !isPaused
                  ? 'bg-gray-700 text-gray-400 cursor-default'
                  : 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/40'}
              `}
            >
              ▶ {isPaused ? 'Resume' : 'Play'}
            </button>
            <button
              onClick={handlePause}
              disabled={!isPlaying || isPaused}
              className="px-3 py-1.5 rounded-lg text-sm font-bold bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:opacity-40"
              title="Pause"
            >
              ⏸
            </button>
            <button
              onClick={handleStop}
              disabled={!isPlaying}
              className="px-3 py-1.5 rounded-lg text-sm font-bold bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-40 disabled:bg-gray-700"
              title="Stop"
            >
              ⏹
            </button>
          </div>

          {/* Export */}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:opacity-50"
          >
            {isExporting ? '⏳ Exporting...' : '💾 Export WAV'}
          </button>
        </div>
      </div>

      {/* ── Track Add Buttons ── */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-gray-900/80 border-b border-gray-800">
        {/* Add Sound Track */}
        <div className="relative" ref={soundPickerRef}>
          <button
            onClick={() => { setShowSoundPicker(v => !v); setShowInstrumentPicker(false); }}
            className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors"
          >
            + Add Sound Track
          </button>
          {showSoundPicker && (
            <div className="absolute top-full left-0 mt-1 z-30 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl min-w-[180px] max-h-60 overflow-y-auto">
              {sounds.length === 0 ? (
                <div className="px-3 py-4 text-xs text-gray-400 text-center">
                  No sounds in library.<br />Create sounds on the Soundboard tab.
                </div>
              ) : (
                sounds.map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      beatz.addSoundTrack(s.id, { name: s.name, color: s.color });
                      setShowSoundPicker(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 flex items-center gap-2 transition-colors"
                  >
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="truncate">{s.name}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Add Instrument */}
        <div className="relative" ref={instrPickerRef}>
          <button
            onClick={() => { setShowInstrumentPicker(v => !v); setShowSoundPicker(false); }}
            className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors"
          >
            + Add Instrument
          </button>
          {showInstrumentPicker && (
            <div className="absolute top-full left-0 mt-1 z-30 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl p-2">
              <div className="grid grid-cols-2 gap-1" style={{ minWidth: 220 }}>
                {INSTRUMENTS.map(instr => (
                  <button
                    key={instr}
                    onClick={() => {
                      beatz.addInstrumentTrack(instr);
                      setShowInstrumentPicker(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
                  >
                    <span className="text-base">{INSTRUMENT_EMOJI[instr]}</span>
                    <span className="font-medium">{INSTRUMENT_LABEL[instr]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Hum Melody */}
        <button
          onClick={() => setShowHumModal(true)}
          className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors"
        >
          🎵 Hum Melody
        </button>

        {/* Demo song */}
        <button
          onClick={() => beatz.loadDemoSong()}
          title="Load the 32-bar showcase composition as a new project"
          className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors"
        >
          ✨ Demo Song
        </button>

        {/* Zoom / step-width control */}
        <div className="ml-auto flex items-center gap-1.5 pl-2 border-l border-gray-700">
          <span className="text-[10px] text-gray-500 font-mono">Zoom</span>
          <button
            onClick={() => setStepW(w => Math.max(STEP_W_MIN, w - 4))}
            className="w-5 h-5 flex items-center justify-center text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded transition-colors"
            title="Zoom out"
          >−</button>
          <input
            type="range"
            min={STEP_W_MIN}
            max={STEP_W_MAX}
            step={2}
            value={stepW}
            onChange={e => setStepW(parseInt(e.target.value, 10))}
            className="w-20 h-1.5 accent-violet-500 cursor-pointer"
            title={`Step width: ${stepW}px`}
          />
          <button
            onClick={() => setStepW(w => Math.min(STEP_W_MAX, w + 4))}
            className="w-5 h-5 flex items-center justify-center text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded transition-colors"
            title="Zoom in"
          >+</button>
          <button
            onClick={() => setStepW(STEP_W_DEFAULT)}
            className="text-[9px] text-gray-500 hover:text-gray-300 font-mono transition-colors"
            title="Reset zoom"
          >reset</button>
        </div>
      </div>

      {/* ── Grid Area ── */}
      <div className="flex-1 overflow-auto" ref={gridRef}>
        {project.tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
            <div className="text-5xl">🥁</div>
            <h2 className="text-xl font-bold text-gray-300">No tracks yet</h2>
            <p className="text-gray-500 text-sm max-w-xs">
              Add a sound from your library or choose a synthesizer instrument to start building your beat.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSoundPicker(true)}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                + Add Sound Track
              </button>
              <button
                onClick={() => setShowInstrumentPicker(true)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                + Add Instrument
              </button>
            </div>
          </div>
        ) : (
          <div className="min-w-max">
            {/* Bar labels */}
            <div className="flex sticky top-0 z-10 bg-gray-950/95 backdrop-blur-sm border-b border-gray-800">
              {/* sidebar spacer */}
              <div className="shrink-0" style={{ width: SIDEBAR_W }} />
              <div className="flex">
                {Array.from({ length: project.bars }, (_, bar) => (
                  <div
                    key={bar}
                    className="flex gap-0.5"
                    style={{ width: barPixelWidth(stepW, project.stepsPerBar) }}
                  >
                    <div className="px-1 py-1 text-[10px] text-gray-500 font-mono w-full text-center">
                      Bar {bar + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tracks */}
            {project.tracks.map(track => {
              const soundName = track.type === 'sound'
                ? (sounds.find(s => s.id === track.soundId)?.name ?? track.name)
                : null;

              return (
                <div key={track.id} className="flex items-stretch border-b border-gray-800/60 group hover:bg-gray-900/30 transition-colors">
                  {/* Track Sidebar */}
                  <div
                    className="shrink-0 flex flex-col justify-between px-2 py-1.5 border-r border-gray-800 cursor-context-menu"
                    style={{ width: SIDEBAR_W }}
                    onContextMenu={e => openContextMenu(e, track.id)}
                  >
                    <div className="flex items-center gap-1.5">
                      {/* Color swatch */}
                      <button
                        onClick={() => cycleColor(track)}
                        className="w-3 h-3 rounded-full shrink-0 border border-white/20 hover:scale-110 transition-transform"
                        style={{ backgroundColor: track.color }}
                        title="Cycle color"
                      />

                      {/* Track name */}
                      {renamingTrackId === track.id ? (
                        <input
                          autoFocus
                          value={renameTrackValue}
                          onChange={e => setRenameTrackValue(e.target.value)}
                          onBlur={commitRenameTrack}
                          onKeyDown={e => {
                            if (e.key === 'Enter') commitRenameTrack();
                            if (e.key === 'Escape') setRenamingTrackId(null);
                          }}
                          className="bg-gray-800 border border-violet-500 text-white text-xs rounded px-1 py-0.5 flex-1 font-mono min-w-0"
                        />
                      ) : (
                        <span
                          className="text-xs text-gray-200 font-medium truncate flex-1 cursor-text"
                          onDoubleClick={() => startRenameTrack(track.id, track.name)}
                          title={track.name}
                        >
                          {track.type === 'instrument' && (
                            <span className="mr-1">{INSTRUMENT_EMOJI[track.instrument!]}</span>
                          )}
                          {track.name}
                          {soundName && soundName !== track.name && (
                            <span className="text-gray-500 ml-1 text-[10px]">({soundName})</span>
                          )}
                        </span>
                      )}

                      {/* Piano roll (instrument tracks) */}
                      {track.type === 'instrument' && (
                        <button
                          onClick={() => setPianoRollTrackId(track.id)}
                          className="shrink-0 w-5 h-5 rounded text-[10px] transition-all border bg-gray-800 border-gray-600 text-gray-400 hover:text-white hover:border-violet-500"
                          title="Open piano roll"
                        >
                          🎹
                        </button>
                      )}

                      {/* Mute button */}
                      <button
                        onClick={() => beatz.toggleMute(track.id)}
                        className={`
                          shrink-0 w-5 h-5 rounded text-[9px] font-bold transition-all border
                          ${track.muted
                            ? 'bg-orange-600 border-orange-500 text-white'
                            : 'bg-gray-800 border-gray-600 text-gray-400 hover:text-white'}
                        `}
                        title={track.muted ? 'Unmute' : 'Mute'}
                      >
                        M
                      </button>

                      {/* Solo button */}
                      <button
                        onClick={() => beatz.toggleSolo(track.id)}
                        className={`
                          shrink-0 w-5 h-5 rounded text-[9px] font-bold transition-all border
                          ${track.solo
                            ? 'bg-yellow-500 border-yellow-400 text-gray-900'
                            : 'bg-gray-800 border-gray-600 text-gray-400 hover:text-white'}
                        `}
                        title={track.solo ? 'Unsolo' : 'Solo'}
                      >
                        S
                      </button>
                    </div>

                    {/* Volume slider */}
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[9px] text-gray-500 font-mono w-4">Vol</span>
                      <input
                        type="range"
                        min={-40}
                        max={0}
                        step={1}
                        value={track.volume}
                        onChange={e => beatz.setTrackVolume(track.id, parseInt(e.target.value, 10))}
                        className="flex-1 h-1.5 accent-violet-500 cursor-pointer"
                      />
                      <span className="text-[9px] text-gray-500 font-mono w-7 text-right">{track.volume}dB</span>
                    </div>

                    {/* Pan slider */}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] text-gray-500 font-mono w-4">Pan</span>
                      <input
                        type="range"
                        min={-1}
                        max={1}
                        step={0.05}
                        value={track.pan ?? 0}
                        onChange={e => beatz.setTrackPan(track.id, parseFloat(e.target.value))}
                        onDoubleClick={() => beatz.setTrackPan(track.id, 0)}
                        className="flex-1 h-1.5 accent-cyan-500 cursor-pointer"
                        title="Pan (double-click to center)"
                      />
                      <span className="text-[9px] text-gray-500 font-mono w-7 text-right">
                        {(track.pan ?? 0) === 0 ? 'C' : `${(track.pan ?? 0) < 0 ? 'L' : 'R'}${Math.round(Math.abs(track.pan ?? 0) * 100)}`}
                      </span>
                    </div>

                    {/* FX sends */}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] text-gray-500 font-mono w-4">Rev</span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={track.reverb ?? 0}
                        onChange={e => beatz.setTrackReverb(track.id, parseFloat(e.target.value))}
                        className="flex-1 h-1.5 accent-pink-500 cursor-pointer"
                        title="Reverb send"
                      />
                      <span className="text-[9px] text-gray-500 font-mono w-4">Dly</span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={track.delay ?? 0}
                        onChange={e => beatz.setTrackDelay(track.id, parseFloat(e.target.value))}
                        className="flex-1 h-1.5 accent-emerald-500 cursor-pointer"
                        title="Delay send"
                      />
                    </div>

                    {/* Default note (instrument tracks) */}
                    {track.type === 'instrument' && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] text-gray-500 font-mono w-4">Note</span>
                        <select
                          value={track.defaultNote}
                          onChange={e => beatz.setTrackDefaultNote(track.id, e.target.value)}
                          className="flex-1 text-[9px] bg-gray-800 border border-gray-700 text-gray-300 rounded px-0.5 py-0.5 font-mono cursor-pointer"
                        >
                          {ALL_NOTES.map(n => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Step duration (all track types) */}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] text-gray-500 font-mono w-4">Dur</span>
                      <select
                        value={track.stepDuration ?? '16n'}
                        onChange={e => beatz.setTrackStepDuration(track.id, e.target.value as NoteDuration)}
                        className="flex-1 text-[9px] bg-gray-800 border border-gray-700 text-gray-300 rounded px-0.5 py-0.5 font-mono cursor-pointer"
                        title="Default note duration for all steps on this track"
                      >
                        {NOTE_DURATIONS.map(d => (
                          <option key={d.value} value={d.value}>{d.short} {d.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Step buttons */}
                  <div className="flex items-center px-2 py-1.5 gap-0.5 overflow-x-visible">
                    {Array.from({ length: project.bars }, (_, bar) => (
                      <React.Fragment key={bar}>
                        {/* Beat groups within bar */}
                        {Array.from({ length: 4 }, (_, beat) => (
                          <div
                            key={beat}
                            className={`flex gap-0.5 rounded px-0.5 py-0.5 ${beat % 2 === 0 ? 'bg-gray-900/60' : 'bg-gray-800/30'}`}
                          >
                            {Array.from({ length: 4 }, (_, sub) => {
                              const stepIdx = bar * project.stepsPerBar + beat * 4 + sub;
                              const step = track.steps[stepIdx];
                              const isActive = step?.active ?? false;
                              const isCurrent = isPlaying && stepIdx === currentStep;
                              const effectiveDur = step?.duration || track.stepDuration || '16n';
                              const isNonDefaultDur = isActive && effectiveDur !== '16n';
                              const durShort = NOTE_DURATIONS.find(d => d.value === effectiveDur)?.short;
                              const stepNotes = (step?.note || track.defaultNote).split(',');
                              const noteDisplay = track.type === 'instrument' && isActive
                                ? stepNotes[0].replace(/\d/g, '') + (stepNotes.length > 1 ? '+' : '')
                                : null;

                              return (
                                <button
                                  key={sub}
                                  onClick={() => handleStepClick(track, stepIdx)}
                                  onContextMenu={e => handleStepRightClick(e, track, stepIdx)}
                                  className={`
                                    relative flex-shrink-0 rounded transition-all text-center
                                    ${isActive
                                      ? 'border border-white/20'
                                      : 'bg-gray-800/80 border border-gray-700/50 hover:bg-gray-700/80'}
                                    ${isCurrent ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-950' : ''}
                                  `}
                                  style={{
                                    width: stepW,
                                    height: Math.max(18, stepW),
                                    backgroundColor: isActive ? track.color : undefined,
                                    boxShadow: isActive
                                      ? `0 0 8px ${track.color}88, 0 0 3px ${track.color}`
                                      : undefined,
                                  }}
                                  title={
                                    track.type === 'instrument'
                                      ? `Step ${stepIdx + 1}: ${step?.note || track.defaultNote} / ${durShort} (right-click to edit)`
                                      : `Step ${stepIdx + 1}${isNonDefaultDur ? ` / ${durShort}` : ''}`
                                  }
                                >
                                  {/* Note name label — only shown when cells are wide enough */}
                                  {stepW >= 18 && noteDisplay && !isNonDefaultDur && (
                                    <span
                                      className="absolute inset-0 flex items-center justify-center text-[8px] font-bold pointer-events-none"
                                      style={{ color: 'rgba(255,255,255,0.85)', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                                    >
                                      {noteDisplay}
                                    </span>
                                  )}
                                  {/* Duration badge */}
                                  {stepW >= 18 && isNonDefaultDur && (
                                    <span
                                      className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none leading-none gap-px"
                                      style={{ color: 'rgba(255,255,255,0.9)', textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}
                                    >
                                      {noteDisplay && <span className="text-[7px] font-bold">{noteDisplay}</span>}
                                      <span className="text-[6px] font-bold opacity-80">{durShort}</span>
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ))}
                        {/* Bar separator */}
                        {bar < project.bars - 1 && (
                          <div className="w-px bg-gray-600 mx-1 self-center" style={{ height: Math.max(18, stepW) }} />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Context Menu ── */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl py-1 min-w-[180px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseDown={e => e.stopPropagation()}
        >
          <button
            onClick={() => { beatz.clearTrack(contextMenu.trackId); setContextMenu(null); }}
            className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
          >
            🗑 Clear all steps
          </button>
          <button
            onClick={() => { beatz.fillTrack(contextMenu.trackId, 'every4'); setContextMenu(null); }}
            className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
          >
            ▐▌ Fill every 4th step
          </button>
          <button
            onClick={() => { beatz.fillTrack(contextMenu.trackId, 'everyOther'); setContextMenu(null); }}
            className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
          >
            ▐▌ Fill every other step
          </button>
          <button
            onClick={() => { beatz.fillTrack(contextMenu.trackId, 'all'); setContextMenu(null); }}
            className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
          >
            ████ Fill all steps
          </button>
          <div className="my-1 border-t border-gray-700" />
          <button
            onClick={() => {
              beatz.removeTrack(contextMenu.trackId);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-gray-800 transition-colors"
          >
            ✕ Delete track
          </button>
        </div>
      )}

      {/* ── Step Editor (note + duration) ── */}
      {stepEditor && (
        <StepEditor
          currentNote={stepEditor.currentNote}
          currentDuration={stepEditor.currentDuration}
          onSelectNote={(note) => beatz.setStepNote(stepEditor.trackId, stepEditor.stepIndex, note)}
          onSelectDuration={(d) => beatz.setStepDuration(stepEditor.trackId, stepEditor.stepIndex, d)}
          onClose={() => setStepEditor(null)}
          anchorX={stepEditor.x}
          anchorY={stepEditor.y}
        />
      )}

      {/* ── Piano Roll ── */}
      {pianoRollTrackId && project && (() => {
        const prTrack = project.tracks.find(t => t.id === pianoRollTrackId);
        if (!prTrack || prTrack.type !== 'instrument') return null;
        return (
          <PianoRoll
            track={prTrack}
            bars={project.bars}
            stepsPerBar={project.stepsPerBar}
            isPlaying={isPlaying && !isPaused}
            currentStep={currentStep}
            onSetSteps={(steps) => beatz.setTrackSteps(prTrack.id, steps)}
            onClose={() => setPianoRollTrackId(null)}
          />
        );
      })()}

      {/* ── Hum Modal ── */}
      {showHumModal && project && (
        <HumModal
          bpm={project.bpm}
          bars={project.bars}
          onGenerate={(steps) => beatz.addTrackFromSteps('Lead', steps)}
          onClose={() => setShowHumModal(false)}
        />
      )}
    </div>
  );
}
