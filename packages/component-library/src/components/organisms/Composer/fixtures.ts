import type { ModelPickerOption } from '../../molecules/ModelPicker';
import type { ComposerModel } from './Composer';

/** Models offered in stories and tests. */
export const modelOptions: ModelPickerOption[] = [
  { id: 'openai/gpt-6.1', name: 'GPT-6.1 Sol', provider: 'openai', group: 'OpenAI', price: '$1.25' },
  { id: 'anthropic/claude-opus-5.5', name: 'Claude Opus 5.5', provider: 'anthropic', group: 'Anthropic', price: '$5.00' },
  { id: 'google/gemini-4-carbon', name: 'Gemini 4 Carbon', provider: 'google', group: 'Google', price: '$1.00' },
  { id: 'ollama/qwen3:14b', name: 'qwen3:14b', provider: 'openai-compatible', group: 'Ollama (local)', price: 'Free' },
];

/** Three cloud models. */
export const threeModels: ComposerModel[] = modelOptions.slice(0, 3).map(({ id, name, provider }) => ({ id, name, provider }));

export const samplePrompt = 'At what temperature does water boil at the summit of Everest, and why is it lower than at sea level?';
