---
title: "Ensemble AI: ask several models, see where they agree"
date: 2026-11-18
status: draft, not published
---

<!--
Draft for timini.github.io/devblog. Not published from here.
Before publishing:
- Replace https://<your-domain> with the live domain.
- Add screenshots: the workspace after a run, a shared link, the landing page.
-->

# Ensemble AI: ask several models, see where they agree

When an answer from an AI model matters, a lot of people already check it by hand. They paste the same question into two or three chat apps, read the long answers side by side, and try to work out which one to believe. Ensemble does that in one place, and adds the part that is hard to do by eye: a number for how much the answers agree.

It is live at https://<your-domain>.

## What it does

You write one question and pick two to six models. Ensemble sends the question to all of them at once and streams the answers into columns. When they are in, it does two things.

First, it scores how closely the answers agree. Each answer is turned into an embedding (a vector that represents its meaning), and the score is the average similarity between every pair. High agreement means the models said much the same thing. Low agreement is the useful case: it tells you that at least one model is wrong, or that the question has no single answer, and that you should read the answers before using any of them.

Second, it merges the answers into one consensus answer. There are four ways to do it:

- **Standard**: one model reads all the answers and writes a combined one.
- **Majority**: for short answers (a number, a letter, yes or no) the final answers are counted mechanically and the most common one wins. Longer answers fall back to a model-written majority.
- **ELO**: models compare answers in pairs and the best-ranked ones are merged.
- **Council**: models critique each other's answers before the merge.

Before you run, the composer shows how many model calls the method will make and what that is likely to cost. Council with five models is 56 extra calls, and you should know that before you press Ask.

## Three ways to run it

- **Your own keys.** Add a key for OpenAI, Anthropic, Google, xAI, DeepSeek or Perplexity, or one OpenRouter key for all of them. Keys are encrypted in your browser and the models are called straight from your browser. They never reach our server.
- **Local models.** Point it at Ollama, LM Studio, llama.cpp or vLLM, or any server that speaks the OpenAI API. With Ollama running it is detected on first visit. Nothing leaves your machine, and it costs nothing.
- **Pro.** Sign in with Google or an email link, buy credits with Stripe (packs from $5), and run any priced model with no keys at all. Calls go through OpenRouter from our server and each run is charged at model cost plus a margin. The account page shows your balance, purchases, usage by model and every run.

## Sharing and history

Every run is saved in your browser, with search, and you can reopen one later without calling a model again. Signed in, your history and saved model sets follow you to other devices.

Signed in, you can also share a run. The link opens a read-only page with the question, every answer, the agreement score and the consensus, for anyone, without an account. Links expire after 30 days, and you can delete one sooner. API keys are never part of a shared run.

## What we can and cannot claim

Ensemble shows you where models agree and where they do not. It does not promise a better answer than the best single model, because we have not shown that yet.

What we have seen is that models from different providers often get different questions right. In an early study, at least one member of the ensemble had the right answer on 97.5 to 100% of maths questions where the best single model scored 85 to 95%. That says the disagreement carries information. It does not say the consensus beats the best model, and the samples were small (8 to 40 questions per dataset).

## Benchmark results

We ran three open models from different families, Qwen3.5 9B, Llama 3.1 8B Instruct and Gemma 3 12B, each alone and together as an ensemble, on four public benchmarks: GSM8K (maths word problems), MMLU-Pro (multiple choice across subjects), GPQA Diamond (graduate-level science) and TruthfulQA (MC1). Each dataset had 200 questions, except GPQA Diamond, which has only 198, so its numbers are indicative. Multiple-choice options were shuffled with a fixed seed, every model gave a structured final answer, and answers were scored mechanically with no LLM judge. A call that failed or timed out counts as wrong. The ensemble combined the same three answers in two ways: a mechanical majority vote, and a standard consensus written by Qwen3.5 9B.

Accuracy in percent with 95% Wilson intervals. The p-value is a paired McNemar test of each ensemble against the best single model on the same questions (exact binomial below 25 discordant pairs).

