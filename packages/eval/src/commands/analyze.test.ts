import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createAnalyzeCommand } from './analyze.js';

vi.mock('../lib/io.js', () => ({
  readJsonFile: vi.fn(),
  writeJsonFile: vi.fn().mockResolvedValue(undefined),
  writeTextFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../lib/analysis.js', () => ({
  analyzeBenchmarkRuns: vi.fn(),
}));

vi.mock('../lib/report.js', () => ({
  createMarkdownReport: vi.fn(),
}));

import { readJsonFile, writeJsonFile, writeTextFile } from '../lib/io.js';
import { analyzeBenchmarkRuns } from '../lib/analysis.js';
import { createMarkdownReport } from '../lib/report.js';

const mockReadJsonFile = vi.mocked(readJsonFile);
const mockWriteJsonFile = vi.mocked(writeJsonFile);
const mockWriteTextFile = vi.mocked(writeTextFile);
const mockAnalyzeBenchmarkRuns = vi.mocked(analyzeBenchmarkRuns);
const mockCreateMarkdownReport = vi.mocked(createMarkdownReport);

import type { AnalysisSummary } from '../lib/analysisTypes.js';

function makeAnalysisSummary(): AnalysisSummary {
  return {
    promptCount: 2,
    modelAccuracy: [],
    strategyAccuracy: [],
    comparisons: [],
    agreementCalibration: [],
    categoryBreakdown: [],
    difficultyBreakdown: [],
    notableExamples: [],
    costAnalysis: [],
    charts: {
      accuracyLiftByDifficulty: [],
      agreementCalibration: [],
      modelDiversityHeatmap: { models: [], matrix: [] },
      costVsAccuracyFrontier: [],
      rightAnswerAlwaysThere: {
        totalQuestions: 0,
        alwaysThereCount: 0,
        recoveredByEnsembleCount: 0,
        missedDespiteAvailabilityCount: 0,
        ensembleSolvedWhenAllFailedCount: 0,
      },
    },
    primaryStrategy: 'standard',
  };
}

function setupDefaults(): void {
  mockReadJsonFile.mockResolvedValue({
    runs: [
      { prompt: 'Q1', responses: [], consensus: {} },
      { prompt: 'Q2', responses: [], consensus: {} },
    ],
  });
  mockAnalyzeBenchmarkRuns.mockReturnValue(makeAnalysisSummary());
  mockCreateMarkdownReport.mockReturnValue('# Report');
}

async function runCommand(args: string[]): Promise<void> {
  const command = createAnalyzeCommand();
  command.exitOverride();
  await command.parseAsync(['node', 'analyze', ...args]);
}

