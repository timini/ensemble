import type { Provider } from '@/components/molecules/ApiKeyInput';
import type { Preset } from '@/components/organisms/EnsembleSidebar';
import type { StoreState } from '~/store';

export const PROVIDERS: Provider[] = ['openai', 'anthropic', 'google', 'xai'];

export const PRESETS: Preset[] = [
  {
    id: 'research-synthesis',
    name: 'Research Synthesis',
    description: 'Deep reasoning stack mixing GPT-4, Claude, and Gemini for comprehensive analysis.',
    modelIds: ['gpt-4o', 'claude-3-5-sonnet', 'gemini-1-5-pro'],
    summarizerId: 'claude-3-5-sonnet',
    summarizerName: 'Claude 3.5 Sonnet',
  },
  {
    id: 'rapid-drafting',
    name: 'Rapid Drafting',
    description: 'Fast, budget-friendly models tuned for quick ideation and iteration.',
    modelIds: ['gpt-4o-mini', 'claude-3-haiku', 'gemini-1-5-flash'],
    summarizerId: 'gpt-4o-mini',
    summarizerName: 'GPT-4o Mini',
  },
  {
    id: 'balanced-perspective',
    name: 'Balanced Perspective',
    description: 'Balanced trio for contrasting opinions and concise summaries.',
    modelIds: ['gpt-4o', 'claude-3-5-sonnet', 'gemini-1-5-pro'],
    summarizerId: 'gpt-4o',
    summarizerName: 'GPT-4o',
  },
];

export const EMPTY_API_KEYS: StoreState['apiKeys'] = {
  openai: null,
  anthropic: null,
  google: null,
  xai: null,
};

export const DEFAULT_ENSEMBLE_NAME = '';
