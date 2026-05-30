import React, { useState, useRef, useEffect } from 'react';
import { Sound, JELLYBEAN_COLORS } from '../types';

interface RecordModalProps {
  onImport: (files: File[]) => Promise<Sound[]>;
  onClose: () => void;
}

export default function RecordModal({ onImport, onClose }: RecordModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [soundName, setSoundName] = useState('My Recording');
  const [selectedColor, setSelectedColor] = useState(JELLYBEAN_COLORS[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  async function startRecording() {
    setError(null);
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
    } catch (err) {
      setError('Could not access microphone. Please allow microphone access and try again.');
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }

  async function handleSave() {
    if (!recordedBlob || isSaving) return;
    setIsSaving(true);
    try {
      const ext = recordedBlob.type.includes('ogg') ? 'ogg' : 'webm';
      const fileName = `${soundName.trim() || 'recording'}.${ext}`;
      const file = new File([recordedBlob], fileName, { type: recordedBlob.type });
      await onImport([file]);
      onClose();
    } catch (err) {
      setError('Failed to save recording.');
    } finally {
      setIsSaving(false);
    }
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Record a Sound</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none transition-colors">✕</button>
        </div>

        {/* Record / Stop */}
        <div className="flex flex-col items-center gap-3">
          {!isRecording && !recordedBlob && (
            <button
              onClick={startRecording}
              className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-500 text-white text-3xl flex items-center justify-center shadow-lg shadow-red-900/40 transition-all active:scale-95"
            >
              ⏺
            </button>
          )}
          {isRecording && (
            <>
              <div className="text-red-400 font-mono text-2xl animate-pulse">{formatTime(elapsed)}</div>
              <button
                onClick={stopRecording}
                className="w-20 h-20 rounded-full bg-gray-700 hover:bg-gray-600 text-white text-3xl flex items-center justify-center shadow-lg transition-all active:scale-95"
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
          <audio
            src={audioUrl}
            controls
            className="w-full h-8 accent-violet-500"
          />
        )}

        {/* Name */}
        <div className="space-y-1">
          <label className="text-xs text-gray-400 font-semibold uppercase tracking-widest">Sound Name</label>
          <input
            type="text"
            value={soundName}
            onChange={e => setSoundName(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
          />
        </div>

        {/* Color picker */}
        <div className="space-y-1">
          <label className="text-xs text-gray-400 font-semibold uppercase tracking-widest">Color</label>
          <div className="flex flex-wrap gap-2">
            {JELLYBEAN_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setSelectedColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-all ${selectedColor === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                style={{ backgroundColor: c, boxShadow: selectedColor === c ? `0 0 8px ${c}` : undefined }}
              />
            ))}
          </div>
        </div>

        {error && <div className="text-red-400 text-sm">{error}</div>}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!recordedBlob || isSaving}
            className="flex-1 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save to Library'}
          </button>
        </div>
      </div>
    </div>
  );
}
