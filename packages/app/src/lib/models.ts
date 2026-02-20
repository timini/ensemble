/**
 * Fallback AI Models Configuration
 *
 * Static list of models used as fallback when dynamic loading from
 * provider APIs fails or is unavailable. Prefer dynamically loaded models.
 */

import type { Model } from '@/components/organisms/ModelSelectionList';

export const FALLBACK_MODELS: Model[] = [
  // XAI (Grok)
  {
    id: 'grok-1',
    provider: 'xai',
    name: 'Grok 1',
    modalities: ['text'],
  },
  {
    id: 'grok-2',
    provider: 'xai',
    name: 'Grok 2',
    modalities: ['text'],
  },

  // OpenAI (GPT)
  {
    id: 'gpt-4o',
    provider: 'openai',
    name: 'GPT-4o',
    modalities: ['text', 'image'],
  },
  {
    id: 'gpt-4o-mini',
    provider: 'openai',
    name: 'GPT-4o Mini',
    modalities: ['text', 'image'],
  },
  {
    id: 'o1-preview',
    provider: 'openai',
    name: 'o1 Preview',
    modalities: ['text'],
  },
  {
    id: 'o1-mini',
    provider: 'openai',
    name: 'o1 Mini',
    modalities: ['text'],
  },

  // Google (Gemini)
  {
    id: 'gemini-2.0-flash',
    provider: 'google',
    name: 'Gemini 2.0 Flash',
    modalities: ['text', 'image'],
  },
  {
    id: 'gemini-2.5-flash',
    provider: 'google',
    name: 'Gemini 2.5 Flash',
    modalities: ['text', 'image'],
  },
  {
    id: 'gemini-1.5-flash',
    provider: 'google',
    name: 'Gemini 1.5 Flash',
    modalities: ['text', 'image'],
  },

  // Anthropic (Claude)
  {
    id: 'claude-3-5-sonnet-20241022',
    provider: 'anthropic',
    name: 'Claude 3.5 Sonnet',
    modalities: ['text', 'image'],
  },
  {
    id: 'claude-3-5-haiku-20241022',
    provider: 'anthropic',
    name: 'Claude 3.5 Haiku',
    modalities: ['text', 'image'],
  },
  {
    id: 'claude-3-opus-20240229',
    provider: 'anthropic',
    name: 'Claude 3 Opus',
    modalities: ['text', 'image'],
  },

  // DeepSeek
  {
    id: 'deepseek-chat',
    provider: 'deepseek',
    name: 'DeepSeek Chat',
    modalities: ['text'],
  },
  {
    id: 'deepseek-reasoner',
    provider: 'deepseek',
    name: 'DeepSeek Reasoner',
    modalities: ['text'],
  },
];
