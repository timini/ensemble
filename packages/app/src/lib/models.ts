/**
 * Fallback AI Models Configuration
 *
 * Static list of models used as fallback when dynamic loading from
 * provider APIs fails or is unavailable. Prefer dynamically loaded models.
 *
 * Each provider lists a flagship model and a fast or cheap model. Ids were
 * checked against each provider's model documentation in November 2026.
 */

import type { Model } from '@/components/organisms/ModelSelectionList';

export const FALLBACK_MODELS: Model[] = [
  // XAI (Grok)
  {
    id: 'grok-4.7',
    provider: 'xai',
    name: 'Grok 4.7',
    modalities: ['text'],
  },
  {
    id: 'grok-4.3',
    provider: 'xai',
    name: 'Grok 4.3',
    modalities: ['text'],
  },

  // OpenAI (GPT)
  {
    id: 'gpt-6-astra',
    provider: 'openai',
    name: 'GPT-6 Astra',
    modalities: ['text', 'image'],
  },
  {
    id: 'gpt-6-luna',
    provider: 'openai',
    name: 'GPT-6 Luna',
    modalities: ['text', 'image'],
  },

  // Google (Gemini)
  {
    id: 'gemini-4-carbon',
    provider: 'google',
    name: 'Gemini 4 Carbon',
    modalities: ['text', 'image', 'audio', 'video'],
  },
  {
    id: 'gemini-4-hydrogen',
    provider: 'google',
    name: 'Gemini 4 Hydrogen',
    modalities: ['text', 'image', 'audio', 'video'],
  },
  {
    id: 'gemini-3.5-flash-lite',
    provider: 'google',
    name: 'Gemini 3.5 Flash-Lite',
    modalities: ['text', 'image'],
  },

  // Anthropic (Claude)
  {
    id: 'claude-opus-5-5',
    provider: 'anthropic',
    name: 'Claude Opus 5.5',
    modalities: ['text', 'image'],
  },
  {
    id: 'claude-sonnet-5-5',
    provider: 'anthropic',
    name: 'Claude Sonnet 5.5',
    modalities: ['text', 'image'],
  },
  {
    id: 'claude-haiku-5-5',
    provider: 'anthropic',
    name: 'Claude Haiku 5.5',
    modalities: ['text', 'image'],
  },

  // DeepSeek
  {
    id: 'deepseek-v4-pro',
    provider: 'deepseek',
    name: 'DeepSeek V4 Pro',
    modalities: ['text'],
  },
  {
    id: 'deepseek-flash',
    provider: 'deepseek',
    name: 'DeepSeek Flash',
    modalities: ['text'],
  },

  // Perplexity (Sonar)
  {
    id: 'sonar',
    provider: 'perplexity',
    name: 'Sonar',
    modalities: ['text'],
  },
  {
    id: 'sonar-pro',
    provider: 'perplexity',
    name: 'Sonar Pro',
    modalities: ['text'],
  },
  {
    id: 'sonar-reasoning-pro',
    provider: 'perplexity',
    name: 'Sonar Reasoning Pro',
    modalities: ['text'],
  },
];
