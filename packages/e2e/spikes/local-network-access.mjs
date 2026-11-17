#!/usr/bin/env node
/**
 * Spike (M2): can an HTTPS page on a public origin call a server on
 * http://localhost? Results are in docs/LOCAL_MODELS.md (Browser support).
 *
 * It serves a page over HTTPS with a throwaway self-signed certificate,
 * starts a fake model server on http://localhost with permissive CORS (like
 * Ollama with OLLAMA_ORIGINS set), opens the page in a Playwright browser and
 * calls the server with fetch.
 *
 * Chromium sees the page as https://public.test (mapped to 127.0.0.1) and is
 * told to treat that address as public, so Local Network Access applies as
 * it would on the hosted site. WebKit and Firefox load https://localhost,
 * which is enough to show mixed content blocking.
 *
 * Usage (needs openssl):
 *   node spikes/local-network-access.mjs chromium
 *   node spikes/local-network-access.mjs chromium --grant      # grant local network access first
 *   node spikes/local-network-access.mjs chromium --http-page  # page on http://localhost (the local run)
 *   node spikes/local-network-access.mjs webkit
 *   EXECUTABLE=/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome node spikes/local-network-access.mjs chromium
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import * as playwright from '@playwright/test';

const browserName = process.argv[2] ?? 'chromium';
const grant = process.argv.includes('--grant');
const httpPage = process.argv.includes('--http-page');
const LOCAL_PORT = 11598;
const PAGE_PORT = 8443;

function selfSignedCert() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lna-spike-'));
  const key = path.join(dir, 'key.pem');
  const cert = path.join(dir, 'cert.pem');
  execFileSync('openssl', [
    'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', cert, '-days', '1',
    '-subj', '/CN=public.test', '-addext', 'subjectAltName=DNS:public.test,DNS:localhost,IP:127.0.0.1',
  ], { stdio: 'ignore' });
  return { key: fs.readFileSync(key), cert: fs.readFileSync(cert) };
}

const modelServer = http
  .createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin ?? '*');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    res.setHeader('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: [{ id: 'tiny' }] }));
  })
  .listen(LOCAL_PORT);

const servePage = (_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<!doctype html><title>spike</title><p>spike</p>');
};
const pageServer = (httpPage ? http.createServer(servePage) : https.createServer(selfSignedCert(), servePage)).listen(
  PAGE_PORT,
);

const isChromium = browserName === 'chromium';
const browser = await playwright[browserName].launch({
  executablePath: process.env.EXECUTABLE || undefined,
  args:
    isChromium && !httpPage
      ? ['--host-resolver-rules=MAP public.test 127.0.0.1', `--ip-address-space-overrides=127.0.0.1:${PAGE_PORT}=public`]
      : [],
});
const context = await browser.newContext({ ignoreHTTPSErrors: true });
if (grant) await context.grantPermissions(['local-network-access']);
const page = await context.newPage();
const consoleLines = [];
page.on('console', (message) => consoleLines.push(message.text()));
const host = isChromium && !httpPage ? 'public.test' : 'localhost';
await page.goto(`${httpPage ? 'http' : 'https'}://${host}:${PAGE_PORT}/`);

const results = await page.evaluate(async (port) => {
  const out = {};
  for (const name of ['loopback-network', 'local-network', 'local-network-access']) {
    try {
      out[`permission ${name}`] = (await navigator.permissions.query({ name })).state;
    } catch (error) {
      out[`permission ${name}`] = `throws ${error.name}`;
    }
  }
  const attempt = async (label, url, init = {}) => {
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(4000) });
      out[label] = `ok ${response.status}`;
    } catch (error) {
      out[label] = `${error.name}: ${error.message}`;
    }
  };
  await attempt('fetch http://localhost', `http://localhost:${port}/v1/models`);
  await attempt('fetch http://127.0.0.1', `http://127.0.0.1:${port}/v1/models`);
  await attempt('fetch with targetAddressSpace loopback', `http://localhost:${port}/v1/models`, {
    targetAddressSpace: 'loopback',
  });
  return out;
}, LOCAL_PORT);

console.log(JSON.stringify({ browser: browserName, version: browser.version(), page: page.url(), results, console: consoleLines }, null, 2));
await browser.close();
modelServer.close();
pageServer.close();
