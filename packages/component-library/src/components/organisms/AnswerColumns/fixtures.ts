import type { AnswerColumnItem } from './AnswerColumns';

/** Three finished answers to the Everest question, for stories and tests. */
export const sampleAnswers: AnswerColumnItem[] = [
  {
    id: 'openai/gpt-6.1',
    modelName: 'GPT-6.1 Sol',
    provider: 'openai',
    status: 'complete',
    durationMs: 3100,
    costUsd: 0.0021,
    content:
      'About 70 °C. Air pressure at the summit is roughly 34 kPa, a third of sea level pressure.\n\nWater boils when its vapour pressure matches the pressure around it. With less air pressing down, that happens at a lower temperature.',
  },
  {
    id: 'anthropic/claude-opus-5.5',
    modelName: 'Claude Opus 5.5',
    provider: 'anthropic',
    status: 'complete',
    durationMs: 4400,
    costUsd: 0.0063,
    content:
      'Roughly 68 to 71 °C, depending on the weather that day.\n\nBoiling starts when the vapour pressure of the water equals the surrounding air pressure. At 8,849 m the air pressure is about a third of what it is at sea level, so far less heat is needed.',
  },
  {
    id: 'google/gemini-4-carbon',
    modelName: 'Gemini 4 Carbon',
    provider: 'google',
    status: 'complete',
    durationMs: 2700,
    costUsd: 0.0018,
    content:
      'Around 71 °C.\n\nLower atmospheric pressure means water molecules escape into vapour more easily, so the boiling point drops by about 1 °C for every 300 m of altitude.',
  },
];
