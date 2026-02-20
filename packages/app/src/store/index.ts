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
 * Uses persistence middleware to sync essential state to localStorage
 * Persisted: theme, language, workflow step, mode, API keys (encrypted), saved ensembles
 * NOT persisted: responses, embeddings, streaming state (transient)
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
  ];

  sanitized.apiKeys = {
    openai: null,
    anthropic: null,
    google: null,
    xai: null,
    deepseek: null,
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
