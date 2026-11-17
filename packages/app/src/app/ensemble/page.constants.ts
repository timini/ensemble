import type { Provider } from '@/components/molecules/ApiKeyInput';
import type { Preset } from '@/components/organisms/EnsembleSidebar';
import type { StoreState } from '~/store';

export const PROVIDERS: Provider[] = ['openai', 'anthropic', 'google', 'xai', 'deepseek', 'perplexity'];

/**
 * Curated ensembles. Not shown in the app today: the sidebar lists the
 * user's saved ensembles. Kept for the M4 presets sidebar.
 */
export const PRESETS: Preset[] = [
  {
    id: 'research-synthesis',
    name: 'Research Synthesis',
    description: 'Flagship models from Anthropic, OpenAI and Google for in-depth analysis.',
    modelIds: ['claude-opus-5-5', 'gpt-6-astra', 'gemini-4-carbon'],
    summarizerId: 'claude-opus-5-5',
    summarizerName: 'Claude Opus 5.5',
  },
  {
    id: 'rapid-drafting',
    name: 'Rapid Drafting',
    description: 'Fast, low-cost models for quick ideation and iteration.',
    modelIds: ['gpt-6-luna', 'claude-haiku-5-5', 'gemini-3.5-flash-lite', 'deepseek-flash'],
    summarizerId: 'gpt-6-luna',
    summarizerName: 'GPT-6 Luna',
  },
  {
    id: 'balanced-perspective',
    name: 'Balanced Perspective',
    description: 'Mid-priced models from four providers for contrasting opinions and concise summaries.',
    modelIds: ['claude-sonnet-5-5', 'gemini-4-hydrogen', 'grok-4.7', 'deepseek-v4-pro'],
    summarizerId: 'claude-sonnet-5-5',
    summarizerName: 'Claude Sonnet 5.5',
  },
];

export const EMPTY_API_KEYS: StoreState['apiKeys'] = {
  openai: null,
  anthropic: null,
  google: null,
  xai: null,
  deepseek: null,
  perplexity: null,
};

