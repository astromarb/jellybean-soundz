import { audioBufferToWav } from '../wavEncoder';

/**
 * Decode an arbitrary audio blob (mp3, wav, …) and re-encode it to WAV so the
 * rest of the app (playback, export naming, manifests) deals in one format.
 * Returns the WAV blob plus the true duration in seconds.
 */
export async function blobToWav(blob: Blob): Promise<{ wav: Blob; duration: number }> {
  const arrayBuffer = await blob.arrayBuffer();
  const ctx = new AudioContext();
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    const wav = audioBufferToWav(audioBuffer);
    return { wav, duration: audioBuffer.duration };
  } finally {
    ctx.close().catch(() => {});
  }
}
