import { AppMode } from '../../types';
import { SoundProvider } from './types';
import { claudeProvider } from './claudeProvider';
import { keywordProvider } from './keywordProvider';
import { elevenLabsProvider } from './elevenLabsProvider';
import { stabilityProvider } from './stabilityProvider';

export * from './types';

// Registry of all known providers, in display order.
export const ALL_PROVIDERS: SoundProvider[] = [
  claudeProvider,
  elevenLabsProvider,
  stabilityProvider,
  keywordProvider,
];

/** Providers allowed in the given mode (regardless of whether a key is set). */
export function getProvidersForMode(mode: AppMode): SoundProvider[] {
  return ALL_PROVIDERS.filter((p) => p.allowedInMode(mode));
}

/** Providers that are both allowed in the mode and currently configured/usable. */
export function getAvailableProviders(mode: AppMode): SoundProvider[] {
  return getProvidersForMode(mode).filter((p) => p.isAvailable());
}

export function getProviderById(id: string): SoundProvider | undefined {
  return ALL_PROVIDERS.find((p) => p.id === id);
}
