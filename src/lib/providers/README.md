# Sound generation providers

Every way the app can create a sound implements the `SoundProvider` interface
(`types.ts`). The app is a static front-end, so each provider here is either
**procedural** (synth params rendered locally) or a **browser-callable hosted
API** (returns an audio blob). None require a backend.

| Provider | Kind | Key (localStorage) | Notes |
|----------|------|--------------------|-------|
| `claudeProvider` | preset | `jb-anthropic-key` | Live. Designs Tone.js synth params; user owns the rendered audio. |
| `keywordProvider` | preset | — | Always available. Offline archetype matcher. |
| `elevenLabsProvider` | audio | `jb-elevenlabs-key` (+ `jb-elevenlabs-plan`) | Text-to-SFX. Activates when a key is set. |
| `stabilityProvider` | audio | `jb-stability-key` (+ `jb-stability-plan`) | Stable Audio 2 text-to-audio. Activates when a key is set. |

## Rights

Providers attach `SoundRights` (see `../rights.ts`) to every result:
- Procedural providers → fully owned, `commercial_org`.
- Audio APIs → scope follows the configured plan (`commercial` → commercial,
  otherwise `personal`/`unknown` so commercial exports get flagged).

## Adding a backend provider (Research mode)

Open/local models — AudioGen, AudioLDM, Stable Audio Open, CLAP retrieval —
need a GPU backend and are **not built**. To add one later, stand up an HTTP
service and implement `SoundProvider`:

```ts
export const audioGenProvider: SoundProvider = {
  id: 'audiogen', label: 'AudioGen (local)', kind: 'audio',
  supportsQuestions: false,
  isAvailable: () => !!localStorage.getItem('jb-backend-url'),
  allowedInMode: (mode) => mode === 'research',
  async generate(query) {
    const base = localStorage.getItem('jb-backend-url');
    const resp = await fetch(`${base}/generate`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: query }),
    });
    const { wav, duration } = await blobToWav(await resp.blob());
    return [{ name: query.slice(0, 40), duration, blob: wav,
      rights: deriveAiApiRights({ provider: 'AudioGen', prompt: query, plan: 'research' }) }];
  },
};
```

Then register it in `index.ts`. The UI (provider picker, rights badges, export
guards) needs no changes — it is driven entirely by this interface.
