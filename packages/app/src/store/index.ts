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
  createEndpointsSlice,
  sanitizeEndpointsForPersist,
  type EndpointsSlice,
} from './slices/endpointsSlice';
import {
  createEnsembleSlice,
  type EnsembleSlice,
} from './slices/ensembleSlice';
import {
  createResponseSlice,
  type ResponseSlice,
} from './slices/responseSlice';
import { markInterruptedStreams } from './slices/responseErrorState';

/**
 * Root Zustand store combining all slices
 *
 * Uses persistence middleware to sync state to localStorage under
 * 'ensemble-ai-store'. The whole store is written, after
 * sanitizeStateForPersist strips plaintext API keys, including the keys of
 * OpenAI-compatible endpoints (only the encrypted form is kept). That includes the prompt, responses, embeddings and agreement
 * results, so the last run is still there after a reload or a later visit to
 * /review. A new run clears it: the prompt page calls startRun on submit,
 * which resets the results and records the run's prompt (runPrompt).
 *
 * On load, markInterruptedStreams marks answers that were still streaming as
 * interrupted errors, because a fresh page has no live streams.
 */

export type StoreState = ThemeSlice &
  LanguageSlice &
  WorkflowSlice &
  ModeSlice &
  ApiKeySlice &
  EndpointsSlice &
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
          // A validation in flight dies with the page; store it as idle so
          // the next load validates the key again instead of waiting forever.
          status: entry.status === 'validating' ? 'idle' : entry.status,
        },
      };
    }
  });

  sanitized.endpoints = sanitizeEndpointsForPersist(state.endpoints ?? []);
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
      ...createEndpointsSlice(...a),
      ...createEnsembleSlice(...a),
      ...createResponseSlice(...a),
    }),
    {
      name: 'ensemble-ai-store',
      serialize: serializeStoreState,
      deserialize: markInterruptedStreams,
    },
  ),
);

// Export individual slice types for convenience
export type { Theme } from './slices/themeSlice';
export type { Language } from './slices/languageSlice';
export type { WorkflowStep } from './slices/workflowSlice';
export type { OperatingMode } from './slices/modeSlice';
export type { ProviderType, ApiKeyProvider, ModelSelection, SavedEnsemble } from './slices/ensembleSlice';
export type { EndpointEntry } from './slices/endpointsSlice';
export type { ModelResponse, ManualResponse, AgreementStats } from './slices/responseSlice';
export type { ResponseErrorKind, ResponseErrorDetails } from './slices/responseErrorState';
