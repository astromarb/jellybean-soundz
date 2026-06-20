import { claudeAsk, claudeSearch } from '../soundAI';
import { deriveProceduralRights } from '../rights';
import { SoundProvider, GeneratedSound, GenerateOptions } from './types';

const LS_KEY = 'jb-anthropic-key';

function storedKey(): string {
  return (typeof localStorage !== 'undefined' && localStorage.getItem(LS_KEY)) || '';
}

/**
 * Claude generates Tone.js synth *parameters* (not audio). The resulting sound
 * is synthesized locally, so the user owns it outright — procedural rights,
 * commercial-safe in every mode.
 */
export const claudeProvider: SoundProvider = {
  id: 'claude',
  label: 'Claude AI (presets)',
  description: 'Designs synth presets from your description. You own the rendered audio.',
  kind: 'preset',
  supportsQuestions: true,
  isAvailable: () => !!storedKey(),
  allowedInMode: () => true,

  async ask(query: string): Promise<string[]> {
    const key = storedKey();
    if (!key) return [];
    return claudeAsk(query, key);
  },

  async generate(query: string, opts: GenerateOptions): Promise<GeneratedSound[]> {
    const key = storedKey();
    if (!key) throw new Error('No Claude API key set.');
    const suggestions = await claudeSearch(query, key, opts.answers);
    return suggestions.map((s) => ({
      name: s.name,
      tagline: s.tagline,
      duration: s.duration,
      synthParams: s.synthParams,
      effects: s.effects,
      rights: deriveProceduralRights(query, 'Claude (procedural)'),
    }));
  },
};
