# Local and open models

Ensemble can run an ensemble with no cloud keys at all. It talks to any server with an OpenAI-compatible API: local servers such as Ollama, LM Studio, llama.cpp and vLLM, and hosted routers such as OpenRouter, Groq and Together. Several endpoints can be used at once.

Last checked: 17 November 2026.

## Quick start: Ollama only, no keys

This is the setup the M2 milestone targets: three local models, real agreement scores, no API keys.

1. Install Ollama from https://ollama.com/download and start it (open the app, or run `ollama serve`).
2. Pull three small chat models from different families and one embedding model:

   ```bash
   ollama pull llama3.2:3b
   ollama pull qwen3:4b
   ollama pull gemma3:4b
   ollama pull nomic-embed-text
   ```

3. Run Ensemble on your computer (needs Node 20 or later and git):

   ```bash
   git clone https://github.com/timini/ensemble
   cd ensemble
   npm install
   npm run local
   ```

   The first run builds the app, which takes a few minutes. Later runs start in seconds.
4. Open http://localhost:3000. Ensemble finds Ollama and offers to add it under the question box, listing the installed models. Click **Add Ollama**.
5. Click **Choose models**, pick the three models (the method menu sets which one writes the consensus) and ask a question. The answers, the agreement score (from `nomic-embed-text`) and the consensus all come from your machine. The cost shows as $0.00.

This flow (finding Ollama, adding it, a 3-model ensemble with an agreement score) is verified end to end against a fake Ollama server in the local-endpoint E2E suite, not yet against a real Ollama install.

Why run it locally? A page served from `http://localhost` may call other servers on `localhost` in every browser we tested, and Ollama accepts requests from `localhost` pages by default. The hosted HTTPS site needs extra setup and does not work in Safari at all (see Browser support below).

## Running Ensemble locally

`npm run local` (from the repository root) runs `packages/app/bin/ensemble-local.mjs`. It:

- builds the app (the whole workspace, `npm run build`) the first time, when the code has changed since its last build (a new git commit), when the existing build was not made by `npm run local` (for example a mock mode build from `npm run build`), and with `--rebuild`. It records each build it makes in `packages/app/.next/standalone/.ensemble-local.json`. Uncommitted edits are not detected; use `--rebuild` for those;
- serves the production build on `http://localhost:3000`, bound to `127.0.0.1` so other machines on the network cannot reach it;
- uses Free mode, so keys stay encrypted in your browser and model calls go straight from the browser to the servers.

Options go after `--`:

```bash
npm run local -- --port 4000     # another port (or set PORT)
npm run local -- --rebuild       # build again, for example after local edits
npm run local -- --help
```

The package is not published to npm yet, so `npx` without a clone does not work. Inside a clone, `npx ensemble-local` runs the same script.

## Using the hosted site with local models

The hosted site can reach a local server in Chrome and Firefox, with two extra steps:

1. Allow the site's origin on the server. For Ollama, set `OLLAMA_ORIGINS` to the site's URL (next section). Without it Ollama answers 403 and the browser reports a network error.
2. Allow the browser prompt. Chrome (from version 142) and Firefox (from version 151) ask before a public website may reach servers on your computer. If you dismissed or blocked it, open the site settings (the icon left of the address bar) and allow local network access.

Safari blocks `http://localhost` from HTTPS pages as mixed content. There is no setting to allow it; use `npm run local`.

On the hosted site, Ensemble does not look for Ollama when the page loads, because that would raise the permission prompt unasked. It shows a **Look for Ollama** button instead (only on first run, when no endpoint is set up and no key is valid). The check after the click waits up to 30 seconds, so there is time to answer the prompt. We have not tested a real user clicking **Allow** in that prompt: a headless browser cannot answer it, so our tests cover only the granted and blocked states. When a check of a local endpoint fails from the hosted site, the endpoint card explains that the browser may have blocked it and shows the `npm run local` command.

## Setting OLLAMA_ORIGINS

Only needed for the hosted site. `npm run local` needs nothing. Replace `https://ensemble.example.app` with the address of the hosted Ensemble site (the origin only: scheme, host and port, no path).

**macOS** (Ollama app):

```bash
launchctl setenv OLLAMA_ORIGINS "https://ensemble.example.app"
```

Then quit Ollama from the menu bar and open it again. The setting lasts until you log out; add the command to a login item to keep it.

**Linux** (systemd service):

```bash
sudo systemctl edit ollama.service
```

Add these lines, save, then restart:

```ini
[Service]
Environment="OLLAMA_ORIGINS=https://ensemble.example.app"
```

```bash
sudo systemctl daemon-reload
sudo systemctl restart ollama
```

**Windows**: quit Ollama from the taskbar. Open "Edit environment variables for your account", add `OLLAMA_ORIGINS` with the site's URL, then start Ollama again. From a terminal: `setx OLLAMA_ORIGINS "https://ensemble.example.app"`.

