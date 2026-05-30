// Autocorrelation-based pitch detection
export function detectPitch(buffer: Float32Array, sampleRate: number): number {
  const SIZE = buffer.length;
  const MAX_SAMPLES = Math.floor(SIZE / 2);

  // RMS check — return -1 for silence
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1;

  // Autocorrelation
  let bestOffset = -1;
  let bestCorrelation = 0;
  let lastCorrelation = 1;
  let foundGoodCorrelation = false;

  for (let offset = 1; offset < MAX_SAMPLES; offset++) {
    let correlation = 0;
    for (let i = 0; i < MAX_SAMPLES; i++) {
      correlation += Math.abs(buffer[i] - buffer[i + offset]);
    }
    correlation = 1 - correlation / MAX_SAMPLES;
    if (correlation > 0.9 && correlation > lastCorrelation) {
      foundGoodCorrelation = true;
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestOffset = offset;
      }
    } else if (foundGoodCorrelation) {
      break;
    }
    lastCorrelation = correlation;
  }

  if (bestOffset === -1 || bestCorrelation < 0.01) return -1;
  return sampleRate / bestOffset;
}

export function freqToNoteName(freq: number): string {
  if (freq <= 0) return 'C4';
  const noteNum = Math.round(12 * Math.log2(freq / 440) + 69);
  const clamped = Math.max(0, Math.min(127, noteNum));
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(clamped / 12) - 1;
  const note = names[clamped % 12];
  return `${note}${Math.max(1, Math.min(7, octave))}`;
}

// Analyze an AudioBuffer and return a note for each 16th-note time slot
export function audioBufferToNoteSequence(
  audioBuffer: AudioBuffer,
  bpm: number,
  bars: number
): { note: string; active: boolean }[] {
  const sampleRate = audioBuffer.sampleRate;
  const stepDuration = (60 / bpm) / 4; // 16th note in seconds
  const totalSteps = bars * 16;
  const channelData = audioBuffer.getChannelData(0);
  const analysisWindowSize = 2048;

  const steps: { note: string; active: boolean }[] = [];

  for (let step = 0; step < totalSteps; step++) {
    const startSample = Math.floor(step * stepDuration * sampleRate);
    const centerSample = startSample + Math.floor(stepDuration * sampleRate / 2);
    const windowStart = Math.max(0, centerSample - analysisWindowSize / 2);
    const windowEnd = Math.min(channelData.length, windowStart + analysisWindowSize);

    const window = channelData.slice(windowStart, windowEnd);
    const padded = new Float32Array(analysisWindowSize);
    padded.set(window);

    const freq = detectPitch(padded, sampleRate);
    if (freq > 0) {
      steps.push({ note: freqToNoteName(freq), active: true });
    } else {
      steps.push({ note: 'C4', active: false });
    }
  }

  return steps;
}
