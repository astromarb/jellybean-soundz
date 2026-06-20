import { SynthParams, EffectsParams, SoundRights, AppMode } from '../../types';

/**
 * A single generation result. Preset providers (Claude, keyword) return synth
 * params + effects; audio providers (ElevenLabs, Stability) return a ready-made
 * audio blob. Either way it carries the rights it was generated under.
 */
export interface GeneratedSound {
  name: string;
  tagline?: string;
  duration: number;
  synthParams?: SynthParams; // preset providers
  effects?: EffectsParams;   // preset providers
  blob?: Blob;               // audio providers
  rights: SoundRights;
}

export type ProviderKind = 'preset' | 'audio';

export interface GenerateOptions {
  mode: AppMode;
  answers?: Record<string, string>;
}

/**
 * Pluggable sound-generation provider. Implementations live alongside this file.
 * A backend-backed provider (e.g. AudioGen / CLAP retrieval for Research mode)
 * would implement the same interface — see README.md in this directory.
 */
export interface SoundProvider {
  id: string;
  label: string;
  description: string;
  kind: ProviderKind;
  /** True when the provider has whatever config/key it needs to run. */
  isAvailable(): boolean;
  /** Whether the provider is offered in the given workspace mode. */
  allowedInMode(mode: AppMode): boolean;
  /** Whether the provider supports a clarifying-questions step before generating. */
  supportsQuestions: boolean;
  ask?(query: string, ctx?: Record<string, string>): Promise<string[]>;
  generate(query: string, opts: GenerateOptions): Promise<GeneratedSound[]>;
}