| Dataset | Best single model | Majority vote | p | Standard consensus | p |
| --- | --- | --- | --- | --- | --- |
| GSM8K | Gemma 3 12B: 93.0 [88.6, 95.8] | 95.5 [91.7, 97.6] | 0.063 | 95.5 [91.7, 97.6] | 0.125 |
| MMLU-Pro | Qwen3.5 9B: 77.0 [70.7, 82.3] | 74.5 [68.0, 80.0] | 0.227 | 78.5 [72.3, 83.6] | 0.453 |
| GPQA (198) | Qwen3.5 9B: 68.2 [61.4, 74.3] | 59.6 [52.6, 66.2] | 0.003 | 61.1 [54.2, 67.6] | 0.040 |
| TruthfulQA | Qwen3.5 9B: 81.5 [75.5, 86.3] | 76.5 [70.2, 81.8] | 0.052 | 81.5 [75.5, 86.3] | 1.000 |

The weaker members were well behind on MMLU-Pro, GPQA and TruthfulQA, where Gemma 3 12B scored 62.0, 36.4 and 68.0 and Llama 3.1 8B 49.5, 23.7 and 59.5. On GSM8K the gap was smaller: Qwen3.5 9B scored 87.5 and Llama 3.1 8B 82.0, against 93.0. Llama had the most failed or timed-out calls, 44 of 198 on GPQA. Qwen3.5 9B, the best member there, had 11. The standard consensus call failed on 33 of 198 GPQA questions and 4 of 200 MMLU-Pro questions, and those count as wrong.

What this shows: the ensemble did not beat its best member with statistical significance on any dataset. On GSM8K both methods scored higher than Gemma 3 12B, but with p = 0.063 and 0.125 that could be chance. On MMLU-Pro the majority vote scored 2.5 points lower and the standard consensus 1.5 points higher than Qwen3.5 9B; on TruthfulQA the majority vote scored 5 points lower and the standard consensus the same. None of those differences is significant. On GPQA both methods scored lower than Qwen3.5 9B alone (p = 0.003 and 0.040), on a sample just under the 200 questions we ask for. For the majority vote, every one of its 23 losses there was a question where the two weaker models agreed on the same wrong answer and outvoted Qwen. For the standard consensus, most of the gap comes from the 33 failed calls: on the 165 GPQA questions where the consensus call returned, it scored 121 (73.3%), against 111 (67.3%) for Qwen3.5 9B on the same questions. That subset was not planned in advance, so read it as a hint, not a result. This is one run with one set of models; it says nothing yet about ensembles of stronger or more evenly matched models.

Cost in model calls over all four datasets: $0.46 for Qwen3.5 9B alone, $0.53 for the majority vote ensemble and $1.35 for the standard consensus ensemble. A comparison with a premium model will be added.

The numbers, the method and the command that reproduces them are on [/benchmarks](https://<your-domain>/benchmarks) and in [packages/eval/docs/BENCHMARKS.md](https://github.com/timini/ensemble/blob/main/packages/eval/docs/BENCHMARKS.md).

## How it is built

- Next.js 15 and React 19, with a component library developed in Storybook. English and French throughout.
- Firebase App Hosting on Cloud Run, scaled to zero, so it costs close to nothing when nobody is using it. Firestore holds Pro credits, shared runs (deleted by a TTL policy after 30 days) and synced history. Firebase Auth handles sign-in.
- Stripe Checkout for credit packs, with an append-only credit ledger in integer micro-dollars and idempotent webhooks.
- OpenRouter for Pro model calls, with a hard monthly spend cap on the key, per-user rate limits and a token budget per run.
- A benchmark harness in the same repo, with shuffled multiple-choice options, mechanically scored final answers, and Wilson intervals and McNemar tests in every report.

## Try it

Open https://<your-domain>, pick a way in, and ask something you would normally check twice. If the agreement is low, read the answers.
