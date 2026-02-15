import { loadBenchmarkQuestions } from './benchmarkDatasets.js';

export async function loadDatasetPrompts(datasetPath: string): Promise<string[]> {
  const { questions } = await loadBenchmarkQuestions(datasetPath);
  return questions.map((question) => question.prompt);
}
