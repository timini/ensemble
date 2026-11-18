import type { ExampleRunProps } from './ExampleRun';

/** Shortened from the run recorded for the landing page (see the app's example-run.json). */
export const exampleRunArgs: ExampleRunProps = {
  prompt:
    'At what temperature does water boil at the summit of Mount Everest, and why is it lower than at sea level?',
  answers: [
    {
      id: 'llama',
      name: 'Llama 3.3 70B',
      provider: 'openai-compatible',
      modelId: 'openrouter/meta-llama/llama-3.3-70b-instruct',
      text: 'At the summit of Mount Everest, water boils at approximately 73.5°C, lower than the 100°C boiling point at sea level, because the air pressure is lower.',
      seconds: 1.4,
    },
    {
      id: 'mistral',
      name: 'Mistral Small 3.2',
      provider: 'openai-compatible',
      modelId: 'openrouter/mistralai/mistral-small-3.2-24b-instruct',
      text: 'Water boils at approximately 70°C at the summit. Air pressure there is about a third of sea-level pressure, so less energy is needed for molecules to escape as vapour.',
      seconds: 13.4,
    },
    {
      id: 'gemini',
      name: 'Gemini 2.5 Flash Lite',
      provider: 'openai-compatible',
      modelId: 'openrouter/google/gemini-2.5-flash-lite',
      text: 'Water boils at approximately **70°C** on the summit. Boiling occurs when vapour pressure equals the surrounding pressure, which is much lower at altitude.',
      seconds: 0.8,
    },
  ],
  consensus:
    'Water boils at about 70 to 73.5°C on the summit of Everest. Air pressure there is about a third of sea-level pressure, and water boils when its vapour pressure equals the pressure around it.',
  score: 0.97,
  level: 'high',
  calls: 7,
  cost: '$0.0003',
  recordedOn: '17 November 2026',
  via: 'OpenRouter',
  embeddingModel: 'openai/text-embedding-3-small',
  summarizer: 'Gemini 2.5 Flash Lite',
};
