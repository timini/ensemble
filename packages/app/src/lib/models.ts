/**
 * Available AI Models Configuration
 *
 * Defines all available models across providers for the Ensemble page.
 * Models are grouped by provider with display names and IDs.
 */

import type { Model } from '@/components/organisms/ModelSelectionList';

export const AVAILABLE_MODELS: Model[] = [
  // XAI (Grok)
  {
    id: 'grok-1',
    provider: 'xai',
    name: 'Grok 1',
  },
  {
    id: 'grok-2',
    provider: 'xai',
    name: 'Grok 2',
  },

  // OpenAI (GPT)
  {
    id: 'gpt-4o',
    provider: 'openai',
    name: 'GPT-4o',
  },
  {
    id: 'gpt-4o-mini',
    provider: 'openai',
    name: 'GPT-4o Mini',
  },
  {
    id: 'o1-preview',
    provider: 'openai',
    name: 'o1 Preview',
  },
  {
    id: 'o1-mini',
    provider: 'openai',
    name: 'o1 Mini',
  },

  // Google (Gemini)
  {
    id: 'gemini-1.5-pro',
    provider: 'google',
    name: 'Gemini 1.5 Pro',
  },
  {
    id: 'gemini-1.5-flash',
    provider: 'google',
    name: 'Gemini 1.5 Flash',
  },

  // Anthropic (Claude)
  {
    id: 'claude-3.5-sonnet',
    provider: 'anthropic',
    name: 'Claude 3.5 Sonnet',
  },
  {
    id: 'claude-3-opus',
    provider: 'anthropic',
    name: 'Claude 3 Opus',
  },
  {
    id: 'claude-3-haiku',
    provider: 'anthropic',
    name: 'Claude 3 Haiku',
  },
];
