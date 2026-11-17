import { Command } from 'commander';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fitTokenAssumptions, tokenCalibrationModule } from '../lib/calibration/tokens.js';
import { readResultFiles } from '../lib/calibration/resultFiles.js';
import { writeTextFile } from '../lib/io.js';
import { repoRelative } from './calibrateAgreement.js';

const PACKAGE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
/** The module estimateRun reads its token assumptions from. */
export const DEFAULT_TOKENS_OUTPUT = resolve(PACKAGE_DIR, '../shared-utils/src/pricing/tokenCalibration.ts');

/** `ensemble-eval calibrate-tokens`: fit estimateRun's token assumptions from recorded usage. */
export function createCalibrateTokensCommand(): Command {
  return new Command('calibrate-tokens')
    .description("Fit estimateRun's token assumptions from usage recorded in matrix runs. Makes no calls.")
    .requiredOption('--results <dirs...>', 'Matrix run directories or results files')
    .option('--output <file>', 'Generated shared-utils module', DEFAULT_TOKENS_OUTPUT)
    .option('--min-calls <n>', 'Fewest calls with usage needed', '20')
    .action(async (options: { results: string[]; output: string; minCalls: string }) => {
      const results = options.results.map((r) => resolve(r));
      const files = await readResultFiles(results, ['ensemble.json', 'reference.json']);
      const fit = fitTokenAssumptions(files, {
        source: results.map(repoRelative).join(', '),
        now: new Date(),
        minCalls: Number.parseInt(options.minCalls, 10),
      });
      await writeTextFile(resolve(options.output), tokenCalibrationModule(fit));
      process.stdout.write(
        `Answer tokens ${fit.tokens.answer?.low} to ${fit.tokens.answer?.high}, overhead ${fit.tokens.overhead ?? 'not fitted'} ` +
          `from ${fit.calls} calls (${Math.round(fit.reportedShare * 100)}% reported). Written to ${options.output}.\n` +
          'Rebuild shared-utils: npm run build --workspace=packages/shared-utils\n',
      );
    });
}
