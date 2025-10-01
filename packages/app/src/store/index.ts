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
