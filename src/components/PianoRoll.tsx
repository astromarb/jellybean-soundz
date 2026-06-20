import React, { useRef, useState, useEffect, useCallback } from 'react';
import * as Tone from 'tone';
import { BeatzTrack, BeatzStep, NoteDuration } from '../types';
import { createInstrumentSynth, triggerInstrument, INSTRUMENT_EMOJI } from '../lib/beatzEngine';

// ---------------------------------------------------------------------------
// Piano roll editor for an instrument track.
//   • Click an empty cell to place a note; drag right while holding to extend
//     its duration (snapped to 16n/8n/4n/2n/1n).
//   • Click an existing note to remove that pitch from the step.
//   • Steps can hold chords (multiple pitches at the same column).
// ---------------------------------------------------------------------------

const CELL_W = 18;
const CELL_H = 16;
const KEYS_W = 52;

const NOTE_ORDER = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const LOW_OCT = 1;
const HIGH_OCT = 6;

// Rows from highest pitch (top) to lowest (bottom)
const ROWS: string[] = [];
for (let oct = HIGH_OCT; oct >= LOW_OCT; oct--) {
  for (let i = NOTE_ORDER.length - 1; i >= 0; i--) {
    ROWS.push(`${NOTE_ORDER[i]}${oct}`);
  }
}
const ROW_INDEX = new Map(ROWS.map((n, i) => [n, i]));

const DUR_TO_STEPS: Record<NoteDuration, number> = {
  '32n': 1, '16n': 1, '8n': 2, '4n': 4, '2n': 8, '1n': 16,
};

function spanToDuration(span: number): NoteDuration {
  if (span <= 1) return '16n';
  if (span <= 2) return '8n';
  if (span <= 4) return '4n';
  if (span <= 8) return '2n';
  return '1n';
}

function stepPitches(step: BeatzStep): string[] {
  if (!step.active || !step.note) return [];
  return step.note.split(',').map(n => n.trim()).filter(Boolean);
}

interface Props {
  track: BeatzTrack;
  bars: number;
  stepsPerBar: number;
  isPlaying: boolean;
  currentStep: number;
  onSetSteps: (steps: BeatzStep[]) => void;
  onClose: () => void;
}

