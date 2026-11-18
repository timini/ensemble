---
title: "Ensemble AI: ask several models, see where they agree"
date: 2026-11-18
status: draft, not published
---

<!--
Draft for timini.github.io/devblog. Not published from here.
Before publishing:
- Replace the benchmark section below with the results of the paid matrix run
  (packages/eval/results/<run-id>/summary.json, also shown on /benchmarks).
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

> **Placeholder. Do not publish this section as it stands.**
>
> The benchmark matrix (three open 8B to 12B models from different families, alone and as an ensemble with mechanical majority and standard consensus, plus one premium model as a reference, on GSM8K, MMLU-Pro, GPQA Diamond and TruthfulQA, up to 200 questions each) is being run separately. When it finishes, replace this block with:
>
> - a table of accuracy with 95% Wilson intervals per dataset, for each single model, each ensemble method and the reference model
> - the paired McNemar p-value of each ensemble against the best single model on the same questions
> - the total cost of the run
> - one or two plain sentences on what the numbers do and do not show, following the claims rule above
> - a link to /benchmarks and to the command that reproduces the run
>
> No numbers have been filled in here on purpose.

## How it is built

- Next.js 15 and React 19, with a component library developed in Storybook. English and French throughout.
- Firebase App Hosting on Cloud Run, scaled to zero, so it costs close to nothing when nobody is using it. Firestore holds Pro credits, shared runs (deleted by a TTL policy after 30 days) and synced history. Firebase Auth handles sign-in.
- Stripe Checkout for credit packs, with an append-only credit ledger in integer micro-dollars and idempotent webhooks.
- OpenRouter for Pro model calls, with a hard monthly spend cap on the key, per-user rate limits and a token budget per run.
- A benchmark harness in the same repo, with shuffled multiple-choice options, mechanically scored final answers, and Wilson intervals and McNemar tests in every report.

## Try it

Open https://<your-domain>, pick a way in, and ask something you would normally check twice. If the agreement is low, read the answers.
