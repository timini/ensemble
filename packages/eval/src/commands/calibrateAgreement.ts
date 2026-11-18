import { Command } from 'commander';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRICE_TABLE, getModelPrice } from '@ensemble-ai/shared-utils/pricing';
import { cosineSimilarity, type AgreementCalibrationFile } from '@ensemble-ai/shared-utils/similarity';
import { answerPairs, fitAgreementThresholds, type ScoredPair } from '../lib/calibration/agreement.js';
import { createEmbedder } from '../lib/calibration/embedder.js';
import { hasMockResults, readResultFiles } from '../lib/calibration/resultFiles.js';
import { fileExists, readJsonFile, writeJsonFile } from '../lib/io.js';
import { slug } from '../lib/matrix/plan.js';
import type { EvalMode } from '../types.js';

const PACKAGE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
/** The calibration the app's agreement labels read. */
export const DEFAULT_AGREEMENT_OUTPUT = resolve(PACKAGE_DIR, '../app/src/data/agreement-calibration.json');

interface Options {
  results: string[];
  embedding: string;
  mode: string;
  yes?: boolean;
  output?: string;
  pairsFile?: string;
  highPrecision: string;
}

interface PairsCache {
  embeddingModel: string;
  pairs: Array<ScoredPair & { questionId: string; a: string; b: string }>;
}

/** Path relative to the repo when it is inside it, for the `source` field. */
export function repoRelative(path: string): string {
  const index = path.lastIndexOf('packages/');
  return index >= 0 ? path.slice(index) : path;
}

/** `ensemble-eval calibrate-agreement`: fit agreement label cut-offs for one embedding model. */
export function createCalibrateAgreementCommand(): Command {
  return new Command('calibrate-agreement')
    .description('Fit per-embedding-model agreement thresholds from matrix runs (pairs of answers that agree or disagree).')
    .requiredOption('--results <dirs...>', 'Matrix run directories (packages/eval/results/<run-id>) or results files')
    .requiredOption('--embedding <spec>', 'Embedding model, e.g. openai:text-embedding-3-small or ollama:nomic-embed-text')
    .option('--mode <mode>', 'free (real embeddings) or mock', 'free')
    .option('--yes', 'Confirm the embedding spend (free mode)')
    .option('--output <file>', 'Calibration JSON to update (default: the app calibration; required with --mode mock)')
    .option('--pairs-file <file>', 'Scored pairs cache (default: <first results dir>/calibration/<model>-<mode>-pairs.json)')
    .option('--high-precision <share>', 'Share of pairs above the high cut-off that must agree', '0.9')
    .action(async (options: Options) => {
      const mode = options.mode as EvalMode;
      if (mode !== 'free' && mode !== 'mock') throw new Error(`Invalid mode "${options.mode}".`);
      const output = resolve(options.output ?? DEFAULT_AGREEMENT_OUTPUT);
      if (mode === 'mock' && output === DEFAULT_AGREEMENT_OUTPUT) {
        throw new Error('--mode mock embeds with fake vectors, so it never writes the app calibration. Pass --output <scratch file>.');
      }
      const embedder = createEmbedder(options.embedding, mode);
      const results = options.results.map((r) => resolve(r));
      const files = await readResultFiles(results, ['ensemble.json']);
      if (mode === 'free' && hasMockResults(files)) {
        throw new Error('Some results come from a mock run. Calibrate from a free-mode run, or use --mode mock with --output.');
      }
      const first = results[0]!;
      const pairsFile = resolve(options.pairsFile
        ?? join(first.endsWith('.json') ? dirname(first) : first, 'calibration', `${slug(embedder.key)}-${mode}-pairs.json`));

      let scored: PairsCache['pairs'];
      if (await fileExists(pairsFile)) {
        const cache = await readJsonFile<PairsCache>(pairsFile);
        if (cache.embeddingModel !== embedder.key) throw new Error(`${pairsFile} holds ${cache.embeddingModel} pairs.`);
        scored = cache.pairs;
        process.stdout.write(`Using ${scored.length} scored pairs from ${pairsFile}\n`);
      } else {
        const pairs = answerPairs(files);
        const texts = [...new Set(pairs.flatMap((p) => [p.textA, p.textB]))];
        const tokens = texts.reduce((s, t) => s + Math.ceil(t.length / 4), 0);
        const price = getModelPrice(embedder.provider, embedder.model, PRICE_TABLE);
        const cost = price.status === 'known'
          ? `about $${((tokens * price.inputPerMillion) / 1e6).toFixed(4)}`
          : 'no price in the table';
        process.stdout.write(`${pairs.length} answer pairs, ${texts.length} texts to embed (${tokens} tokens, ${cost}).\n`);
        if (mode === 'free' && !options.yes) {
          process.stdout.write('Nothing was embedded. Re-run with --yes to make these calls.\n');
          return;
        }
        const vectors = new Map<string, number[]>();
        for (const text of texts) vectors.set(text, await embedder.embed(text));
        scored = pairs.map((p) => ({
          questionId: p.questionId,
          a: p.a,
          b: p.b,
          agree: p.agree,
          cosine: cosineSimilarity(vectors.get(p.textA)!, vectors.get(p.textB)!),
        }));
        await writeJsonFile(pairsFile, { embeddingModel: embedder.key, pairs: scored } satisfies PairsCache);
      }

      const fit = fitAgreementThresholds(scored, { highPrecision: Number.parseFloat(options.highPrecision) });
      const file: AgreementCalibrationFile = (await fileExists(output))
        ? await readJsonFile<AgreementCalibrationFile>(output)
        : { schemaVersion: 1, models: {} };
      file.models[embedder.key] = {
        ...fit,
        fittedAt: new Date().toISOString().slice(0, 10),
        source: results.map(repoRelative).join(', '),
      };
      await writeJsonFile(output, file);
      process.stdout.write(
        `${embedder.key}: high above ${fit.high}, medium from ${fit.medium} (AUC ${fit.auc}, ` +
          `${fit.agreePairs} agree, ${fit.disagreePairs} disagree). Written to ${output}\n`,
      );
      if (fit.auc < 0.6) {
        process.stdout.write('Warning: cosine barely separates agreeing from disagreeing answers (AUC under 0.6).\n');
      }
    });
}
