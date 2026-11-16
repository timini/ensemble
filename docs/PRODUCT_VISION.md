# Ensemble AI: Product Vision

Last updated: 2026-11-15.

## One line

Ask several AI models the same question at once, see where they agree and where they don't, and get one answer you can check.

## The problem

People who rely on AI for answers that matter already cross-check. They paste the same question into ChatGPT, Claude and Gemini, read three long answers, and try to work out which one to trust. It is slow, it is manual, and the useful signal (do the models agree?) is never measured.

A single model gives no warning when it is wrong. It sounds the same whether it is right or guessing.

## What Ensemble does

1. You write one prompt.
2. Ensemble sends it to the models you picked (2 to 6), in parallel, and streams every answer side by side.
3. It measures how much the answers agree, pair by pair, and shows a single agreement score.
4. It combines the answers into one consensus answer, using the method you choose.
5. You can save the run, come back to it, and share it with a link.

The agreement score is the core of the product. High agreement means the answer is probably safe to use. Low agreement means stop and read the individual answers, because no single answer should be trusted on that question.

## Who it is for

| User | What they want | How they use Ensemble |
|---|---|---|
| Cross-checkers | Confidence before acting on an AI answer (research, engineering, health and legal reading, purchases) | Free mode with their own keys, or Pro with credits |
| Local model users | Privacy and zero cost, running models on their own machine | Free mode pointed at Ollama, LM Studio, llama.cpp or vLLM |
| Model tinkerers | Compare models and methods on their own questions | Presets, all four consensus methods, manual responses, cost per run |

We are not building a general chat app. Ensemble is a tool for asking a question where being wrong costs something.

## Modes

| Mode | Who pays for model calls | Sign-in | Where keys live | Status |
|---|---|---|---|---|
| Free | The user, through their own provider keys, or nobody when using local models | Not needed | Encrypted in the browser (AES-GCM via Web Crypto). Never sent to our server. | Works for 6 cloud providers. Local models not built yet. |
| Pro | The user, through prepaid credits bought with Stripe | Firebase Auth (Google, email link) | Our server, in Secret Manager | Not built yet. Server pieces exist but are not connected. |
| Mock | Nobody | Not needed | None | Developer and CI only. Never shown to users. |

## What we promise, and what we don't

We can honestly say today:

- You see every model's answer side by side, streamed.
- Your keys stay in your browser in Free mode.
- Models from different providers often get different questions right. In our tests at least one member of the ensemble had the right answer on 97.5 to 100% of maths questions where the best single model scored 85 to 95%.

We cannot yet say:

- "Ensembles give better answers than the best single model." Our results so far are mixed and not statistically significant (n of 8 to 40 per dataset). See `report/report.pdf` and the benchmark plan in [ROADMAP.md](./ROADMAP.md).

Until the benchmarks in the roadmap say otherwise, the product leads with **agreement and comparison**, not with "more accurate answers". Marketing copy on the landing, `/features` and `/about` pages must follow this rule.

## Product principles

1. **First answer fast.** A new visitor should see a real result within a minute, with one decision at most before it (which keys or which mode). No four-page wizard before the first answer.
2. **Show the cost before you spend it.** Every run shows the number of model calls and an estimated cost before you submit. Council with 5 models is 56 extra calls; the user should know that.
3. **Honest agreement.** The agreement score must come from real semantic embeddings. A score from fake vectors is worse than no score.
4. **Private by default.** Free mode never sends keys or prompts to our server. Local models keep everything on the user's machine.
5. **Cheap to run.** The hosted product should cost close to nothing when idle. Free mode runs in the browser and uses almost no server time. Pro mode is paid for by credits with a margin.
6. **Finish what exists before adding more.** Every feature already in the codebase gets finished and works end to end before new features start.

## Feature set

Everything below already exists in some form in the codebase and will be finished, not cut.

| Feature | Today | Target |
|---|---|---|
| Multi-model streaming (OpenAI, Anthropic, Google, xAI, DeepSeek, Perplexity) | Works in Free mode | Works in Free and Pro. Model lists current. |
| Local and open models (Ollama, LM Studio, llama.cpp, vLLM, OpenRouter, Groq, Together) | Missing | One OpenAI-compatible provider with a configurable base URL |
| Agreement analysis | Real embeddings from OpenAI or Google; no score shown without one of those keys | Real embeddings, including a local embedding option |
| Consensus: standard, majority, elo, council | Built as packages and wired into the app | Kept, with a call count and cost estimate shown before running. Majority gets a mechanical vote for short answers. |
| Ensemble presets | Built (save, load, delete in localStorage) | Kept, defaults updated to current models, synced for Pro users |
| Manual responses (paste an answer from another tool) | Built | Kept |
| Share results | Button exists, does nothing | Public link with a 30-day expiry |
| History | Missing, results are wiped on each visit to `/review` | Local history in Free mode, synced history in Pro |
| Pro mode with credits | Server stubs only | Sign-in, Stripe credit purchase, server streaming, usage dashboard |
| i18n (English, French) | Built | Kept for every new screen |
| Dark mode | Built | Kept |
| Benchmark harness (`packages/eval`) | Built, expensive, results not reproducible | Runs on cheap open models, honest statistics, results published |

## How we know it is working

| Signal | Target for launch |
|---|---|
| Time from landing to first streamed answer (new visitor, Free mode with one key) | Under 60 seconds |
| Hosted cost per month with no traffic | Under $5 |
| Share of runs that use real (not mock) agreement scores | 100% |
| Benchmark: published, reproducible comparison of ensembles against best single model, n of at least 200 per dataset, with confidence intervals | Done before any accuracy claim appears in copy |
| Pro: a user can sign in, buy credits and run an ensemble without any provider key | Works end to end in production with Stripe live mode |

## Related documents

- [ROADMAP.md](./ROADMAP.md): the plan to get there, in milestones.
- [ARCHITECTURE.md](./ARCHITECTURE.md): how the system works today and the target design.
- `report/report.pdf`: the February 2026 benchmark study and its limits.
