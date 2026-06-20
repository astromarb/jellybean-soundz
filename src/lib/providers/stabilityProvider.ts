import { deriveAiApiRights } from '../rights';
import { SoundProvider, GeneratedSound } from './types';
import { blobToWav } from './audioUtils';

const LS_KEY = 'jb-stability-key';
const LS_PLAN = 'jb-stability-plan'; // 'commercial' | 'personal'
const TERMS_URL = 'https://stability.ai/license';
const MODEL = 'stable-audio-2';

function storedKey(): string {
  return (typeof localStorage !== 'undefined' && localStorage.getItem(LS_KEY)) || '';
}
function storedPlan(): string {
  return (typeof localStorage !== 'undefined' && localStorage.getItem(LS_PLAN)) || '';
}

/**
 * Stability AI — Stable Audio 2 text-to-audio. Browser-callable via multipart
 * form. Activates once the user stores an API key. License scope follows the
 * plan flagged in settings.
 */
export const stabilityProvider: SoundProvider = {
  id: 'stability',
  label: 'Stability (audio)',
  description: 'Generates audio from text with Stable Audio. Requires a Stability API key.',
  kind: 'audio',
  supportsQuestions: false,
  isAvailable: () => !!storedKey(),
  allowedInMode: () => true,

  async generate(query: string): Promise<GeneratedSound[]> {
    const key = storedKey();
    if (!key) throw new Error('No Stability API key set.');

    const form = new FormData();
    form.append('prompt', query);
    form.append('output_format', 'mp3');
    form.append('duration', '6');

    const resp = await fetch('https://api.stability.ai/v2beta/audio/stable-audio-2/text-to-audio', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${key}`,
        accept: 'audio/*',
      },
      body: form,
    });

    if (!resp.ok) {
      let msg = `Stability error ${resp.status}`;
      try {
        const err = await resp.json();
        msg = (err as { errors?: string[]; message?: string }).errors?.[0]
          ?? (err as { message?: string }).message
          ?? msg;
      } catch { /* keep default */ }
      throw new Error(msg);
    }

    const raw = await resp.blob();
    const { wav, duration } = await blobToWav(raw);

    return [{
      name: query.slice(0, 40),
      tagline: 'Stable Audio generation',
      duration,
      blob: wav,
      rights: deriveAiApiRights({
        provider: 'Stability',
        model: MODEL,
        prompt: query,
        plan: storedPlan(),
        termsUrl: TERMS_URL,
      }),
    }];
  },
};
