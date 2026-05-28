import * as Tone from 'tone';
import { ChainItem, Sound } from '../types';
import { getAudioBlob } from './db';
import { audioBufferToWav } from './wavEncoder';

export function getChainDuration(items: ChainItem[], sounds: Sound[]): number {
  return items.reduce((total, item) => {
    const sound = sounds.find((s) => s.id === item.soundId);
    return total + item.gapBefore + (sound?.duration ?? 0);
  }, 0);
}

export async function playChain(
  items: ChainItem[],
  sounds: Sound[],
  onItemStart?: (index: number) => void
): Promise<() => void> {
  await Tone.start();
  const ctx = Tone.context.rawContext as AudioContext;

  const sources: AudioBufferSourceNode[] = [];
  let offset = ctx.currentTime + 0.08;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const sound = sounds.find((s) => s.id === item.soundId);
    if (!sound) continue;

    const blob = await getAudioBlob(item.soundId);
    if (!blob) continue;

    offset += item.gapBefore;

    // Decode in the live context so the buffer is compatible
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.start(offset);
    sources.push(source);

    if (onItemStart) {
      const delayMs = Math.max(0, (offset - ctx.currentTime) * 1000);
      const capturedI = i;
      setTimeout(() => onItemStart(capturedI), delayMs);
    }

    offset += audioBuffer.duration;
  }

  return () => {
    sources.forEach((s) => {
      try { s.stop(0); } catch (_) {}
    });
  };
}

export async function exportChainAsWav(
  items: ChainItem[],
  sounds: Sound[]
): Promise<Blob> {
  const validItems = items.filter((item) => sounds.some((s) => s.id === item.soundId));
  if (validItems.length === 0) throw new Error('No valid sounds in chain');

  // Use stored durations to size the offline context, with a 1-second tail buffer
  const estimatedDuration = validItems.reduce((acc, item) => {
    const sound = sounds.find((s) => s.id === item.soundId)!;
    return acc + item.gapBefore + sound.duration;
  }, 0.1);

  const sampleRate = 44100;
  const offlineCtx = new OfflineAudioContext(
    2,
    Math.ceil(estimatedDuration * sampleRate) + sampleRate,
    sampleRate
  );

  let offset = 0;
  for (const item of validItems) {
    offset += item.gapBefore;

    const blob = await getAudioBlob(item.soundId);
    if (!blob) {
      offset += sounds.find((s) => s.id === item.soundId)!.duration;
      continue;
    }

    const arrayBuffer = await blob.arrayBuffer();
    const buffer = await offlineCtx.decodeAudioData(arrayBuffer);
    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(offlineCtx.destination);
    source.start(offset);
    offset += buffer.duration;
  }

  const rendered = await offlineCtx.startRendering();
  return audioBufferToWav(rendered);
}
