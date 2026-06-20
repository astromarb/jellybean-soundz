import { keywordSearch } from '../soundAI';
import { deriveProceduralRights } from '../rights';
import { SoundProvider, GeneratedSound } from './types';

/**
 * Offline keyword/archetype matcher. No API key required, always available.
 * Returns built-in procedural presets — fully owned, commercial-safe.
 */
export const keywordProvider: SoundProvider = {
  id: 'keyword',
  label: 'Quick Search (offline)',
  description: 'Matches your words to built-in presets. No API key, works everywhere.',
  kind: 'preset',
  supportsQuestions: false,
  isAvailable: () => true,
  allowedInMode: () => true,

  async generate(query: string): Promise<GeneratedSound[]> {
    const results = keywordSearch(query);
    return results.map((s) => ({
      name: s.name,
      tagline: s.tagline,
      duration: s.duration,
      synthParams: s.synthParams,
      effects: s.effects,
      rights: deriveProceduralRights(query, 'Built-in preset'),
    }));
  },
};