export default function PianoRoll({ track, bars, stepsPerBar, isPlaying, currentStep, onSetSteps, onClose }: Props) {
  const totalSteps = bars * stepsPerBar;
  const gridW = totalSteps * CELL_W;
  const gridH = ROWS.length * CELL_H;

  const scrollRef = useRef<HTMLDivElement>(null);
  const gridAreaRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ col: number; pitch: string; lastSpan: number } | null>(null);
  const previewSynthRef = useRef<ReturnType<typeof createInstrumentSynth> | null>(null);
  const [, forceRender] = useState(0);

  // Center the view on C4 when opened
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const c4Row = ROW_INDEX.get('C4') ?? ROWS.length / 2;
    el.scrollTop = c4Row * CELL_H - el.clientHeight / 2;
  }, []);

  // Audition preview synth (disposed on close)
  useEffect(() => {
    return () => {
      try { previewSynthRef.current?.dispose(); } catch (_) {}
    };
  }, []);

  const audition = useCallback((pitch: string) => {
    try {
      if (!previewSynthRef.current) {
        previewSynthRef.current = createInstrumentSynth(track.instrument!);
        previewSynthRef.current.toDestination();
      }
      triggerInstrument(previewSynthRef.current, track.instrument!, pitch, '16n', Tone.now(), 0.8);
    } catch (_) {}
  }, [track.instrument]);

  const cloneSteps = useCallback((): BeatzStep[] => track.steps.map(s => ({ ...s })), [track.steps]);

  const addPitch = useCallback((col: number, pitch: string) => {
    const steps = cloneSteps();
    const step = steps[col];
    if (!step) return;
    const pitches = stepPitches(step);
    if (!pitches.includes(pitch)) pitches.push(pitch);
    steps[col] = { ...step, active: true, note: pitches.join(',') };
    onSetSteps(steps);
  }, [cloneSteps, onSetSteps]);

  const removePitch = useCallback((col: number, pitch: string) => {
    const steps = cloneSteps();
    const step = steps[col];
    if (!step) return;
    const pitches = stepPitches(step).filter(p => p !== pitch);
    steps[col] = pitches.length > 0
      ? { ...step, note: pitches.join(',') }
      : { ...step, active: false, note: track.defaultNote, duration: undefined };
    onSetSteps(steps);
  }, [cloneSteps, onSetSteps, track.defaultNote]);

  const setDuration = useCallback((col: number, dur: NoteDuration) => {
    const steps = cloneSteps();
    const step = steps[col];
    if (!step?.active) return;
    steps[col] = { ...step, duration: dur };
    onSetSteps(steps);
  }, [cloneSteps, onSetSteps]);

  const posToCell = useCallback((e: React.MouseEvent | MouseEvent): { col: number; row: number } | null => {
    const area = gridAreaRef.current;
    if (!area) return null;
    const rect = area.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const col = Math.floor(x / CELL_W);
    const row = Math.floor(y / CELL_H);
    if (col < 0 || col >= totalSteps || row < 0 || row >= ROWS.length) return null;
    return { col, row };
  }, [totalSteps]);

  const handleGridMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const cell = posToCell(e);
    if (!cell) return;
    const pitch = ROWS[cell.row];
    const step = track.steps[cell.col];
    const pitches = step ? stepPitches(step) : [];

    if (pitches.includes(pitch)) {
      removePitch(cell.col, pitch);
    } else {
      addPitch(cell.col, pitch);
      audition(pitch);
      dragRef.current = { col: cell.col, pitch, lastSpan: 1 };
    }
  }, [posToCell, track.steps, addPitch, removePitch, audition]);

  // Drag right to extend duration
  useEffect(() => {
    function onMove(e: MouseEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const cell = posToCell(e);
      if (!cell) return;
      const span = Math.max(1, cell.col - drag.col + 1);
      if (span !== drag.lastSpan) {
        drag.lastSpan = span;
        setDuration(drag.col, spanToDuration(span));
        forceRender(n => n + 1);
      }
    }
    function onUp() { dragRef.current = null; }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [posToCell, setDuration]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Collect note bars to render
  const noteBars: { col: number; row: number; span: number; key: string }[] = [];
  track.steps.slice(0, totalSteps).forEach((step, col) => {
    if (!step.active) return;
    const dur = step.duration || track.stepDuration || '16n';
    const span = DUR_TO_STEPS[dur] ?? 1;
    stepPitches(step).forEach(pitch => {
      const row = ROW_INDEX.get(pitch);
      if (row === undefined) return;
      noteBars.push({ col, row, span, key: `${col}-${pitch}` });
    });
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950/95 backdrop-blur-sm">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 bg-gray-900 border-b border-gray-800">
        <span className="text-lg">{INSTRUMENT_EMOJI[track.instrument!]}</span>
        <div>
          <div className="text-sm font-bold text-white">{track.name} — Piano Roll</div>
          <div className="text-[10px] text-gray-500">
            Click to add a note · drag right to extend duration · click a note to remove it · chords supported
          </div>
        </div>
        <button
          onClick={onClose}
          className="ml-auto px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors"
        >
          ✕ Close
        </button>
      </div>

      {/* Roll */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        <div className="relative flex" style={{ width: KEYS_W + gridW, height: gridH }}>
          {/* Piano keys */}
          <div className="sticky left-0 z-20 shrink-0" style={{ width: KEYS_W }}>
            {ROWS.map(pitch => {
              const isBlack = pitch.includes('#');
              const isC = pitch.startsWith('C') && !isBlack;
              return (
                <div
                  key={pitch}
                  onMouseDown={() => audition(pitch)}
                  className={`flex items-center justify-end pr-1.5 text-[9px] font-mono border-b cursor-pointer select-none ${
                    isBlack
                      ? 'bg-gray-900 text-gray-600 border-gray-800'
                      : 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-white'
                  }`}
                  style={{ height: CELL_H }}
                >
                  {isC ? pitch : isBlack ? '' : pitch.replace(/\d/, '')}
                </div>
              );
            })}
          </div>

          {/* Grid */}
          <div
            ref={gridAreaRef}
            className="relative cursor-crosshair"
            style={{ width: gridW, height: gridH }}
            onMouseDown={handleGridMouseDown}
          >
            {/* Row backgrounds */}
            {ROWS.map((pitch, row) => (
              <div
                key={pitch}
                className="absolute left-0 right-0"
                style={{
                  top: row * CELL_H,
                  height: CELL_H,
                  backgroundColor: pitch.includes('#') ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.03)',
                  borderBottom: pitch.startsWith('C') && !pitch.includes('#')
                    ? '1px solid rgba(255,255,255,0.14)'
                    : '1px solid rgba(255,255,255,0.05)',
                }}
              />
            ))}

            {/* Beat / bar lines */}
            {Array.from({ length: totalSteps + 1 }, (_, i) => {
              const isBar = i % stepsPerBar === 0;
              const isBeat = i % 4 === 0;
              if (!isBeat) return null;
              return (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{
                    left: i * CELL_W,
                    width: 1,
                    backgroundColor: isBar ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                  }}
                />
              );
            })}

            {/* Bar numbers */}
            {Array.from({ length: bars }, (_, bar) => (
              <div
                key={bar}
                className="absolute top-0 text-[9px] text-gray-500 font-mono px-1 pointer-events-none"
                style={{ left: bar * stepsPerBar * CELL_W }}
              >
                {bar + 1}
              </div>
            ))}

            {/* Playhead */}
            {isPlaying && currentStep >= 0 && (
              <div
                className="absolute top-0 bottom-0 pointer-events-none z-10"
                style={{
                  left: currentStep * CELL_W,
                  width: CELL_W,
                  backgroundColor: 'rgba(255,255,255,0.14)',
                  borderLeft: '1px solid rgba(255,255,255,0.6)',
                }}
              />
            )}

            {/* Notes */}
            {noteBars.map(nb => (
              <div
                key={nb.key}
                className="absolute rounded-sm z-10"
                style={{
                  left: nb.col * CELL_W + 1,
                  top: nb.row * CELL_H + 1,
                  width: Math.min(nb.span, totalSteps - nb.col) * CELL_W - 2,
                  height: CELL_H - 2,
                  backgroundColor: track.color,
                  boxShadow: `0 0 6px ${track.color}99`,
                  border: '1px solid rgba(255,255,255,0.35)',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
