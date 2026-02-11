import { describe, it, expect } from 'vitest';
import { migrateModelDisplayNamesToIds } from '../migrateModelIds';

describe('migrateModelDisplayNamesToIds', () => {
  it('converts display names to model IDs in selectedModels', () => {
    const stored = {
      selectedModels: [
        { id: 'openai-GPT-4o-123', provider: 'openai', model: 'GPT-4o' },
        { id: 'google-Gemini 1.5 Pro-456', provider: 'google', model: 'Gemini 1.5 Pro' },
      ],
    };

    const result = migrateModelDisplayNamesToIds(stored);
    expect(result.selectedModels).toEqual([
      { id: 'openai-GPT-4o-123', provider: 'openai', model: 'gpt-4o' },
      { id: 'google-Gemini 1.5 Pro-456', provider: 'google', model: 'gemini-1.5-pro' },
    ]);
  });

  it('leaves model IDs unchanged', () => {
    const stored = {
      selectedModels: [
        { id: 'openai-gpt-4o-123', provider: 'openai', model: 'gpt-4o' },
        { id: 'anthropic-claude-3.5-sonnet-456', provider: 'anthropic', model: 'claude-3.5-sonnet' },
      ],
    };

    const result = migrateModelDisplayNamesToIds(stored);
    expect(result.selectedModels).toEqual(stored.selectedModels);
  });

  it('handles empty selectedModels', () => {
    const stored = { selectedModels: [] };
    const result = migrateModelDisplayNamesToIds(stored);
    expect(result.selectedModels).toEqual([]);
  });

  it('handles missing selectedModels', () => {
    const stored: Record<string, unknown> = { theme: 'dark' };
    const result = migrateModelDisplayNamesToIds(stored);
    expect(result.selectedModels).toBeUndefined();
  });

  it('preserves unmatched display names', () => {
    const stored = {
      selectedModels: [
        { id: 'custom-Unknown Model-789', provider: 'openai', model: 'Unknown Model' },
      ],
    };

    const result = migrateModelDisplayNamesToIds(stored);
    const models = result.selectedModels as Array<{ model: string }>;
    expect(models[0]!.model).toBe('Unknown Model');
  });

  it('migrates savedEnsembles models too', () => {
    const stored = {
      savedEnsembles: [
        {
          id: 'ensemble-1',
          name: 'Test',
          models: [
            { id: 'sel-1', provider: 'google', model: 'Gemini 2.5 Flash' },
            { id: 'sel-2', provider: 'anthropic', model: 'claude-3-opus' },
          ],
        },
      ],
    };

    const result = migrateModelDisplayNamesToIds(stored);
    const ensembles = result.savedEnsembles as
      | Array<{ models: Array<{ model: string }> }>
      | undefined;
    expect(ensembles![0]!.models[0]!.model).toBe('gemini-2.5-flash');
    expect(ensembles![0]!.models[1]!.model).toBe('claude-3-opus'); // already an ID
  });

  it('preserves all other state fields', () => {
    const stored = {
      theme: 'dark',
      language: 'fr',
      selectedModels: [
        { id: 'sel-1', provider: 'openai', model: 'GPT-4o' },
      ],
      apiKeys: { openai: { encrypted: 'abc' } },
    };

    const result = migrateModelDisplayNamesToIds(stored);
    expect(result.theme).toBe('dark');
    expect(result.language).toBe('fr');
    expect(result.apiKeys).toEqual({ openai: { encrypted: 'abc' } });
  });
});
