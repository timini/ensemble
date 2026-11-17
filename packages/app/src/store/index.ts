import { create } from 'zustand';
import { persist } from './middleware/persistenceMiddleware';
import {
  createThemeSlice,
  type ThemeSlice,
} from './slices/themeSlice';
import {
  createLanguageSlice,
  type LanguageSlice,
} from './slices/languageSlice';
import {
  createWorkflowSlice,
  type WorkflowSlice,
} from './slices/workflowSlice';
import {
  createModeSlice,
  type ModeSlice,
} from './slices/modeSlice';
import {
  createApiKeySlice,
  type ApiKeySlice,
} from './slices/apiKeySlice';
import {
  createEnsembleSlice,
  type EnsembleSlice,
} from './slices/ensembleSlice';
import {
  createResponseSlice,
  type ResponseSlice,
} from './slices/responseSlice';

/**
 * Root Zustand store combining all slices
 *
 * Uses persistence middleware to sync state to localStorage under
 * 'ensemble-ai-store'. The whole store is written, after
 * sanitizeStateForPersist strips plaintext API keys (only the encrypted form
 * is kept). That includes the prompt, responses, embeddings and agreement
 * results.
 *
 * The prompt and response data are cleared by an inline script in
 * src/app/layout.tsx when /review is opened by a fresh navigation (navigation
 * type "navigate"). It resets the prompt, responses, manual responses,
 * embeddings, similarity matrix, agreement stats, meta analysis, consensus
 * usage and majority vote in localStorage before the store hydrates. Reloads, back/forward loads and
 * client-side navigation keep the persisted data.
 */

export type StoreState = ThemeSlice &
  LanguageSlice &
  WorkflowSlice &
  ModeSlice &
  ApiKeySlice &
  EnsembleSlice &
  ResponseSlice;

const sanitizeStateForPersist = (state: StoreState): StoreState => {
  const sanitized = { ...state };
  const providers: Array<keyof StoreState['apiKeys']> = [
    'openai',
    'anthropic',
    'google',
    'xai',
    'deepseek',
    'perplexity',
  ];

  sanitized.apiKeys = {
    openai: null,
    anthropic: null,
    google: null,
    xai: null,
    deepseek: null,
    perplexity: null,
  };

  providers.forEach((provider) => {
    const entry = state.apiKeys[provider];
    if (entry) {
      sanitized.apiKeys = {
        ...sanitized.apiKeys,
        [provider]: {
          encrypted: entry.encrypted,
          key: '',
          visible: false,
          status: entry.status,
        },
      };
    }
  });

  sanitized.encryptionInitialized = false;

  return sanitized;
};

export const serializeStoreState = sanitizeStateForPersist;

export const useStore = create<StoreState>()(
  persist(
    (...a) => ({
      ...createThemeSlice(...a),
      ...createLanguageSlice(...a),
      ...createWorkflowSlice(...a),
      ...createModeSlice(...a),
      ...createApiKeySlice(...a),
      ...createEnsembleSlice(...a),
      ...createResponseSlice(...a),
    }),
    {
      name: 'ensemble-ai-store',
      serialize: serializeStoreState,
    },
  ),
);

// Export individual slice types for convenience
export type { Theme } from './slices/themeSlice';
export type { Language } from './slices/languageSlice';
export type { WorkflowStep } from './slices/workflowSlice';
export type { OperatingMode } from './slices/modeSlice';
export type { ProviderType, ModelSelection, SavedEnsemble } from './slices/ensembleSlice';
export type { ModelResponse, ManualResponse, AgreementStats } from './slices/responseSlice';