**Any system, one session**: `OLLAMA_ORIGINS="https://ensemble.example.app" ollama serve`.

Several origins are separated by commas. Avoid `*`: it lets every website you visit call your models.

## Browser support

The question for M2 was whether the hosted HTTPS site can call `http://localhost` reliably. It cannot, so Ensemble ships `npm run local` and says so in the UI.

| Browser | Hosted HTTPS site to `http://localhost` | Local run (`http://localhost` page) |
|---|---|---|
| Chrome 142 and later | Works after the user allows the local network prompt, and only if the server allows the site's origin (CORS). Blocked when the prompt is dismissed or denied. | Works, no prompt |
| Firefox 151 and later | Same as Chrome: a permission prompt, then CORS. Not tested here (see below). | Works (expected; not tested) |
| Safari | Blocked as mixed content. No setting allows it. | Works |

What we found:

- **Mixed content.** Chrome and Firefox treat `http://localhost` and `http://127.0.0.1` as potentially trustworthy, so an HTTPS page may call them. WebKit does not: Safari 18 started blocking these calls, WebKit changed this code again in 2025, and `fetch` from an HTTPS page to `http://localhost` is still blocked in our test of a current WebKit build ([WebKit bug 279249](https://bugs.webkit.org/show_bug.cgi?id=279249), [bug 171934](https://bugs.webkit.org/show_bug.cgi?id=171934)).
- **Local Network Access (Chrome).** Since Chrome 142 a public site needs the user's permission to reach the local network or this machine. Chrome 145 split it into `local-network` and `loopback-network` permissions; `localhost` falls under `loopback-network`. A denied request fails with `TypeError: Failed to fetch` and the console says "Permission was denied for this request to access the `loopback` address space". Chrome's guidance is not to send such requests on page load while the state is `prompt` ([Chrome blog](https://developer.chrome.com/blog/local-network-access), [Chrome guide](https://developer.chrome.com/docs/modern-web-guidance/guides/security/local-network-access)).
- **Local Network Access (Firefox).** Firefox 151 (May 2026) turned on the same kind of prompt for all users ([Mozilla support](https://support.mozilla.org/kb/control-personal-device-local-network-permissions-firefox), [release notes](https://www.firefox.com/firefox/151.0/releasenotes/)).
- **CORS.** Even with the permission, the server must answer with `Access-Control-Allow-Origin` for the site. Ollama allows `localhost`, `127.0.0.1` and `0.0.0.0` origins by default and others through `OLLAMA_ORIGINS` ([Ollama FAQ](https://docs.ollama.com/faq)).

How we tested. `packages/e2e/spikes/local-network-access.mjs` serves a page over HTTPS with a self-signed certificate, runs a fake model server on `http://localhost` with permissive CORS, and calls it with `fetch` from Playwright browsers. Chromium loads the page as `https://public.test` with `--ip-address-space-overrides` so it treats the page as public, as it would the hosted site.

- Chromium 145 (Playwright) and Chrome 157 (stable), headless: the `loopback-network` permission was `prompt`, and calls to `http://localhost` and `http://127.0.0.1` failed with the loopback permission error (a headless browser cannot answer the prompt, which behaves like a dismissal). Passing `targetAddressSpace: 'loopback'` to `fetch` changed nothing. With the permission granted, all calls returned 200. No mixed content error in any case.
- WebKit 27.2 (Playwright build, macOS): every call was blocked as mixed content ("[blocked] The page at https://localhost:8443/ requested insecure content from http://localhost:11598/v1/models"), even with the page itself on `https://localhost`.
- Page on `http://localhost` (the local run), Chrome 157 and WebKit 27.2: every call returned 200 with no prompt.
- Firefox was not tested: no Firefox build was available on the test machine. The Firefox row comes from Mozilla's documentation.

Re-run the spike with `node packages/e2e/spikes/local-network-access.mjs <chromium|webkit|firefox> [--grant] [--http-page]` (from `packages/e2e`).

## Embeddings for agreement scores

Agreement scores need an embedding model. With Ollama the recommended one is `nomic-embed-text` (274 MB, 8192 token context, the most pulled embedding model in the Ollama library). Ollama's own embeddings docs also list `embeddinggemma`, `qwen3-embedding` and `all-minilm`.

Ensemble calls embeddings through the OpenAI-compatible endpoint (`POST /v1/embeddings`). How the model is chosen:

- When Ensemble checks a local endpoint (`GET /v1/models`) and the embedding model in the field is missing, it switches to an embedding model the server has (`nomic-embed-text`, then `embeddinggemma`, `qwen3-embedding`, `mxbai-embed-large` and others, then any model with `embed` in its name). It never replaces a model you typed yourself, and never changes hosted endpoints.
- When an endpoint is the only embedding provider (no OpenAI or Google key), the automatic embeddings setting uses it. You can also pick "OpenAI-compatible endpoint" explicitly in settings.
- When Ollama has no embedding model, the endpoint card, the Ollama offer and the agreement card show the exact command: `ollama pull nomic-embed-text`. After pulling, reload the page: on load Ensemble checks again any local endpoint that lacked its embedding model, and any endpoint that could not be reached or was blocked by the browser.

Other servers: LM Studio lists embedding models such as `text-embedding-nomic-embed-text-v1.5` once loaded. llama.cpp serves embeddings only from a server started with `--embeddings`, usually a second `llama-server` on another port added as a second endpoint. OpenRouter's embedding models are not in its `/models` list, so Ensemble does not use them yet; use a local embedding model or an OpenAI or Google key.

## Recommended models for 16 GB of RAM

For a 3-model ensemble, pick models from different families so their mistakes are less correlated:

| Model | Family | Download | Notes |
|---|---|---|---|
| `llama3.2:3b` | Meta Llama | about 2.0 GB | fast, good general answers |
| `qwen3:4b` | Alibaba Qwen | about 2.5 GB | strongest at maths and reasoning of the three; thinks before answering, so it is slower |
| `gemma3:4b` | Google Gemma | about 3.3 GB | good writing, multilingual |
| `nomic-embed-text` | Nomic | 274 MB | embeddings for the agreement score |

Together they need about 9 GB of memory while all three are loaded, which leaves room for the browser and the system on a 16 GB machine. Ollama keeps up to 3 models loaded by default (`OLLAMA_MAX_LOADED_MODELS`). If answers arrive one model at a time, the machine is short of memory; close other apps or swap one model for a smaller one (`qwen3:1.7b`, `gemma3:1b`). With more memory, `qwen3:8b` or `llama3.1:8b` give better answers.

Use one of the three as the summarizer. The consensus step makes one more call (standard and majority methods); ELO and council make many more (the prompt page shows the count before you run).

## Other servers

All of these are presets on the configuration page. Each one can be added more than once.

**LM Studio**. Start the server in the Developer tab, or run `lms server start --cors`. For the hosted site, turn on CORS in the server settings. Base URL `http://localhost:1234/v1`. Load the chat models you want before running, and an embedding model for agreement scores.

**llama.cpp server**. `llama-server -m model.gguf --port 8080` serves one model at `http://localhost:8080/v1`. For three models, run three servers on different ports and add each as an endpoint (the preset can be added several times; edit the base URL). Add `--embeddings` to a server that runs an embedding model.

**vLLM**. `vllm serve Qwen/Qwen3-4B --port 8000` serves at `http://localhost:8000/v1`. vLLM usually needs an NVIDIA GPU and runs one model per server. It allows all origins by default (`--allowed-origins`).

**OpenRouter** (hosted). Create a key at https://openrouter.ai/keys and paste it into the endpoint. Base URL `https://openrouter.ai/api/v1`. Model ids look like `meta-llama/llama-3.1-8b-instruct`. Ensemble prices OpenRouter models from its price table; models ending in `:free` are free but rate limited.

**Groq** (hosted). Create a key at https://console.groq.com/keys. Base URL `https://api.groq.com/openai/v1`. Fast open models such as `llama-3.1-8b-instant`. Groq has no embeddings API, and Ensemble does not know Groq's prices, so the cost shows as unknown for its calls.

**Together** (hosted). Key from https://api.together.ai, base URL `https://api.together.ai/v1`. Prices are not in Ensemble's table either.

Hosted routers need no `OLLAMA_ORIGINS` or permission prompt; they work from the hosted site in every browser.

## Troubleshooting

**"Your browser did not let this site reach a server on your computer."** The hosted site called `localhost` and the browser blocked it, or the server refused the site's origin. A server that does not allow the site's origin (for Ollama, `OLLAMA_ORIGINS` is not set) also ends up here: its 403 carries no CORS headers, so the page never sees it. In Chrome or Firefox, allow local network access in the site settings and set `OLLAMA_ORIGINS`, then reload the configuration page. In Safari, or if that does not help, use `npm run local`.

**"Could not reach the endpoint."** Nothing answered at the base URL. Check that the server runs (`curl http://localhost:11434/api/tags` for Ollama) and that the port in the base URL matches.

**The Ollama offer does not appear.** It only shows on first run: in Free mode, with no endpoint configured, and until you dismiss it. On the hosted site it shows a **Look for Ollama** button instead of looking by itself. You can always click **Ollama** under "OpenAI-compatible endpoints" to add it by hand.

**No agreement score.** No embedding model is available. Run `ollama pull nomic-embed-text`, then open (or reload) the configuration page, which checks the endpoint again.

**Answers time out.** A model that is loading for the first time can take a while; each answer may take up to 120 seconds. Run the ensemble again once the models are loaded, or use smaller models.

**Port 3000 is in use.** `npm run local -- --port 4000`.

**The local run shows an old version.** It rebuilds by itself after a new commit, but not after uncommitted edits. Run `npm run local -- --rebuild`.
