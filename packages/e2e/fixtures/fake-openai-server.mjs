#!/usr/bin/env node
/**
 * A tiny OpenAI-compatible server for E2E tests. It stands in for a local
 * server such as Ollama, so a Free-mode run can use the openai-compatible
 * provider with no cloud key and no real model.
 *
 * Endpoints (all under /v1, with permissive CORS like a local server
 * configured for browser access):
 *   GET  /v1/models            three chat models and one embedding model
 *   POST /v1/chat/completions  streamed (SSE) or plain answers; json_schema is
 *                              rejected with 400 so clients fall back to json_object
 *   POST /v1/embeddings        bag-of-words vectors, so equal answers score 1
 *                              and different answers score lower
 *   GET  /__requests           request counts per path, for assertions
 *   POST /__reset              clears the counts
 *
 * Port: FAKE_OPENAI_PORT, default 11499.
 */
import http from 'node:http';

const PORT = Number(process.env.FAKE_OPENAI_PORT ?? 11499);

/** Two models agree, the third does not, so the agreement score is not trivial. */
const ANSWERS = {
  'tiny-alpha': 'The capital of France is Paris. Paris has been the capital for centuries.',
  'tiny-beta': 'The capital of France is Paris. Paris has been the capital for centuries.',
  'tiny-gamma': 'Bananas are yellow fruit rich in potassium and grown in tropical climates.',
};
const EMBEDDING_MODEL = 'tiny-embed';
const DIMENSIONS = 64;

const counts = {};

function cors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin ?? '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] ?? '*');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function hashWord(word) {
  let hash = 0;
  for (const ch of word) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(hash) % DIMENSIONS;
}

/** Normalised bag-of-words vector: texts with the same words get the same vector. */
function embed(text) {
  const vector = new Array(DIMENSIONS).fill(0);
  for (const word of String(text).toLowerCase().match(/[a-z]+/g) ?? []) vector[hashWord(word)] += 1;
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
}

function answerFor(model, prompt) {
  if (ANSWERS[model]) return ANSWERS[model];
  return `Summary: ${String(prompt).slice(0, 80)}`;
}

/** A JSON object with one value per schema property (first enum value or a string). */
function objectForSchema(schemaText) {
  const result = {};
  const match = /\{[\s\S]*\}$/.exec(schemaText.trim());
  try {
    const schema = match ? JSON.parse(match[0]) : {};
    for (const [key, prop] of Object.entries(schema.properties ?? {})) {
      result[key] = prop.enum?.[0] ?? (prop.type === 'number' ? 1 : prop.type === 'array' ? [] : 'Paris');
    }
  } catch {
    result.answer = 'Paris';
  }
  return result;
}

function usageOf(prompt, text) {
  const input = Math.ceil(String(prompt).length / 4);
  const output = Math.ceil(text.length / 4);
  return { prompt_tokens: input, completion_tokens: output, total_tokens: input + output };
}

async function chat(req, res) {
  const body = await readBody(req);
  const prompt = body.messages?.map((m) => m.content).join('\n') ?? '';
  if (!body.model) return sendJson(res, 400, { error: { message: 'model is required' } });

  if (body.response_format?.type === 'json_schema') {
    return sendJson(res, 400, { error: { message: 'response_format json_schema is not supported' } });
  }
  if (body.response_format?.type === 'json_object') {
    const content = JSON.stringify(objectForSchema(prompt));
    return sendJson(res, 200, {
      choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
      usage: usageOf(prompt, content),
    });
  }

  const text = answerFor(body.model, prompt);
  if (!body.stream) {
    return sendJson(res, 200, {
      choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }],
      usage: usageOf(prompt, text),
    });
  }

  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  const words = text.split(/(?<= )/);
  for (const word of words) {
    res.write(`data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: word } }] })}\n\n`);
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  res.write(`data: ${JSON.stringify({ choices: [], usage: usageOf(prompt, text) })}\n\n`);
  res.write('data: [DONE]\n\n');
  res.end();
}

async function embeddings(req, res) {
  const body = await readBody(req);
  if (body.model !== EMBEDDING_MODEL) {
    return sendJson(res, 404, { error: { message: `model "${body.model}" not found` } });
  }
  const inputs = Array.isArray(body.input) ? body.input : [body.input];
  return sendJson(res, 200, {
    object: 'list',
    model: EMBEDDING_MODEL,
    data: inputs.map((input, index) => ({ object: 'embedding', index, embedding: embed(input) })),
    usage: { prompt_tokens: 1, total_tokens: 1 },
  });
}

const server = http.createServer(async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }
  const path = new URL(req.url ?? '/', 'http://localhost').pathname;
  if (!path.startsWith('/__')) counts[`${req.method} ${path}`] = (counts[`${req.method} ${path}`] ?? 0) + 1;

  if (req.method === 'GET' && path === '/v1/models') {
    return sendJson(res, 200, {
      object: 'list',
      data: [...Object.keys(ANSWERS), EMBEDDING_MODEL].map((id) => ({ id, object: 'model', owned_by: 'fake' })),
    });
  }
  if (req.method === 'POST' && path === '/v1/chat/completions') return chat(req, res);
  if (req.method === 'POST' && path === '/v1/embeddings') return embeddings(req, res);
  if (req.method === 'GET' && path === '/__requests') return sendJson(res, 200, counts);
  if (req.method === 'POST' && path === '/__reset') {
    for (const key of Object.keys(counts)) delete counts[key];
    return sendJson(res, 200, {});
  }
  if (req.method === 'GET' && path === '/') return sendJson(res, 200, { ok: true });
  return sendJson(res, 404, { error: { message: `No route for ${req.method} ${path}` } });
});

server.listen(PORT, () => {
  console.log(`Fake OpenAI-compatible server on http://localhost:${PORT}/v1`);
});
