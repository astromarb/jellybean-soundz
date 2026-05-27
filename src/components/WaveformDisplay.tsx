import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Sound } from '../types';
import * as db from '../lib/db';

interface WaveformDisplayProps {
  selectedSound: Sound | null;
}

export default function WaveformDisplay({ selectedSound }: WaveformDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#7700FF',
      progressColor: '#AA00FF',
      cursorColor: '#FF00CC',
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 80,
      normalize: true,
      interact: true,
    });

    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => setIsPlaying(false));

    wavesurferRef.current = ws;

    return () => {
      ws.destroy();
      wavesurferRef.current = null;
    };
  }, []);

  // Load audio blob when selected sound changes
  useEffect(() => {
    if (!selectedSound || !wavesurferRef.current) return;

    const loadAudio = async () => {
      setIsLoading(true);
      setIsPlaying(false);
      try {
        const blob = await db.getAudioBlob(selectedSound.id);
        if (blob && wavesurferRef.current) {
          const url = URL.createObjectURL(blob);
          await wavesurferRef.current.load(url);
          URL.revokeObjectURL(url);
        }
      } catch (err) {
        console.error('Error loading waveform:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadAudio();
  }, [selectedSound?.id]);

  // Update zoom
  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.zoom(zoom * 10);
    }
  }, [zoom]);

  const handlePlayPause = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.5, 10));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.5, 1));

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-gray-900 border-t border-gray-800 shrink-0 h-24">
      {/* Controls */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={handlePlayPause}
          disabled={!selectedSound || isLoading}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 hover:text-white transition-all border border-gray-700"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isLoading ? (
            <div className="w-3 h-3 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin" />
          ) : isPlaying ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Zoom controls */}
        <button
          onClick={handleZoomOut}
          disabled={!selectedSound}
          className="w-7 h-7 flex items-center justify-center rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-gray-400 hover:text-white transition-all text-xs"
          title="Zoom out"
        >
          −
        </button>
        <button
          onClick={handleZoomIn}
          disabled={!selectedSound}
          className="w-7 h-7 flex items-center justify-center rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-gray-400 hover:text-white transition-all text-xs"
          title="Zoom in"
        >
          +
        </button>
      </div>

      {/* Sound info */}
      {selectedSound && (
        <div className="shrink-0 flex flex-col justify-center">
          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: selectedSound.color, boxShadow: `0 0 6px ${selectedSound.color}` }}
            />
            <span className="text-xs font-semibold text-gray-200">{selectedSound.name}</span>
          </div>
          <span className="text-xs text-gray-600 font-mono">{selectedSound.synthParams.synthType}</span>
        </div>
      )}

      {/* Waveform */}
      <div className="flex-1 relative min-w-0">
        {!selectedSound && !isLoading ? (
          <div className="flex items-center justify-center h-20 text-gray-700 text-xs">
            No sound selected — click a sound in the library or play a pad
          </div>
        ) : (
          <div
            ref={containerRef}
            className="w-full"
            style={{ minHeight: 80 }}
          />
        )}
      </div>
    </div>
  );
}
