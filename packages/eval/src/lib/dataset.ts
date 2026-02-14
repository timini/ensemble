import { readJsonFile } from './io.js';

interface PromptObject {
  prompt: string;
}

function isPromptObject(value: unknown): value is PromptObject {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return typeof (value as PromptObject).prompt === 'string';
}

export async function loadDatasetPrompts(datasetPath: string): Promise<string[]> {
  const dataset = await readJsonFile<unknown>(datasetPath);
  if (!Array.isArray(dataset)) {
    throw new Error(`Dataset must be a JSON array: ${datasetPath}`);
  }

  const prompts = dataset
    .map((entry) => {
      if (typeof entry === 'string') {
        return entry.trim();
      }
      if (isPromptObject(entry)) {
        return entry.prompt.trim();
      }
      return '';
    })
    .filter((prompt) => prompt.length > 0);

  if (prompts.length === 0) {
    throw new Error(`Dataset did not contain any prompts: ${datasetPath}`);
  }

  return prompts;
}
