import { deriveAiApiRights } from '../rights';
import { SoundProvider, GeneratedSound } from './types';
import { blobToWav } from './audioUtils';

const LS_KEY = 'jb-elevenlabs-key';
const LS_PLAN = 'jb-elevenlabs-plan'; // 'commercial' | 'personal'
const TERMS_URL = 'https://elevenlabs.io/terms';
const MODEL = 'eleven_text_to_sound_v2';

function storedKey(): string {
  return (typeof localStorage !== 'undefined' && localStorage.getItem(LS_KEY)) || '';
}
function storedPlan(): string {
  return (typeof localStorage !== 'undefined' && localStorage.getItem(LS_PLAN)) || '';
}

/**
 * ElevenLabs Sound Effects API — true text-to-SFX. Browser-callable.
 * Activates once the user stores an API key. The usable license scope depends
 * on the plan flagged in settings (commercial plans → commercial scope).
 */
export const elevenLabsProvider: SoundProvider = {
  id: 'elevenlabs',
  label: 'ElevenLabs (audio)',
  description: 'Generates real sound effects from text. Requires an ElevenLabs API key.',
  kind: 'audio',
  supportsQuestions: false,
  isAvailable: () => !!storedKey(),
  allowedInMode: () => true,

  async generate(query: string): Promise<GeneratedSound[]> {
    const key = storedKey();
    if (!key) throw new Error('No ElevenLabs API key set.');

    const resp = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
      method: 'POST',
      headers: {
        'xi-api-key': key,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        text: query,
        model_id: MODEL,
        prompt_influence: 0.5,
      }),
    });

    if (!resp.ok) {
      let msg = `ElevenLabs error ${resp.status}`;
      try {
        const err = await resp.json();
        msg = (err as { detail?: { message?: string } | string }).detail
          ? typeof (err as any).detail === 'string'
            ? (err as any).detail
            : (err as any).detail.message ?? msg
          : msg;
      } catch { /* keep default */ }
      throw new Error(msg);
    }

    const raw = await resp.blob();
    const { wav, duration } = await blobToWav(raw);

    return [{
      name: query.slice(0, 40),
      tagline: 'ElevenLabs sound effect',
      duration,
      blob: wav,
      rights: deriveAiApiRights({
        provider: 'ElevenLabs',
        model: MODEL,
        prompt: query,
        plan: storedPlan(),
        termsUrl: TERMS_URL,
      }),
    }];
  },
};