describe('analyze command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    setupDefaults();
  });

  describe('argument parsing', () => {
    it('parses results file argument and --report option', async () => {
      await runCommand(['results.json', '--report', 'report.md']);

      expect(mockReadJsonFile).toHaveBeenCalledWith('results.json');
      expect(mockWriteTextFile).toHaveBeenCalledWith('report.md', '# Report');
    });

    it('parses --bootstrap-iterations option', async () => {
      await runCommand([
        'results.json',
        '--report', 'report.md',
        '--bootstrap-iterations', '5000',
      ]);

      expect(mockAnalyzeBenchmarkRuns).toHaveBeenCalledWith(
        expect.any(Array),
        { bootstrapIterations: 5000 },
      );
    });

    it('defaults bootstrap iterations to 10000', async () => {
      await runCommand(['results.json', '--report', 'report.md']);

      expect(mockAnalyzeBenchmarkRuns).toHaveBeenCalledWith(
        expect.any(Array),
        { bootstrapIterations: 10000 },
      );
    });
  });

  describe('report generation', () => {
    it('passes source file path to createMarkdownReport', async () => {
      await runCommand(['my-results.json', '--report', 'report.md']);

      expect(mockCreateMarkdownReport).toHaveBeenCalledWith(
        'my-results.json',
        expect.any(Object),
      );
    });

    it('writes markdown report to specified path', async () => {
      mockCreateMarkdownReport.mockReturnValue('## My Report Content');

      await runCommand(['results.json', '--report', 'output-report.md']);

      expect(mockWriteTextFile).toHaveBeenCalledWith(
        'output-report.md',
        '## My Report Content',
      );
    });

    it('writes completion message to stdout', async () => {
      const writeSpy = vi.spyOn(process.stdout, 'write');
      await runCommand(['results.json', '--report', 'report.md']);

      const calls = writeSpy.mock.calls.map((call) => String(call[0]));
      expect(calls.some((call) => call.includes('Report generated'))).toBe(true);
    });
  });

  describe('chart output', () => {
    it('writes chart JSON files when --charts is specified', async () => {
      const analysis = makeAnalysisSummary();
      analysis.charts.accuracyLiftByDifficulty = [
        { difficulty: 'easy', lift: 0.1, sampleSize: 5 },
      ];
      mockAnalyzeBenchmarkRuns.mockReturnValue(analysis);

      await runCommand([
        'results.json',
        '--report', 'report.md',
        '--charts', 'charts-dir',
      ]);

      expect(mockWriteJsonFile).toHaveBeenCalledWith(
        'charts-dir/accuracy-lift-by-difficulty.json',
        analysis.charts.accuracyLiftByDifficulty,
      );
      expect(mockWriteJsonFile).toHaveBeenCalledWith(
        'charts-dir/agreement-calibration.json',
        analysis.charts.agreementCalibration,
      );
      expect(mockWriteJsonFile).toHaveBeenCalledWith(
        'charts-dir/model-diversity-heatmap.json',
        analysis.charts.modelDiversityHeatmap,
      );
      expect(mockWriteJsonFile).toHaveBeenCalledWith(
        'charts-dir/cost-vs-accuracy-frontier.json',
        analysis.charts.costVsAccuracyFrontier,
      );
      expect(mockWriteJsonFile).toHaveBeenCalledWith(
        'charts-dir/right-answer-always-there.json',
        analysis.charts.rightAnswerAlwaysThere,
      );
    });

    it('does not write chart files when --charts is not specified', async () => {
      await runCommand(['results.json', '--report', 'report.md']);

      expect(mockWriteJsonFile).not.toHaveBeenCalled();
    });

    it('writes chart directory message to stdout', async () => {
      const writeSpy = vi.spyOn(process.stdout, 'write');
      await runCommand([
        'results.json',
        '--report', 'report.md',
        '--charts', 'charts-dir',
      ]);

      const calls = writeSpy.mock.calls.map((call) => String(call[0]));
      expect(
        calls.some((call) => call.includes('Chart JSON written to charts-dir')),
      ).toBe(true);
    });
  });

  describe('invalid input handling', () => {
    it('throws when result file has no runs array', async () => {
      mockReadJsonFile.mockResolvedValue({ data: 'not runs' });

      await expect(
        runCommand(['bad.json', '--report', 'report.md']),
      ).rejects.toThrow('does not contain a valid "runs" array');
    });

    it('throws when result file is null', async () => {
      mockReadJsonFile.mockResolvedValue(null);

      await expect(
        runCommand(['empty.json', '--report', 'report.md']),
      ).rejects.toThrow('does not contain a valid "runs" array');
    });

    it('throws when runs is not an array', async () => {
      mockReadJsonFile.mockResolvedValue({ runs: 'not-an-array' });

      await expect(
        runCommand(['malformed.json', '--report', 'report.md']),
      ).rejects.toThrow('does not contain a valid "runs" array');
    });

    it('throws when readJsonFile throws (file not found)', async () => {
      mockReadJsonFile.mockRejectedValue(new Error('ENOENT: no such file'));

      await expect(
        runCommand(['missing.json', '--report', 'report.md']),
      ).rejects.toThrow('ENOENT');
    });

    it('rejects invalid bootstrap iteration count', async () => {
      await expect(
        runCommand([
          'results.json',
          '--report', 'report.md',
          '--bootstrap-iterations', '0',
        ]),
      ).rejects.toThrow('Invalid bootstrap iteration count');
    });

    it('rejects non-integer bootstrap iteration count', async () => {
      await expect(
        runCommand([
          'results.json',
          '--report', 'report.md',
          '--bootstrap-iterations', 'abc',
        ]),
      ).rejects.toThrow('Invalid bootstrap iteration count');
    });
  });
});
