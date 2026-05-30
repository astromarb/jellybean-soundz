import React, { useState, useRef, useEffect } from 'react';
import { audioBufferToNoteSequence } from '../lib/pitchDetect';
import { JELLYBEAN_COLORS } from '../types';

interface HumModalProps {
  bpm: number;
  bars: number;
  onGenerate: (steps: { note: string; active: boolean }[]) => void;
  onClose: () => void;
}

const NOTE_COLORS: Record<string, string> = {
  C: '#FF3B5C', 'C#': '#FF7A00', D: '#FFB800', 'D#': '#FFE500',
  E: '#A8FF00', F: '#00FF7A', 'F#': '#00FFBF', G: '#00E5FF',
  'G#': '#0095FF', A: '#4400FF', 'A#': '#7700FF', B: '#FF00CC',
};

function noteColor(note: string): string {
  const name = note.replace(/\d/, '');
  return NOTE_COLORS[name] ?? '#888';
}

export default function HumModal({ bpm, bars, onGenerate, onClose }: HumModalProps) {
  const [selectedBars, setSelectedBars] = useState<number>(bars);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [steps, setSteps] = useState<{ note: string; active: boolean }[] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const maxDuration = (selectedBars * 4 * 60) / bpm; // bars * beats * seconds-per-beat

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // Auto-stop when max duration reached
  useEffect(() => {
    if (isRecording && elapsed >= Math.ceil(maxDuration)) {
      stopRecording();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, isRecording]);

  async function startRecording() {
    setError(null);
    setSteps(null);
    setRecordedBlob(null);
    if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(null); }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';
      const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };
      mr.start(100);
      mediaRecorderRef.current = mr;
      startTimeRef.current = Date.now();
      setElapsed(0);
      setIsRecording(true);
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 250);
    } catch {
      setError('Could not access microphone. Please allow microphone access.');
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
  }

  async function handleGenerate() {
    if (!recordedBlob) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const arrayBuffer = await recordedBlob.arrayBuffer();
      const ctx = new AudioContext();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      await ctx.close();
      const detected = audioBufferToNoteSequence(audioBuffer, bpm, selectedBars);
      setSteps(detected);
    } catch {
      setError('Failed to analyze audio. Try recording again.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleApply() {
    if (!steps) return;
    onGenerate(steps);
    onClose();
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  const maxSecs = Math.ceil(maxDuration);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">🎵 Hum a Melody</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none transition-colors">✕</button>
        </div>

        <p className="text-gray-400 text-sm">
          Record yourself humming, singing, or making sounds. We'll detect the pitches and build a sequence.
        </p>

        {/* Bars selector */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-semibold uppercase tracking-widest">Max duration</span>
          {[1, 2, 4].map(b => (
            <button
              key={b}
              onClick={() => setSelectedBars(b)}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                selectedBars === b
                  ? 'bg-violet-600 border-violet-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {b} bar{b > 1 ? 's' : ''}
            </button>
          ))}
        </div>

        {/* Record controls */}
        <div className="flex flex-col items-center gap-3">
          {!isRecording && !recordedBlob && (
            <button
              onClick={startRecording}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white text-2xl flex items-center justify-center shadow-lg shadow-red-900/40 transition-all active:scale-95"
            >
              ⏺
            </button>
          )}
          {isRecording && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-red-400 font-mono text-xl animate-pulse">{formatTime(elapsed)}</span>
                <span className="text-gray-500 font-mono text-sm">/ {formatTime(maxSecs)}</span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-gray-800 rounded-full h-1.5">
                <div
                  className="bg-red-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (elapsed / maxSecs) * 100)}%` }}
                />
              </div>
              <button
                onClick={stopRecording}
                className="w-16 h-16 rounded-full bg-gray-700 hover:bg-gray-600 text-white text-2xl flex items-center justify-center shadow-lg transition-all active:scale-95"
              >
                ⏹
              </button>
            </>
          )}
          {!isRecording && recordedBlob && (
            <div className="text-gray-400 text-sm font-mono">Recorded: {formatTime(elapsed)}</div>
          )}
        </div>

        {/* Playback */}
        {audioUrl && !isRecording && (
          <audio src={audioUrl} controls className="w-full h-8 accent-violet-500" />
        )}

        {/* Note visualization */}
        {steps && (
          <div className="space-y-1">
            <div className="text-xs text-gray-400 font-semibold uppercase tracking-widest">Detected Notes</div>
            <div className="flex gap-0.5 flex-wrap">
              {steps.map((s, i) => (
                <div
                  key={i}
                  className="w-5 h-5 rounded-sm flex items-center justify-center"
                  style={{
                    backgroundColor: s.active ? noteColor(s.note) : '#1f2937',
                    opacity: s.active ? 1 : 0.4,
                  }}
                  title={s.active ? s.note : 'silence'}
                >
                  {s.active && (
                    <span className="text-[6px] font-bold text-white/80 leading-none">
                      {s.note.replace(/\d/, '')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <div className="text-red-400 text-sm">{error}</div>}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
          >
            Cancel
          </button>
          {recordedBlob && !steps && (
            <button
              onClick={handleGenerate}
              disabled={isAnalyzing}
              className="flex-1 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50"
            >
              {isAnalyzing ? 'Analyzing...' : 'Generate Sequence'}
            </button>
          )}
          {steps && (
            <button
              onClick={handleApply}
              className="flex-1 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors"
            >
              Add to JELLYBEATZ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
