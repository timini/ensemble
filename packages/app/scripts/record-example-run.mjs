#!/usr/bin/env node
/**
 * Records the example run shown on the landing page, with real model calls
 * through OpenRouter, and writes it to src/data/example-run.json.
 *
 * It runs the same code the workspace runs: the OpenAI-compatible client
 * from shared-utils for the answers and the embeddings, cosine similarity
 * from shared-utils for the agreement matrix, and StandardConsensus for the
 * consensus answer. Costs come from the shared price table.
 *
 * Needs OPENROUTER_API_KEY in the environment. Costs well under one US cent.
 * From the repo root:
 *
 *   npm run build --workspace=packages/shared-utils
 *   cd packages/app && node --env-file=../eval/.env.local --import tsx scripts/record-example-run.mjs
 */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { FreeOpenAICompatibleClient } from "@ensemble-ai/shared-utils/providers";
import { similarityMatrix } from "@ensemble-ai/shared-utils/similarity";
import {
  costOfTokens,
  estimateTokensFromText,
  getModelPrice,
} from "@ensemble-ai/shared-utils/pricing";
import { StandardConsensus } from "@ensemble-ai/consensus-standard";

const OUTPUT = fileURLToPath(
  new URL("../src/data/example-run.json", import.meta.url),
);
const BASE_URL = "https://openrouter.ai/api/v1";
const ENDPOINTS = [{ id: "openrouter", baseURL: BASE_URL }];
const EMBEDDING_MODEL = "openai/text-embedding-3-small";

const PROMPT =
  "At what temperature does water boil at the summit of Mount Everest, and why is it lower than at sea level? Answer in one short paragraph.";

/** Three open or low-cost models from different families, and the summarizer. */
const MODELS = [
  { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B" },
  { id: "mistralai/mistral-small-3.2-24b-instruct", name: "Mistral Small 3.2" },
  { id: "google/gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite" },
];
const SUMMARIZER = MODELS[2];

const apiKey = process.env.OPENROUTER_API_KEY?.trim();
if (!apiKey) {
  console.error("Set OPENROUTER_API_KEY (for example with --env-file).");
  process.exit(1);
}

const client = new FreeOpenAICompatibleClient(
  "openai-compatible",
  () => apiKey,
  {
    getBaseURL: () => BASE_URL,
    getEmbeddingModel: () => EMBEDDING_MODEL,
  },
);

/** Cost of one call through OpenRouter, priced from the shared table. */
function priced(modelId, usage) {
  const price = getModelPrice(
    "openai-compatible",
    `openrouter/${modelId}`,
    undefined,
    ENDPOINTS,
  );
  return costOfTokens(price, usage.inputTokens, usage.outputTokens);
}

function ask(prompt, modelId) {
  return new Promise((resolve, reject) => {
    void client.streamResponse(
      prompt,
      modelId,
      () => undefined,
      (text, ms, _count, usage) =>
        resolve({
          text: text.trim(),
          seconds: Math.round(ms / 100) / 10,
          usage: usage ?? {
            inputTokens: estimateTokensFromText(prompt),
            outputTokens: estimateTokensFromText(text),
          },
        }),
      reject,
    );
  });
}

const answers = await Promise.all(
  MODELS.map(async (model) => {
    const result = await ask(PROMPT, model.id);
    return {
      modelId: `openrouter/${model.id}`,
      name: model.name,
      text: result.text,
      seconds: result.seconds,
      usage: result.usage,
      cost: priced(model.id, result.usage),
    };
  }),
);

const vectors = await Promise.all(
  answers.map((answer) => client.generateEmbeddings(answer.text)),
);
const matrix = similarityMatrix(vectors).map((row) =>
  row.map((value) => Math.round(value * 10000) / 10000),
);
const embeddingTokens = answers.reduce(
  (sum, answer) => sum + estimateTokensFromText(answer.text),
  0,
);
const embeddingCost = costOfTokens(
  getModelPrice(
    "openai-compatible",
    `openrouter/${EMBEDDING_MODEL}`,
    undefined,
    ENDPOINTS,
  ),
  embeddingTokens,
  0,
);

// Track the summarizer's usage the same way the app does for consensus calls.
let consensusUsage = null;
const summarizer = Object.create(client);
Object.assign(summarizer, {
  streamResponse: (prompt, model, onChunk, onComplete, onError, options) =>
    client.streamResponse(
      prompt,
      model,
      onChunk,
      (text, ms, count, usage) => {
        consensusUsage = usage ?? {
          inputTokens: estimateTokensFromText(prompt),
          outputTokens: estimateTokensFromText(text),
        };
        onComplete(text, ms, count, usage);
      },
      onError,
      options,
    ),
});
const consensusText = await new StandardConsensus(
  summarizer,
  SUMMARIZER.id,
).generateConsensus(
  answers.map((a) => ({
    modelId: a.modelId,
    modelName: a.name,
    content: a.text,
  })),
  answers.length,
  PROMPT,
);
if (consensusText === "Failed to generate summary.") {
  console.error("The consensus call failed; nothing written.");
  process.exit(1);
}

const consensusCost = consensusUsage
  ? priced(SUMMARIZER.id, consensusUsage)
  : null;
const costs = [...answers.map((a) => a.cost), consensusCost, embeddingCost];
const total = costs.every((c) => c !== null)
  ? costs.reduce((sum, c) => sum + c, 0)
  : null;

const record = {
  recordedAt: new Date().toISOString().slice(0, 10),
  via: "OpenRouter",
  prompt: PROMPT,
  method: "standard",
  embeddingModel: EMBEDDING_MODEL,
  summarizer: `openrouter/${SUMMARIZER.id}`,
  answers,
  similarity: matrix,
  consensus: {
    text: consensusText.trim(),
    usage: consensusUsage,
    cost: consensusCost,
  },
  calls: answers.length * 2 + 1,
  totalCost: total,
};

await writeFile(OUTPUT, `${JSON.stringify(record, null, 2)}\n`);
console.log(
  `Wrote ${OUTPUT}: ${answers.length} answers, ${record.calls} calls, cost ${total === null ? "unknown" : `$${total.toFixed(5)}`}.`,
);
