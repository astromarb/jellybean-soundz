import React, { useState, useCallback, useEffect } from 'react';
import * as Tone from 'tone';
import { Sound, SynthParams, EffectsParams, DEFAULT_SYNTH_PARAMS, DEFAULT_EFFECTS } from './types';
import { useSounds } from './hooks/useSounds';
import { usePages } from './hooks/usePages';
import { playAudioBlob, playDirect, renderSoundToWav } from './lib/audio';
import * as db from './lib/db';

import Header from './components/Header';
import SoundLibrary from './components/SoundLibrary';
import PadGrid from './components/PadGrid';
import Editor from './components/Editor';
import WaveformDisplay from './components/WaveformDisplay';
import MagazinePageNav from './components/MagazinePageNav';
import ChainerTab from './components/ChainerTab';
import JellyBeatz from './components/JellyBeatz';
import RecordModal from './components/RecordModal';

type MacroTab = 'soundboard' | 'chainer' | 'beatz';

export default function App() {
  const {
    sounds,
    loading: soundsLoading,
    addSound,
    updateSound,
    deleteSound,
    downloadSound,
    exportAllSounds,
    importSounds,
  } = useSounds();

  const {
    magazines,
    pagesInActiveMagazine,
    activeMagazineId,
    activePageId,
    currentPads,
    loading: pagesLoading,
    selectMagazine,
    setActivePageId,
    addMagazine,
    renameMagazine,
    deleteMagazine,
    addPage,
    renamePage,
    deletePage,
    assignSound,
    clearPad,
    renamePad,
  } = usePages();

  const [macroTab, setMacroTab] = useState<MacroTab>('soundboard');

  // Selected sound = the one shown in waveform / whose params are in the editor
  const [selectedSound, setSelectedSound] = useState<Sound | null>(null);
  // editingSound = the library sound currently loaded for editing (null = creating new)
  const [editingSound, setEditingSound] = useState<Sound | null>(null);

  const [synthParams, setSynthParams] = useState<SynthParams>(DEFAULT_SYNTH_PARAMS);
  const [effects, setEffects] = useState<EffectsParams>(DEFAULT_EFFECTS);
  const [soundName, setSoundName] = useState('New Sound');
  const [isSaving, setIsSaving] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioPrompt, setAudioPrompt] = useState(true);
  const [showRecord, setShowRecord] = useState(false);

  const loading = soundsLoading || pagesLoading;

  // Preload sounds once audio is enabled
  useEffect(() => {
    if (!audioEnabled || sounds.length === 0) return;
    sounds.forEach(sound => {
      db.getAudioBlob(sound.id).then(existing => {
        if (!existing) {
          renderSoundToWav(sound.synthParams, sound.effects, sound.duration)
            .then(blob => db.saveAudioBlob(sound.id, blob))
            .catch(() => {});
        }
      });
    });
  }, [audioEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const enableAudio = useCallback(async () => {
    try {
      await Tone.start();
      setAudioEnabled(true);
      setAudioPrompt(false);
    } catch (err) {
      console.error('Could not start audio context:', err);
    }
  }, []);

  // Load a sound's params into the editor for editing
  const handleSelectSound = useCallback((sound: Sound) => {
    setSelectedSound(sound);
    setEditingSound(sound);
    setSynthParams(sound.synthParams);
    setEffects(sound.effects);
    setSoundName(sound.name);
  }, []);

  const handlePlaySound = useCallback(
    async (sound: Sound) => {
      if (!audioEnabled) await enableAudio();
      setSelectedSound(sound);
      try {
        const blob = await db.getAudioBlob(sound.id);
        if (blob) {
          await playAudioBlob(blob);
        } else {
          // Play immediately via real-time synthesis — no Tone.Offline required
          await playDirect(sound.synthParams, sound.effects, sound.duration);
          // Render and cache in background so the next play uses the blob
          renderSoundToWav(sound.synthParams, sound.effects, sound.duration)
            .then(b => db.saveAudioBlob(sound.id, b))
            .catch(() => {});
        }
      } catch (err) {
        console.error('Error playing sound:', err);
      }
    },
    [audioEnabled, enableAudio]
  );

  const handleDeleteSound = useCallback(
    async (sound: Sound) => {
      await deleteSound(sound.id);
      if (selectedSound?.id === sound.id) setSelectedSound(null);
      if (editingSound?.id === sound.id) {
        setEditingSound(null);
        setSynthParams(DEFAULT_SYNTH_PARAMS);
        setEffects(DEFAULT_EFFECTS);
        setSoundName('New Sound');
      }
    },
    [deleteSound, selectedSound, editingSound]
  );

  const handleNewSound = useCallback(() => {
    setSelectedSound(null);
    setEditingSound(null);
    setSynthParams(DEFAULT_SYNTH_PARAMS);
    setEffects(DEFAULT_EFFECTS);
    setSoundName('New Sound');
  }, []);

  // Save a brand-new sound to the library
  const handleSave = useCallback(async () => {
    if (!soundName.trim() || isSaving) return;
    if (!audioEnabled) await enableAudio();
    setIsSaving(true);
    try {
      const saved = await addSound(soundName.trim(), synthParams, effects, 2);
      setSelectedSound(saved);
      setEditingSound(saved);
    } catch (err) {
      console.error('Error saving sound:', err);
      alert('Failed to save sound. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [soundName, isSaving, audioEnabled, enableAudio, addSound, synthParams, effects]);

  // Overwrite an existing sound in the library
  const handleUpdate = useCallback(async () => {
    if (!editingSound || isSaving) return;
    if (!audioEnabled) await enableAudio();
    setIsSaving(true);
    try {
      const name = soundName.trim() || editingSound.name;
      await updateSound(editingSound.id, { name, synthParams, effects }, true);
      // Keep local state in sync
      const refreshed: Sound = { ...editingSound, name, synthParams, effects };
      setEditingSound(refreshed);
      setSelectedSound(refreshed);
    } catch (err) {
      console.error('Error updating sound:', err);
      alert('Failed to update sound. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [editingSound, isSaving, audioEnabled, enableAudio, updateSound, soundName, synthParams, effects]);

  const handleReset = useCallback(() => {
    setEditingSound(null);
    setSelectedSound(null);
    setSynthParams(DEFAULT_SYNTH_PARAMS);
    setEffects(DEFAULT_EFFECTS);
    setSoundName('New Sound');
  }, []);

  if (loading) {
    return (
      <div className="h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="text-4xl">🍬</div>
          <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <div className="text-gray-400 text-sm font-mono">Loading jellybean soundz...</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-screen flex flex-col bg-gray-950 overflow-hidden"
      onClick={audioEnabled ? undefined : enableAudio}
    >
      {/* Audio enable overlay */}
      {audioPrompt && !audioEnabled && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/90 backdrop-blur-sm cursor-pointer"
          onClick={enableAudio}
        >
          <div className="text-center space-y-4 p-8">
            <div className="text-6xl">🍬</div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
              jellybean soundz
            </h1>
            <p className="text-gray-400 text-sm">Click anywhere to enable audio</p>
            <div className="flex justify-center gap-2 mt-4">
              {['#FF3B5C', '#FF7A00', '#FFB800', '#00FF7A', '#0095FF', '#7700FF', '#FF00CC'].map((c) => (
                <div
                  key={c}
                  className="w-4 h-4 rounded-full animate-bounce"
                  style={{ backgroundColor: c, boxShadow: `0 0 10px ${c}`, animationDelay: `${Math.random() * 0.5}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <Header onExportAll={exportAllSounds} />

      {/* Macro tab switcher */}
      <div className="flex border-b border-gray-800 bg-gray-900 shrink-0">
        {(
          [
            { id: 'soundboard', label: '🎛  Soundboard' },
            { id: 'chainer', label: '🔗  Sound Chainer' },
            { id: 'beatz', label: '🎵 JELLYBEATZ' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setMacroTab(t.id)}
            className={`px-5 py-2.5 text-sm font-medium transition-all border-b-2 ${
              macroTab === t.id
                ? 'text-white border-violet-500'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Soundboard tab ── */}
      {macroTab === 'soundboard' && (
        <>
          <MagazinePageNav
            magazines={magazines}
            pagesInActiveMagazine={pagesInActiveMagazine}
            activeMagazineId={activeMagazineId}
            activePageId={activePageId}
            onSelectMagazine={selectMagazine}
            onSelectPage={setActivePageId}
            onAddMagazine={addMagazine}
            onRenameMagazine={renameMagazine}
            onDeleteMagazine={deleteMagazine}
            onAddPage={(magId, name) => addPage(magId, name)}
            onRenamePage={renamePage}
            onDeletePage={deletePage}
          />

          <div className="flex flex-1 overflow-hidden">
            {/* Left: Sound Library */}
            <div className="w-48 shrink-0">
              <SoundLibrary
                sounds={sounds}
                selectedSound={selectedSound}
                onSelectSound={handleSelectSound}
                onPlaySound={handlePlaySound}
                onDeleteSound={handleDeleteSound}
                onDownloadSound={downloadSound}
                onNewSound={handleNewSound}
                onImportSounds={importSounds}
                onRecord={() => setShowRecord(true)}
              />
            </div>

            {/* Center: Pad Grid */}
            <div className="flex-1 min-w-0">
              <PadGrid
                pads={currentPads}
                sounds={sounds}
                onAssignSound={assignSound}
                onClearPad={clearPad}
                onRenamePad={renamePad}
                onSelectSound={handleSelectSound}
              />
            </div>

            {/* Right: Editor */}
            <div className="w-64 shrink-0">
              <Editor
                synthParams={synthParams}
                effects={effects}
                soundName={soundName}
                isSaving={isSaving}
                editingSound={editingSound}
                onSynthParamsChange={setSynthParams}
                onEffectsChange={setEffects}
                onSoundNameChange={setSoundName}
                onSave={handleSave}
                onUpdate={handleUpdate}
                onReset={handleReset}
              />
            </div>
          </div>

          <WaveformDisplay selectedSound={selectedSound} />
        </>
      )}

      {/* ── Sound Chainer tab ── */}
      {macroTab === 'chainer' && (
        <ChainerTab
          sounds={sounds}
          audioEnabled={audioEnabled}
          enableAudio={enableAudio}
        />
      )}

      {/* ── JELLYBEATZ tab ── */}
      {macroTab === 'beatz' && (
        <JellyBeatz sounds={sounds} audioEnabled={audioEnabled} enableAudio={enableAudio} />
      )}

      {/* ── Record Modal ── */}
      {showRecord && (
        <RecordModal
          onImport={importSounds}
          onClose={() => setShowRecord(false)}
        />
      )}
    </div>
  );
}
